import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    const keberangkatans = await prisma.keberangkatan.findMany({
      select: { namaPaket: true, paketGrupId: true },
      distinct: ["namaPaket", "paketGrupId"],
    });

    const groupIds = keberangkatans.map((k) => k.paketGrupId).filter(Boolean) as string[];
    const groups = groupIds.length > 0
      ? await prisma.paketGrup.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, namaPaket: true },
        })
      : [];

    const groupMap = new Map(groups.map((g) => [g.id, g.namaPaket]));

    const allPaketNames = keberangkatans.map(
      (k) => (k.paketGrupId && groupMap.has(k.paketGrupId) ? groupMap.get(k.paketGrupId)! : k.namaPaket)
    );

    const uniquePakets = Array.from(new Set(allPaketNames.filter(Boolean))).sort();

    return NextResponse.json({ success: true, data: uniquePakets });
  } catch (error: any) {
    console.error("[WAKAF DAFTAR PAKET GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil daftar paket" }, { status: 500 });
  }
}
