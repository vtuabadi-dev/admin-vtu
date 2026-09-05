import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import type { JenisKelamin, StatusJamaah } from "@prisma/client";

export interface ExcelImportRowInput {
  rombongan?: string;
  noJamaah?: number | string;
  idRegister?: string;
  noId?: string;
  jenisIdentitas?: string;
  nama?: string;
  noPaspor?: string;
  tglDikeluarkan?: string;
  tglHabis?: string;
  kotaPaspor?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
  kamar?: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  umur?: string;
  statusMenikah?: string;
  noTelp?: string;
  kota?: string;
  provinsi?: string;
  alamat?: string;
}

function parseDateInput(input?: string): Date {
  if (!input) return new Date("1990-01-01");
  const partsDdMm = input.split("/");
  if (partsDdMm.length === 3) {
    const day = parseInt(partsDdMm[0]!, 10);
    const month = parseInt(partsDdMm[1]!, 10) - 1;
    const year = parseInt(partsDdMm[2]!, 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(Date.UTC(year, month, day));
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date("1990-01-01") : d;
}

function cleanGroupTitle(groupKey: string, count: number): string {
  if (groupKey.startsWith("GRP-IMPORT")) {
    return `Rombongan ${count} Pax`;
  }
  return groupKey;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { keberangkatanId, rows } = body as { keberangkatanId: string; rows: ExcelImportRowInput[] };

    if (!keberangkatanId || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "KeberangkatanId dan data jamaah (rows) wajib diisi" },
        { status: 400 }
      );
    }

    const keberangkatan = await prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
    });

    if (!keberangkatan) {
      return NextResponse.json(
        { success: false, message: "Paket Keberangkatan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Group rows by `rombongan` or base `idRegister`
    const groupMap = new Map<string, ExcelImportRowInput[]>();
    rows.forEach((row, idx) => {
      const cleanRombongan = (row.rombongan || "").trim();
      const cleanIdReg = (row.idRegister || "").replace(/-\d+$/, "").trim();
      const groupKey = cleanRombongan || cleanIdReg || `GRP-IMPORT-${Date.now()}-${idx}`;

      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(row);
    });

    let totalJamaahImported = 0;
    let totalGroupImported = 0;

    const groupEntries = Array.from(groupMap.entries());

    // Query highest current sequence for GRP-YYYY-NNNN
    const year = new Date().getFullYear();
    const [latestReq, latestGroup] = await Promise.all([
      prisma.registrationRequest.findFirst({
        where: { kodeRegistrasi: { startsWith: `GRP-${year}-` } },
        orderBy: { kodeRegistrasi: "desc" },
        select: { kodeRegistrasi: true },
      }),
      prisma.registrationGroup.findFirst({
        where: { kodeRegistrasi: { startsWith: `GRP-${year}-` } },
        orderBy: { kodeRegistrasi: "desc" },
        select: { kodeRegistrasi: true },
      }),
    ]);

    let maxSeq = 0;
    for (const item of [latestReq, latestGroup]) {
      if (item?.kodeRegistrasi) {
        const parts = item.kodeRegistrasi.split("-");
        const num = parseInt(parts[2] || "0", 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }

    // Process each group inside transaction
    await prisma.$transaction(async (tx) => {
      for (const [groupKey, members] of groupEntries) {
        totalGroupImported++;
        const nextSeq = maxSeq + totalGroupImported;
        const seqStr = nextSeq.toString().padStart(4, "0");
        const kodeRegistrasi = `GRP-${year}-${seqStr}`;
        const firstMember = members[0]!;

        const jkLeader: JenisKelamin = (firstMember.jenisKelamin?.toUpperCase() === "P" || firstMember.jenisKelamin?.toUpperCase() === "PEREMPUAN") ? "P" : "L";
        const hasPaspor = firstMember.jenisIdentitas?.toUpperCase() === "PASPOR" || Boolean(firstMember.noId && firstMember.noId.length < 12);
        const registeredStatus: StatusJamaah = "registered";

        // 1. Create RegistrationGroup with temporary ketuaGroupId
        const group = await tx.registrationGroup.create({
          data: {
            kodeRegistrasi,
            namaGroup: cleanGroupTitle(groupKey, members.length),
            paketKeberangkatanId: keberangkatanId,
            ketuaGroupId: `TEMP-LEADER-${seqStr}`,
            jumlahAnggota: members.length,
            totalTagihan: members.length * 35000000,
            sisaPembayaran: members.length * 35000000,
            status: "active",
          },
        });

        // 2. Create leader Jamaah
        const leaderPasporNo = firstMember.noPaspor || (hasPaspor ? (firstMember.noId || "-") : "-");
        const leaderPasporExpiry = firstMember.tglHabis ? parseDateInput(firstMember.tglHabis) : new Date("2030-12-31");

        const leaderJamaah = await tx.jamaah.create({
          data: {
            registrationId: `${kodeRegistrasi}-1`,
            groupId: group.id,
            nomorPeserta: `PST-${seqStr}-1`,
            namaLengkap: (firstMember.nama || "KETUA ROMBONGAN").toUpperCase(),
            namaAyah: "-",
            jenisKelamin: jkLeader,
            tempatLahir: firstMember.tempatLahir || "JAKARTA",
            tanggalLahir: parseDateInput(firstMember.tanggalLahir),
            nik: hasPaspor ? "-" : (firstMember.noId || "-"),
            nomorPaspor: leaderPasporNo,
            masaBerlakuPaspor: leaderPasporExpiry,
            nomorTelepon: firstMember.noTelp || "-",
            email: `pst-${seqStr}-1@jamaah.vtu.id`,
            alamat: firstMember.alamat || "-",
            provinsi: firstMember.provinsi || "DKI JAKARTA",
            kota: firstMember.kota || "JAKARTA",
            kecamatan: "-",
            kelurahan: "-",
            status: registeredStatus,
            hotelMekkah: firstMember.hotelMekkah || keberangkatan.hotelMekkah || "Safwah Tower",
            hotelMadinah: firstMember.hotelMadinah || keberangkatan.hotelMadinah || "Durrat Al Eiman",
            dokumen: {
              create: {
                jenis: "paspor",
                wajib: false,
                status: "verified",
                manualData: {
                  nomorPaspor: leaderPasporNo,
                  tanggalDikeluarkan: firstMember.tglDikeluarkan || "-",
                  tanggalHabis: firstMember.tglHabis || "-",
                  kotaPaspor: firstMember.kotaPaspor || "-",
                },
              },
            },
          },
        });

        // 3. Update group's ketuaGroupId to leaderJamaah.id
        await tx.registrationGroup.update({
          where: { id: group.id },
          data: { ketuaGroupId: leaderJamaah.id },
        });

        totalJamaahImported++;

        // 4. Create remaining members in group
        for (let i = 1; i < members.length; i++) {
          const m = members[i]!;
          totalJamaahImported++;
          const mSeq = i + 1;
          const memberNoPeserta = `PST-${seqStr}-${mSeq}`;
          const memberRegistrationId = `${kodeRegistrasi}-${mSeq}`;
          const mJk: JenisKelamin = (m.jenisKelamin?.toUpperCase() === "P" || m.jenisKelamin?.toUpperCase() === "PEREMPUAN") ? "P" : "L";
          const mHasPaspor = m.jenisIdentitas?.toUpperCase() === "PASPOR" || Boolean(m.noId && m.noId.length < 12);
          const mPasporNo = m.noPaspor || (mHasPaspor ? (m.noId || "-") : "-");
          const mPasporExpiry = m.tglHabis ? parseDateInput(m.tglHabis) : new Date("2030-12-31");

          await tx.jamaah.create({
            data: {
              registrationId: memberRegistrationId,
              groupId: group.id,
              nomorPeserta: memberNoPeserta,
              namaLengkap: (m.nama || `ANGGOTA ${mSeq}`).toUpperCase(),
              namaAyah: "-",
              jenisKelamin: mJk,
              tempatLahir: m.tempatLahir || "JAKARTA",
              tanggalLahir: parseDateInput(m.tanggalLahir),
              nik: mHasPaspor ? "-" : (m.noId || "-"),
              nomorPaspor: mPasporNo,
              masaBerlakuPaspor: mPasporExpiry,
              nomorTelepon: m.noTelp || "-",
              email: `${memberNoPeserta.toLowerCase()}@jamaah.vtu.id`,
              alamat: m.alamat || "-",
              provinsi: m.provinsi || "DKI JAKARTA",
              kota: m.kota || "JAKARTA",
              kecamatan: "-",
              kelurahan: "-",
              status: registeredStatus,
              hotelMekkah: m.hotelMekkah || keberangkatan.hotelMekkah || "Safwah Tower",
              hotelMadinah: m.hotelMadinah || keberangkatan.hotelMadinah || "Durrat Al Eiman",
              dokumen: {
                create: {
                  jenis: "paspor",
                  wajib: false,
                  status: "verified",
                  manualData: {
                    nomorPaspor: mPasporNo,
                    tanggalDikeluarkan: m.tglDikeluarkan || "-",
                    tanggalHabis: m.tglHabis || "-",
                    kotaPaspor: m.kotaPaspor || "-",
                  },
                },
              },
            },
          });
        }
      }

      // Update terisi seat count on Keberangkatan
      await tx.keberangkatan.update({
        where: { id: keberangkatanId },
        data: {
          terisi: { increment: totalJamaahImported },
        },
      });
    }, { maxWait: 20000, timeout: 120000 });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${totalJamaahImported} jamaah dalam ${totalGroupImported} rombongan/grup.`,
      importedJamaahCount: totalJamaahImported,
      importedGroupCount: totalGroupImported,
    });
  } catch (error: any) {
    console.error("[EXCEL IMPORT ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengimpor data Excel" },
      { status: 500 }
    );
  }
}
