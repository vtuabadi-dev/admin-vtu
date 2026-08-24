import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db/client";
import { auditRepo } from "@/server/repositories";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "manifest", "delete");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const manifestId = params.id;
    const rowId = params.rowId;

    // 1. Find the manifest row
    const manifestRow = await prisma.manifestRow.findUnique({
      where: { id: rowId },
      include: { manifest: true },
    });

    if (!manifestRow) {
      return NextResponse.json({ success: false, message: "Baris manifest tidak ditemukan" }, { status: 404 });
    }

    let targetJamaahId = manifestRow.jamaahId;
    let jamaah: any = null;

    if (targetJamaahId) {
      jamaah = await prisma.jamaah.findUnique({
        where: { id: targetJamaahId },
        include: { group: true },
      });
    }

    // Fallback find jamaah by passport or full name if jamaahId was unlinked
    if (!jamaah && manifestRow.nomorPaspor) {
      jamaah = await prisma.jamaah.findFirst({
        where: { nomorPaspor: manifestRow.nomorPaspor },
        include: { group: true },
      });
      if (jamaah) targetJamaahId = jamaah.id;
    }

    await prisma.$transaction(async (tx) => {
      // 2. If Jamaah exists, execute comprehensive purge of all related data
      if (jamaah && targetJamaahId) {
        const wasActive = jamaah.status !== "batal";
        const paketId = jamaah.group?.paketKeberangkatanId;

        // A. Delete document items, manifest rows, room occupancy, and payment allocations
        await tx.dokumenItem.deleteMany({ where: { jamaahId: targetJamaahId } }).catch(() => {});
        await tx.manifestRow.deleteMany({ where: { OR: [{ jamaahId: targetJamaahId }, { id: rowId }] } }).catch(() => {});
        await tx.penghuniKamar.deleteMany({ where: { jamaahId: targetJamaahId } }).catch(() => {});
        await tx.alokasiPembayaran.deleteMany({ where: { jamaahId: targetJamaahId } }).catch(() => {});

        // B. Handle group and related billing/payments
        if (jamaah.groupId && jamaah.group) {
          const otherMembers = await tx.jamaah.findMany({
            where: { groupId: jamaah.groupId, id: { not: targetJamaahId } },
          });

          if (otherMembers.length > 0) {
            // Group still has members -> reassign leader if deleted jamaah was leader
            if (jamaah.group.ketuaGroupId === targetJamaahId && otherMembers[0]) {
              await tx.registrationGroup.update({
                where: { id: jamaah.groupId },
                data: {
                  ketuaGroupId: otherMembers[0].id,
                  jumlahAnggota: otherMembers.length,
                },
              });
            } else {
              await tx.registrationGroup.update({
                where: { id: jamaah.groupId },
                data: { jumlahAnggota: otherMembers.length },
              });
            }
          } else {
            // No other members left in group -> Purge billing, payments, invoices, registrations & group
            if (jamaah.group.kodeRegistrasi) {
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

        // C. Clean up any registration member associated with this person
        if (jamaah.namaLengkap) {
          await tx.registrationMember.deleteMany({ where: { namaLengkap: jamaah.namaLengkap } }).catch(() => {});
        }

        // D. Delete the Jamaah record itself
        await tx.$executeRawUnsafe(
          `DELETE FROM "jamaah" WHERE "id" = '${targetJamaahId.replace(/'/g, "''")}'`
        );

        // E. Decrement package capacity if active
        if (wasActive && paketId) {
          const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
          if (kbr && kbr.terisi > 0) {
            await tx.keberangkatan.update({
              where: { id: paketId },
              data: { terisi: { decrement: 1 } },
            });
          }
        }
      } else {
        // Just delete the unlinked manifest row
        await tx.manifestRow.delete({ where: { id: rowId } });
      }

      // 3. Renumber remaining rows in this manifest
      const remainingRows = await tx.manifestRow.findMany({
        where: { manifestId },
        orderBy: { nomorUrut: "asc" },
      });

      for (let i = 0; i < remainingRows.length; i++) {
        const item = remainingRows[i];
        if (item && item.nomorUrut !== i + 1) {
          await tx.manifestRow.update({
            where: { id: item.id },
            data: { nomorUrut: i + 1 },
          });
        }
      }
    }, {
      timeout: 35000,
      maxWait: 15000,
    });

    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role as any,
        module: "manifest",
        action: "manifest.delete_row",
        detail: `Menghapus jamaah "${manifestRow.namaLengkap}" (${manifestRow.nomorPaspor ?? "Tanpa Paspor"}) dari manifest ${manifestRow.manifest?.kode ?? manifestId} beserta seluruh data terkait (pembayaran, invoice, registrasi, dokumen).`,
        entityId: rowId,
        entityType: "ManifestRow",
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: `Jamaah ${manifestRow.namaLengkap} dan seluruh data terkait (pembayaran, invoice, dokumen) berhasil dihapus total.`,
    });
  } catch (error) {
    console.error("[DELETE /api/manifests/[id]/rows/[rowId]] Error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
