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
    const { namaPaket, waGroupLink } = body;

    if (!namaPaket) {
      return NextResponse.json(
        { success: false, message: "Nama paket wajib disertakan" },
        { status: 400 }
      );
    }

    // Find all matching Keberangkatan records
    const matchingKebs = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          { namaPaket: namaPaket },
          { kode: namaPaket },
          { kodeIndividu: namaPaket },
          { id: namaPaket },
        ],
      },
      select: { id: true, driveFolderIds: true, paketGrupId: true, parentKeberangkatanId: true },
    });

    if (matchingKebs.length === 0) {
      return NextResponse.json(
        { success: false, message: `Paket "${namaPaket}" tidak ditemukan` },
        { status: 404 }
      );
    }

    // Gather all related IDs in group if any
    const rootParentId = matchingKebs[0]?.parentKeberangkatanId || matchingKebs[0]?.id || null;
    const targetGrupId = matchingKebs[0]?.paketGrupId || null;

    const allGroupKebs = await prisma.keberangkatan.findMany({
      where: {
        OR: [
          ...(rootParentId ? [{ id: rootParentId }, { parentKeberangkatanId: rootParentId }] : []),
          ...(targetGrupId ? [{ paketGrupId: targetGrupId }] : []),
          { namaPaket: namaPaket },
        ],
      },
      select: { id: true, driveFolderIds: true },
    });

    const targetList = allGroupKebs.length > 0 ? allGroupKebs : matchingKebs;

    for (const keb of targetList) {
      const existingMeta = (keb.driveFolderIds as Record<string, any>) || {};
      const updatedMeta = {
        ...existingMeta,
        waGroupLink: waGroupLink ? String(waGroupLink).trim() : "",
        waGroupId: waGroupLink ? String(waGroupLink).trim() : "",
      };

      await prisma.keberangkatan.update({
        where: { id: keb.id },
        data: {
          driveFolderIds: updatedMeta,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Link Grup WhatsApp paket berhasil disimpan",
      data: { waGroupLink },
    });
  } catch (error: any) {
    console.error("[WA GROUP LINK SAVE ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan link grup WhatsApp" },
      { status: 500 }
    );
  }
}
