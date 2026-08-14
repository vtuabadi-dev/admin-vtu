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
    const jamaah = await prisma.jamaah.findUnique({
      where: { id: params.id },
      include: { group: true },
    });

    if (!jamaah) {
      return NextResponse.json({ success: false, message: "Jamaah not found" }, { status: 404 });
    }

    const wasActive = jamaah.status !== "batal";
    const paketId = jamaah.group.paketKeberangkatanId;

    if (mode === "hard") {
      const otherMembers = await prisma.jamaah.findMany({
        where: { groupId: jamaah.groupId, id: { not: jamaah.id } },
      });

      await prisma.$transaction(async (tx) => {
        if (jamaah.group.ketuaGroupId === jamaah.id) {
          if (otherMembers.length > 0) {
            const newLeader = otherMembers[0]!;
            await tx.registrationGroup.update({
              where: { id: jamaah.groupId },
              data: { ketuaGroupId: newLeader.id },
            });
          } else {
            const safeJamaah = await tx.jamaah.findFirst({
              where: { id: { not: jamaah.id } },
              select: { id: true },
            });
            if (safeJamaah) {
              await tx.registrationGroup.update({
                where: { id: jamaah.groupId },
                data: { ketuaGroupId: safeJamaah.id },
              });
            }
            await tx.invoiceItem.deleteMany({ where: { invoice: { groupId: jamaah.groupId } } });
            await tx.invoice.deleteMany({ where: { groupId: jamaah.groupId } });
            await tx.pembayaran.deleteMany({ where: { groupId: jamaah.groupId } });
            await tx.invoiceSplitConfig.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.reminder.deleteMany({ where: { groupId: jamaah.groupId } }).catch(() => {});
            await tx.registrationGroup.delete({ where: { id: jamaah.groupId } });
          }
        }

        await tx.dokumenItem.deleteMany({ where: { jamaahId: jamaah.id } });
        await tx.manifestRow.deleteMany({ where: { jamaahId: jamaah.id } });
        await tx.penghuniKamar.deleteMany({ where: { jamaahId: jamaah.id } });
        await tx.alokasiPembayaran.deleteMany({ where: { jamaahId: jamaah.id } });

        await tx.jamaah.delete({ where: { id: jamaah.id } });

        if (wasActive && paketId) {
          const kbr = await tx.keberangkatan.findUnique({ where: { id: paketId } });
          if (kbr && kbr.terisi > 0) {
            await tx.keberangkatan.update({
              where: { id: paketId },
              data: { terisi: { decrement: 1 } },
            });
          }
        }

        if (otherMembers.length > 0) {
          await tx.registrationGroup.update({
            where: { id: jamaah.groupId },
            data: { jumlahAnggota: { decrement: 1 } },
          });
        }
      });

      return NextResponse.json({ success: true, message: "Jamaah hard-deleted successfully" });
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

      return NextResponse.json({ success: true, message: "Jamaah soft-deleted successfully" });
    }
  } catch (error) {
    console.error("[DELETE /api/jamaah/[id]] Error:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
