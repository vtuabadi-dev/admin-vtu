import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { isValidTransition } from "@/shared/lib/registration-state-machine";
import { registrationRepo, auditRepo, notificationRepo } from "@/server/repositories";
import type { RegistrationRequest } from "@/shared/types";
import type { Prisma } from "@prisma/client";

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

async function generateRegistrationId(kodeRegistrasi: string, index: number): Promise<string> {
  return `${kodeRegistrasi}-${index + 1}`;
}

async function generateNomorPeserta(kodeRegistrasi: string, index: number): Promise<string> {
  // Remove GRP- prefix: GRP-2026-00001-1 → PS/2026/00001/1
  const parts = kodeRegistrasi.split("-");
  const year = parts[1] ?? new Date().getFullYear().toString();
  const seq = parts[2] ?? "00001";
  return `PS/${year}/${seq}/${index + 1}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "approve");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const reg = await registrationRepo.findById(params.id) as RegistrationRequest | null;
  if (!reg) return NextResponse.json({ success: false, message: "Registrasi tidak ditemukan" }, { status: 404 });

  // Validate state transition using state machine
  // The approve route transitions PENDING_REVIEW → APPROVED (then transaction handles APPROVED → ACCOUNT_CREATED)
  if (!isValidTransition(reg.status, "APPROVED")) {
    return NextResponse.json({
      success: false,
      message: `Registrasi tidak dapat disetujui dari status ${reg.status}`,
    }, { status: 400 });
  }

  const { prisma } = await import("@/server/db/client");
  const bcrypt = await import("bcryptjs");

  try {
    // Use a transaction to create all records atomically
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create Jamaah records first (need IDs for group creation)
      const jamaahRecords = [];
      for (let i = 0; i < reg.members.length; i++) {
        const member = reg.members[i]!;
        const registrationId = await generateRegistrationId(reg.kodeRegistrasi, i);
        const nomorPeserta = await generateNomorPeserta(reg.kodeRegistrasi, i);

        const jamaah = await tx.jamaah.create({
          data: {
            registrationId,
            groupId: "", // placeholder — updated after group creation
            nomorPeserta,
            namaLengkap: member.namaLengkap,
            namaAyah: "",
            jenisKelamin: member.jenisKelamin as any,
            tempatLahir: "-",
            tanggalLahir: new Date("2000-01-01"),
            nik: "",
            nomorPaspor: "",
            masaBerlakuPaspor: new Date("2030-01-01"),
            nomorTelepon: reg.nomorTelepon,
            email: reg.emailPerwakilan,
            alamat: "-",
            provinsi: "-",
            kota: "-",
            kecamatan: "-",
            kelurahan: "-",
            status: "registered",
            hotelMekkah: "",
            hotelMadinah: "",
            syaratDisetujui: reg.termsAccepted,
          },
        });
        jamaahRecords.push(jamaah);
      }

      // 2. Create RegistrationGroup
      const ketua = jamaahRecords[0]!;
      const namaGroup = `GRUP ${reg.namaPerwakilan}`;
      const paket = await tx.keberangkatan.findUniqueOrThrow({ where: { id: reg.paketId } });
      const totalTagihan = paket.hargaPaket * reg.paxCount;

      const group = await tx.registrationGroup.create({
        data: {
          kodeRegistrasi: reg.kodeRegistrasi,
          namaGroup,
          ketuaGroupId: ketua.id,
          paketKeberangkatanId: reg.paketId,
          jumlahAnggota: reg.paxCount,
          totalTagihan,
          totalPembayaran: 0,
          sisaPembayaran: totalTagihan,
          status: "active",
        },
      });

      // 3. Update Jamaah records with groupId (userId will be set after user creation)
      for (const j of jamaahRecords) {
        await tx.jamaah.update({ where: { id: j.id }, data: { groupId: group.id } });
      }

      // 4. Create User accounts with temp passwords
      const tempPasswords: { namaLengkap: string; username: string; tempPassword: string; jamaahId: string }[] = [];
      const userIds: string[] = [];
      for (let i = 0; i < jamaahRecords.length; i++) {
        const member = reg.members[i]!;
        const jamaah = jamaahRecords[i]!;
        const tempPassword = generateTempPassword();
        const username = `${member.namaLengkap.replace(/\s+/g, ".").toLowerCase()}.${reg.kodeRegistrasi.toLowerCase()}`;
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const user = await tx.user.create({
          data: {
            name: member.namaLengkap,
            email: `${username}@jamaah.vtu.id`,
            passwordHash,
            role: "jamaah",
            mustChangePassword: true,
          },
        });

        // Link User → Jamaah
        await tx.jamaah.update({
          where: { id: jamaah.id },
          data: { userId: user.id },
        });

        userIds.push(user.id);
        tempPasswords.push({
          namaLengkap: member.namaLengkap,
          username,
          tempPassword,
          jamaahId: jamaah.id,
        });
      }

      // 5. Update RegistrationRequest status
      await tx.registrationRequest.update({
        where: { id: reg.id },
        data: {
          status: "ACCOUNT_CREATED",
          reviewedBy: session.user?.id ?? null,
          reviewedAt: new Date(),
          groupId: group.id,
        },
      });

      // 6. Create initial DP invoice
      const dpAmount = Math.round(totalTagihan * 0.3);
      const invoiceSeq = await tx.invoice.count();
      const nomorInvoice = `INV/${new Date().getFullYear()}/${(invoiceSeq + 1).toString().padStart(5, "0")}`;
      await tx.invoice.create({
        data: {
          nomorInvoice,
          groupId: group.id,
          tipe: "dp",
          jumlah: dpAmount,
          sisaTagihan: dpAmount,
          status: "unpaid",
          jatuhTempo: new Date(Date.now() + 14 * 86400000), // 14 days
        },
      });

      // 7. Update package quota
      await tx.keberangkatan.update({
        where: { id: reg.paketId },
        data: { terisi: { increment: reg.paxCount } },
      });

      return { group, jamaahRecords, tempPasswords, nomorInvoice };
    });

    // Create audit entry
    try {
      await auditRepo.create({
        userId: session.user.id ?? "system",
        userName: session.user.name ?? "Unknown",
        role: "super_admin",
        module: "jamaah",
        action: "registration.approve",
        detail: `Registrasi ${reg.kodeRegistrasi} disetujui — ${reg.paxCount} jamaah, group ${result.group.id}`,
        entityId: reg.id,
        entityType: "RegistrationRequest",
      });
    } catch {
      // Non-critical
    }

    // Notify representative (simulated — would send email/WhatsApp)
    try {
      const jamaahUsers = await prisma.user.findMany({
        where: { email: { contains: reg.kodeRegistrasi.toLowerCase() } },
      });
      for (const u of jamaahUsers) {
        const tp = result.tempPasswords.find((t: { namaLengkap: string; username: string }) =>
          u.name?.toUpperCase().includes(t.namaLengkap) || u.email.includes(t.username),
        );
        await notificationRepo.create({
          userId: u.id,
          type: "success",
          category: "sistem",
          title: "Registrasi Disetujui",
          message: `Registrasi ${reg.kodeRegistrasi} telah disetujui. Username: ${tp?.username ?? u.email}. Silakan login dan ubah password Anda.`,
          link: "/login",
        });
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      data: {
        kodeRegistrasi: reg.kodeRegistrasi,
        status: "ACCOUNT_CREATED",
        groupId: result.group.id,
        jamaahCount: result.jamaahRecords.length,
        accounts: result.tempPasswords.map((tp: { namaLengkap: string; username: string; tempPassword: string }) => ({
          namaLengkap: tp.namaLengkap,
          username: tp.username,
          tempPassword: tp.tempPassword,
        })),
        nomorInvoice: result.nomorInvoice,
        message: "Registrasi disetujui, akun jamaah telah dibuat",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
