import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { groupRepo } from "@/server/repositories";
import { prisma } from "@/server/db/client";
import { transferPackageGroup } from "@/server/services/package-transfer.service";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "jamaah", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const group = await groupRepo.findById(params.id);
    if (!group) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: group });
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

    // Check if this is a package transfer (pindah paket)
    const existingGroup = await prisma.registrationGroup.findUnique({
      where: { id: params.id },
      select: { id: true, paketKeberangkatanId: true },
    });

    if (!existingGroup) {
      return NextResponse.json({ success: false, message: "Group tidak ditemukan" }, { status: 404 });
    }

    const isPackageTransfer =
      body.paketKeberangkatanId &&
      body.paketKeberangkatanId !== existingGroup.paketKeberangkatanId;

    if (isPackageTransfer) {
      const transferResult = await transferPackageGroup({
        groupId: params.id,
        targetPaketId: body.paketKeberangkatanId,
        pricingOption: body.pricingOption || "HARGA_LAMA",
        totalDiff: typeof body.totalDiff === "number" ? body.totalDiff : undefined,
        hotelUpgrade:
          body.hotelUpgradeNominal || body.hotelUpgradeName
            ? {
                hotelName: body.hotelUpgradeName,
                nominal: Number(body.hotelUpgradeNominal) || 0,
              }
            : undefined,
        authorName: session.user.name || session.user.email || "Admin",
      });

      return NextResponse.json({
        success: true,
        data: transferResult,
        message: "Pindah paket berhasil diproses",
      });
    }

    // Sanitize body fields before sending to groupRepo.update for normal non-transfer update
    const cleanUpdateData: any = { ...body };
    delete cleanUpdateData.pricingOption;
    delete cleanUpdateData.newPrice;
    delete cleanUpdateData.oldPrice;
    delete cleanUpdateData.hotelUpgrade;
    delete cleanUpdateData.totalDiff;

    const group = await groupRepo.update(params.id, cleanUpdateData);
    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
