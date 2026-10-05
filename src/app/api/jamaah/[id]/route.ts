import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { jamaahRepo } from "@/server/repositories";
import { prisma } from "@/server/db/client";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const jamaah = await jamaahRepo.findById(params.id);
    if (!jamaah) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: jamaah });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const body = await request.json();
    const jamaah = await jamaahRepo.update(params.id, body);
    return NextResponse.json({ success: true, data: jamaah });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "soft";

  try {
    let jamaah = await prisma.jamaah.findUnique({
      where: { id: params.id },
      include: { group: true },
    });

    // Fallback check if ID belongs to RegistrationMember
    if (!jamaah) {
      const member = await prisma.registrationMember.findUnique({
        where: { id: params.id },
      });
      if (member) {
        await prisma.registrationMember.delete({ where: { id: member.id } });
        return NextResponse.json({ success: true, message: "Pendaftar berhasil dihapus" });
      }
      return NextResponse.json({ success: false, message: "Data jamaah tidak ditemukan" }, { status: 404 });
    }

    const wasActive = jamaah.status !== "batal";
    const paketId = jamaah.group?.paketKeberangkatanId;

    // ADR-0022: Cek apakah jamaah yang dihapus adalah PIC / Ketua Rombongan
    const isPIC = Boolean(
      (jamaah.group && jamaah.group.ketuaGroupId === jamaah.id) ||
      jamaah.nomorPeserta?.endsWith("/1") ||
      jamaah.registrationId?.endsWith("-1")
    );

    if (mode === "hard") {
      await prisma.$transaction(async (tx) => {
        if (isPIC && jamaah.groupId) {
          // ============================================================
          // KONDISI A: Hapus PIC -> Cascade Delete Seluruh Rombongan & Anggota
          // ============================================================
          const allMembers = await tx.jamaah.findMany({
            where: { groupId: jamaah.groupId },
            select: { id: true, namaLengkap: true, status: true },
          });
          const allMemberIds = allMembers.map((m) => m.id);
          const activeMembersCount = allMembers.filter((m) => m.status !== "batal").length;

          // 1. Hapus child references untuk SEMUA anggota rombongan
          if (allMemberIds.length > 0) {
            await Promise.all([
              tx.dokumenItem.deleteMany({ where: { jamaahId: { in: allMemberIds } } }).catch(() => {}),
              tx.manifestRow.deleteMany({ where: { jamaahId: { in: allMemberIds } } }).catch(() => {}),
              tx.penghuniKamar.deleteMany({ where: { jamaahId: { in: allMemberIds } } }).catch(() => {}),
              tx.alokasiPembayaran.deleteMany({ where: { jamaahId: { in: allMemberIds } } }).catch(() => {}),
              tx.pengambilanPerlengkapanItem.deleteMany({ where: { jamaahId: { in: allMemberIds } } }).catch(() => {}),
            ]);
          }

          // 2. Hapus request pendaftaran awal & member
          if (jamaah.group?.kodeRegistrasi) {
            const regReq = await tx.registrationRequest.findUnique({
              where: { kodeRegistrasi: jamaah.group.kodeRegistrasi },
              select: { id: true },
            });
            if (regReq) {
              await tx.registrationMember.deleteMany({ where: { requestId: regReq.id } }).catch(() => {});
              await tx.registrationRequest.delete({ where: { id: regReq.id } }).catch(() => {});
            }
          }

          for (const m of allMembers) {
            if (m.namaLengkap) {
              await tx.registrationMember.deleteMany({ where: { namaLengkap: m.namaLengkap } }).catch(() => {});
            }
          }

          // 3. Hapus seluruh data invoice, pembayaran, dan reminder rombongan
          await Promise.all([
            tx.invoiceItem.deleteMany({ where: { invoice: { groupId: jamaah.groupId } } }).catch(() => {}),
            tx.invoice.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
            tx.pembayaran.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
            tx.invoiceSplitConfig.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
            tx.reminder.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
          ]);

          // 4. Hapus entitas grup pendaftaran
          await tx.$executeRawUnsafe(
            `DELETE FROM "registration_groups" WHERE "id" = '${jamaah.groupId.replace(/'/g, "''")}'`
          );

          // 5. Hapus seluruh anggota dari tabel jamaah
          if (allMemberIds.length > 0) {
            const memberIn = allMemberIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
            await tx.$executeRawUnsafe(
              `DELETE FROM "jamaah" WHERE "id" IN (${memberIn})`
            );
          }

          // 6. Kurangi kuota paket terisi sejumlah total anggota aktif yang terhapus
          if (activeMembersCount > 0 && paketId) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
            if (kbr && kbr.terisi > 0) {
              await tx.keberangkatan.update({
                where: { id: paketId },
                data: { terisi: Math.max(0, kbr.terisi - activeMembersCount) },
              });
            }
          }
        } else {
          // ============================================================
          // KONDISI B: Hapus Anggota Biasa (Bukan PIC)
          // ============================================================
          // 1. Hapus child references jamaah ini saja
          await Promise.all([
            tx.dokumenItem.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {}),
            tx.manifestRow.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {}),
            tx.penghuniKamar.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {}),
            tx.alokasiPembayaran.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {}),
            tx.pengambilanPerlengkapanItem.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {}),
          ]);

          if (jamaah.namaLengkap) {
            await tx.registrationMember.deleteMany({ where: { namaLengkap: jamaah.namaLengkap } }).catch(() => {});
          }

          // 2. Hapus jamaah ini dari database
          await tx.$executeRawUnsafe(
            `DELETE FROM "jamaah" WHERE "id" = '${jamaah.id.replace(/'/g, "''")}'`
          );

          // 3. Periksa anggota tersisa di grup
          if (jamaah.groupId) {
            const remainingMembers = await tx.jamaah.findMany({
              where: { groupId: jamaah.groupId },
              select: { id: true },
            });

            if (remainingMembers.length > 0) {
              // Masih ada anggota lain: cukup update jumlahAnggota grup
              await tx.registrationGroup.update({
                where: { id: jamaah.groupId },
                data: { jumlahAnggota: remainingMembers.length },
              });
            } else {
              // Jika ini anggota terakhir yang tersisa di grup: bersihkan grup kosong
              if (jamaah.group?.kodeRegistrasi) {
                const regReq = await tx.registrationRequest.findUnique({
                  where: { kodeRegistrasi: jamaah.group.kodeRegistrasi },
                  select: { id: true },
                });
                if (regReq) {
                  await tx.registrationMember.deleteMany({ where: { requestId: regReq.id } }).catch(() => {});
                  await tx.registrationRequest.delete({ where: { id: regReq.id } }).catch(() => {});
                }
              }

              await Promise.all([
                tx.invoiceItem.deleteMany({ where: { invoice: { groupId: jamaah.groupId } } }).catch(() => {}),
                tx.invoice.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
                tx.pembayaran.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
                tx.invoiceSplitConfig.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
                tx.reminder.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {}),
              ]);

              await tx.$executeRawUnsafe(
                `DELETE FROM "registration_groups" WHERE "id" = '${jamaah.groupId.replace(/'/g, "''")}'`
              );
            }
          }

          // 4. Kurangi kuota paket keberangkatan sebanyak 1
          if (wasActive && paketId) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
            if (kbr && kbr.terisi > 0) {
              await tx.keberangkatan.update({
                where: { id: paketId },
                data: { terisi: Math.max(0, kbr.terisi - 1) },
              });
            }
          }
        }
      }, {
        timeout: 30000,
        maxWait: 10000,
      });

      return NextResponse.json({
        success: true,
        message: isPIC && jamaah.groupId
          ? "Rombongan dan seluruh anggota berhasil dihapus permanen"
          : "Jamaah berhasil dihapus permanen",
      });
    } else {
      // Soft delete (batal)
      await prisma.$transaction(async (tx) => {
        if (isPIC && jamaah.groupId) {
          const activeMembers = await tx.jamaah.findMany({
            where: { groupId: jamaah.groupId, status: { not: "batal" } },
            select: { id: true },
          });

          await tx.jamaah.updateMany({
            where: { groupId: jamaah.groupId },
            data: { status: "batal" },
          });

          if (activeMembers.length > 0 && paketId) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
            if (kbr && kbr.terisi > 0) {
              await tx.keberangkatan.update({
                where: { id: paketId },
                data: { terisi: Math.max(0, kbr.terisi - activeMembers.length) },
              });
            }
          }
        } else {
          await tx.jamaah.update({
            where: { id: jamaah.id },
            data: { status: "batal" },
          });

          if (wasActive && paketId) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
            if (kbr && kbr.terisi > 0) {
              await tx.keberangkatan.update({
                where: { id: paketId },
                data: { terisi: Math.max(0, kbr.terisi - 1) },
              });
            }
          }
        }
      }, {
        timeout: 30000,
        maxWait: 10000,
      });

      return NextResponse.json({
        success: true,
        message: isPIC && jamaah.groupId
          ? "Rombongan dan seluruh anggota berhasil dibatalkan (soft delete)"
          : "Jamaah berhasil dibatalkan (soft delete)",
      });
    }
  } catch (error) {
    console.error("[DELETE /api/jamaah/[id]] Error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
