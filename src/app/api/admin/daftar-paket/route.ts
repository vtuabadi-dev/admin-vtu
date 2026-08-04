import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get("bulan"); // 1-12
    const tahun = searchParams.get("tahun"); // e.g. 2025

    // Build date range filter if bulan+tahun provided
    let dateFilter: { gte: Date; lt: Date } | undefined;
    if (bulan && tahun) {
      const month = parseInt(bulan, 10);
      const year = parseInt(tahun, 10);
      if (!isNaN(month) && !isNaN(year)) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1); // first day of next month
        dateFilter = { gte: startDate, lt: endDate };
      }
    }

    const badalWhere: any = { namaPaketUmroh: { not: null } };
    const wakafWhere: any = { namaPaketUmroh: { not: null } };
    const kebWhere: any = {};
    if (dateFilter) {
      badalWhere.createdAt = dateFilter;
      wakafWhere.createdAt = dateFilter;
      kebWhere.tanggalBerangkat = dateFilter;
    }

    const [badalPakets, wakafPakets, keberangkatans] = await Promise.all([
      prisma.badalUmrohRegistration.findMany({
        where: badalWhere,
        select: { namaPaketUmroh: true },
        distinct: ["namaPaketUmroh"],
      }),
      prisma.wakafQuranRegistration.findMany({
        where: wakafWhere,
        select: { namaPaketUmroh: true },
        distinct: ["namaPaketUmroh"],
      }),
      prisma.keberangkatan.findMany({
        where: kebWhere,
        select: { namaPaket: true, paketGrupId: true },
        distinct: ["paketGrupId", "namaPaket"],
      }),
    ]);

    const groupIds = keberangkatans.map(k => k.paketGrupId).filter(Boolean) as string[];
    const groups = groupIds.length > 0 ? await prisma.paketGrup.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, namaPaket: true },
    }) : [];

    const groupMap = new Map(groups.map(g => [g.id, g.namaPaket]));

    const allPakets = [
      ...badalPakets.map((b) => b.namaPaketUmroh as string),
      ...wakafPakets.map((w) => w.namaPaketUmroh as string),
      ...keberangkatans.map(k => k.paketGrupId && groupMap.has(k.paketGrupId) ? groupMap.get(k.paketGrupId)! : k.namaPaket),
    ];

    const uniquePakets = Array.from(new Set(allPakets.filter(Boolean))).sort();

    return NextResponse.json({ success: true, data: uniquePakets });
  } catch (error) {
    console.error("[DAFTAR PAKET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil daftar paket" }, { status: 500 });
  }
}
