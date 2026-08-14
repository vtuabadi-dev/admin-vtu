import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceName, targetName } = body;

    if (!sourceName || !targetName) {
      return NextResponse.json(
        { success: false, message: "Nama paket asal dan tujuan wajib diisi" },
        { status: 400 }
      );
    }

    // Find all source Keberangkatan records
    const sourceKebs = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          { namaPaket: sourceName },
          { kode: sourceName },
          { kodeIndividu: sourceName },
        ],
      },
    });

    if (sourceKebs.length === 0) {
      return NextResponse.json(
        { success: false, message: `Paket "${sourceName}" tidak ditemukan` },
        { status: 404 }
      );
    }

    // Find all target Keberangkatan records
    const targetKebs = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          { namaPaket: targetName },
          { kode: targetName },
          { kodeIndividu: targetName },
        ],
      },
    });

    if (targetKebs.length === 0) {
      return NextResponse.json(
        { success: false, message: `Paket "${targetName}" tidak ditemukan` },
        { status: 404 }
      );
    }

    // Find if any of the source records already have a group ID
    let groupId = sourceKebs.find((k) => k.paketGrupId)?.paketGrupId;

    // If source doesn't have a group, check if target has one
    if (!groupId) {
      groupId = targetKebs.find((k) => k.paketGrupId)?.paketGrupId;
    }

    if (!groupId) {
      // Create a new PaketGrup
      const newGroup = await prisma.paketGrup.create({
        data: {
          kodeGrup: `MANUAL-${Date.now()}`,
          namaPaket: sourceName,
        },
      });
      groupId = newGroup.id;
    }

    // Update all source and target records to have this group ID
    const sourceIds = sourceKebs.map((k) => k.id);
    const targetIds = targetKebs.map((k) => k.id);

    await prisma.keberangkatan.updateMany({
      where: {
        id: { in: [...sourceIds, ...targetIds] },
      },
      data: {
        paketGrupId: groupId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Paket berhasil digabungkan",
    });
  } catch (error: any) {
    console.error("[LINK PACKAGES ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal menggabungkan paket" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Nama paket wajib diisi" },
        { status: 400 }
      );
    }

    // Find first Keberangkatan to get the group ID
    const firstKeb = await prisma.keberangkatan.findFirst({
      where: {
        OR: [
          { namaPaket: name },
          { kode: name },
          { kodeIndividu: name },
        ],
      },
      select: { paketGrupId: true },
    });

    if (!firstKeb || !firstKeb.paketGrupId) {
      return NextResponse.json({
        success: true,
        message: "Paket sudah tidak terhubung",
      });
    }

    const groupId = firstKeb.paketGrupId;

    // Find all Keberangkatan records with this name/code to unlink
    const kebsToUnlink = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          { namaPaket: name },
          { kode: name },
          { kodeIndividu: name },
        ],
      },
      select: { id: true },
    });

    const unlinkIds = kebsToUnlink.map((k) => k.id);

    // Unlink the packages
    await prisma.keberangkatan.updateMany({
      where: {
        id: { in: unlinkIds },
      },
      data: {
        paketGrupId: null,
      },
    });

    // Check remaining members in the group
    const remaining = await prisma.keberangkatan.findMany({
      where: { paketGrupId: groupId },
      select: { id: true, namaPaket: true },
    });

    // Count distinct package names remaining in the group
    const remainingNames = Array.from(new Set(remaining.map((r) => r.namaPaket).filter(Boolean)));

    if (remainingNames.length < 2) {
      // Dissolve the group
      if (remaining.length > 0) {
        const remainingIds = remaining.map((r) => r.id);
        await prisma.keberangkatan.updateMany({
          where: {
            id: { in: remainingIds },
          },
          data: {
            paketGrupId: null,
          },
        });
      }

      await prisma.paketGrup.delete({
        where: { id: groupId },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tautan paket berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[UNLINK PACKAGE ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus tautan paket" },
      { status: 500 }
    );
  }
}
