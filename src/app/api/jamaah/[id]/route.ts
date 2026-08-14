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

    if (mode === "hard") {
      const otherMembers = jamaah.groupId
        ? await prisma.jamaah.findMany({
            where: { groupId: jamaah.groupId, id: { not: jamaah.id } },
          })
        : [];

      await prisma.$transaction(async (tx) => {
        // 1. Delete all child references belonging to this jamaah
        await tx.dokumenItem.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {});
        await tx.manifestRow.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {});
        await tx.penghuniKamar.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {});
        await tx.alokasiPembayaran.deleteMany({ where: { jamaahId: jamaah.id } }).catch(() => {});

        // 2. Delete the jamaah record FIRST (frees FK reference to registrationGroup)
        await tx.jamaah.delete({ where: { id: jamaah.id } });

        // 3. Handle RegistrationGroup update or cleanup AFTER jamaah is deleted
        if (jamaah.groupId && jamaah.group) {
          if (otherMembers.length > 0) {
            // Re-assign group leader if deleted jamaah was leader
            if (jamaah.group.ketuaGroupId === jamaah.id && otherMembers[0]) {
              await tx.registrationGroup.update({
                where: { id: jamaah.groupId },
                data: { ketuaGroupId: otherMembers[0].id },
              });
            }
            await tx.registrationGroup.update({
              where: { id: jamaah.groupId },
              data: { jumlahAnggota: { decrement: 1 } },
            });
          } else {
            // No other members left in group -> clean up billing & delete empty group
            await tx.invoiceItem.deleteMany({ where: { invoice: { groupId: jamaah.groupId } } }).catch(() => {});
            await tx.invoice.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.pembayaran.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.invoiceSplitConfig.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.reminder.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.registrationGroup.delete({ where: { id: jamaah.groupId } }).catch(() => {});
          }
        }

        // 4. Decrement package capacity if active
        if (wasActive && paketId) {
          const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
          if (kbr && kbr.terisi > 0) {
            await tx.keberangkatan.update({
              where: { id: paketId },
              data: { terisi: { decrement: 1 } },
            });
          }
        }
      });

      return NextResponse.json({ success: true, message: "Jamaah berhasil dihapus permanen" });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.jamaah.update({
          where: { id: jamaah.id },
          data: { status: "batal" },
        });

        if (wasActive && paketId) {
          const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
          if (kbr && kbr.terisi > 0) {
            await tx.keberangkatan.update({
              where: { id: paketId },
              data: { terisi: { decrement: 1 } },
            });
          }
        }
      });

      return NextResponse.json({ success: true, message: "Jamaah berhasil dibatalkan (soft delete)" });
    }
  } catch (error) {
    console.error("[DELETE /api/jamaah/[id]] Error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
