import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const perm = checkServerPermission(session, "jamaah", "delete");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ids, mode = "soft" } = body as { ids: string[]; mode?: "soft" | "hard" };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Daftar ID jamaah (ids) wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Fetch all matching Jamaah records with their group context
    const targetJamaah = await prisma.jamaah.findMany({
      where: { id: { in: ids } },
      include: { group: true },
    });

    const foundIds = new Set(targetJamaah.map((j) => j.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));

    // Fallback: Handle RegistrationMember IDs if any missing
    if (missingIds.length > 0) {
      await prisma.registrationMember.deleteMany({
        where: { id: { in: missingIds } },
      }).catch(() => {});
    }

    if (targetJamaah.length === 0) {
      return NextResponse.json({
        success: true,
        count: ids.length,
        message: `${ids.length} pendaftar non-jamaah berhasil dihapus`,
      });
    }

    // Map package counts to decrement for active jamaah being canceled/deleted
    const activePaxPerPackage: Record<string, number> = {};
    for (const j of targetJamaah) {
      if (j.status !== "batal" && j.group?.paketKeberangkatanId) {
        const pId = j.group.paketKeberangkatanId;
        activePaxPerPackage[pId] = (activePaxPerPackage[pId] || 0) + 1;
      }
    }

    if (mode === "hard") {
      // Collect group IDs to check after deletion
      const affectedGroupIds = Array.from(
        new Set(targetJamaah.map((j) => j.groupId).filter(Boolean) as string[])
      );

      // Pre-fetch all members of affected groups in ONE single query
      const allMembersInAffectedGroups = affectedGroupIds.length > 0
        ? await prisma.jamaah.findMany({
            where: { groupId: { in: affectedGroupIds } },
            select: { id: true, groupId: true },
          })
        : [];

      // Pre-fetch current registration groups in ONE single query
      const affectedGroups = affectedGroupIds.length > 0
        ? await prisma.registrationGroup.findMany({
            where: { id: { in: affectedGroupIds } },
            select: { id: true, ketuaGroupId: true },
          })
        : [];

      const membersByGroup = new Map<string, string[]>();
      for (const m of allMembersInAffectedGroups) {
        const list = membersByGroup.get(m.groupId) || [];
        list.push(m.id);
        membersByGroup.set(m.groupId, list);
      }

      const emptyGroupIds: string[] = [];
      const partialGroupUpdates: { id: string; ketuaGroupId?: string; jumlahAnggota: number }[] = [];

      for (const group of affectedGroups) {
        const groupMemberIds = membersByGroup.get(group.id) || [];
        const remainingMemberIds = groupMemberIds.filter((mId) => !ids.includes(mId));

        if (remainingMemberIds.length > 0) {
          const updateData: { id: string; ketuaGroupId?: string; jumlahAnggota: number } = {
            id: group.id,
            jumlahAnggota: remainingMemberIds.length,
          };
          if (ids.includes(group.ketuaGroupId)) {
            updateData.ketuaGroupId = remainingMemberIds[0];
          }
          partialGroupUpdates.push(updateData);
        } else {
          emptyGroupIds.push(group.id);
        }
      }

      await prisma.$transaction(
        async (tx) => {
          // A. Delete child records for all target jamaah
          await Promise.all([
            tx.dokumenItem.deleteMany({ where: { jamaahId: { in: ids } } }).catch(() => {}),
            tx.manifestRow.deleteMany({ where: { jamaahId: { in: ids } } }).catch(() => {}),
            tx.penghuniKamar.deleteMany({ where: { jamaahId: { in: ids } } }).catch(() => {}),
            tx.alokasiPembayaran.deleteMany({ where: { jamaahId: { in: ids } } }).catch(() => {}),
          ]);

          // B. Update partially deleted groups (reassign leader if deleted & update count)
          for (const upd of partialGroupUpdates) {
            await tx.registrationGroup.update({
              where: { id: upd.id },
              data: {
                ...(upd.ketuaGroupId ? { ketuaGroupId: upd.ketuaGroupId } : {}),
                jumlahAnggota: upd.jumlahAnggota,
              },
            });
          }

          // C. Clean up and delete completely empty groups FIRST to release 'KetuaGroup' foreign keys
          if (emptyGroupIds.length > 0) {
            await Promise.all([
              tx.invoiceItem.deleteMany({ where: { invoice: { groupId: { in: emptyGroupIds } } } }).catch(() => {}),
              tx.invoice.deleteMany({ where: { groupId: { in: emptyGroupIds } } }).catch(() => {}),
              tx.pembayaran.deleteMany({ where: { groupId: { in: emptyGroupIds } } }).catch(() => {}),
              tx.invoiceSplitConfig.deleteMany({ where: { groupId: { in: emptyGroupIds } } }).catch(() => {}),
              tx.reminder.deleteMany({ where: { groupId: { in: emptyGroupIds } } }).catch(() => {}),
            ]);

            const groupIn = emptyGroupIds.map((g) => `'${g.replace(/'/g, "''")}'`).join(",");
            await tx.$executeRawUnsafe(`DELETE FROM "registration_groups" WHERE "id" IN (${groupIn})`);
          }

          // D. Hard delete the jamaah records
          const jamaahIn = ids.map((j) => `'${j.replace(/'/g, "''")}'`).join(",");
          await tx.$executeRawUnsafe(`DELETE FROM "jamaah" WHERE "id" IN (${jamaahIn})`);

          // E. Decrement filled seats for affected packages
          for (const [pId, activeCount] of Object.entries(activePaxPerPackage)) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: pId } });
            if (kbr && kbr.terisi > 0) {
              const newTerisi = Math.max(0, kbr.terisi - activeCount);
              await tx.keberangkatan.update({
                where: { id: pId },
                data: { terisi: newTerisi },
              });
            }
          }
        },
        {
          timeout: 30000,
          maxWait: 10000,
        }
      );

      return NextResponse.json({
        success: true,
        count: ids.length,
        message: `${ids.length} data jamaah berhasil dihapus permanen`,
      });
    } else {
      // Soft Delete Mode (status = "batal")
      await prisma.$transaction(
        async (tx) => {
          await tx.jamaah.updateMany({
            where: { id: { in: ids } },
            data: { status: "batal" },
          });

          for (const [pId, activeCount] of Object.entries(activePaxPerPackage)) {
            const kbr = await tx.keberangkatan.findUnique({ where: { id: pId } });
            if (kbr && kbr.terisi > 0) {
              const newTerisi = Math.max(0, kbr.terisi - activeCount);
              await tx.keberangkatan.update({
                where: { id: pId },
                data: { terisi: newTerisi },
              });
            }
          }
        },
        {
          timeout: 30000,
          maxWait: 10000,
        }
      );

      return NextResponse.json({
        success: true,
        count: ids.length,
        message: `${ids.length} data jamaah berhasil dibatalkan (soft delete)`,
      });
    }
  } catch (error) {
    console.error("[POST /api/jamaah/bulk-delete] Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
}
