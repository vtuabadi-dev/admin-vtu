import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const barangId = searchParams.get("barangId") || undefined;

  try {
    const where: any = {};
    if (barangId) where.barangId = barangId;

    const variants = await prisma.masterPerlengkapanUkuran.findMany({
      where,
      include: {
        barang: true,
        stokGudang: {
          include: { gudang: true }
        }
      },
      orderBy: [
        { barangId: "asc" },
        { kodeUkuran: "asc" }
      ]
    });

    return NextResponse.json({ success: true, data: variants });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { barangId, kelompokUkuran, kodeUkuran, namaUkuran, initialStockPerGudang } = body;

    if (!barangId || !kodeUkuran || !namaUkuran) {
      return NextResponse.json({ success: false, message: "Barang ID, Kode Ukuran, dan Nama Ukuran wajib diisi" }, { status: 400 });
    }

    const created = await prisma.masterPerlengkapanUkuran.create({
      data: {
        barangId,
        kelompokUkuran: kelompokUkuran || "STANDAR",
        kodeUkuran: kodeUkuran.trim(),
        namaUkuran: namaUkuran.trim(),
      }
    });

    // Seed stock across all active warehouses
    const gudangList = await prisma.masterGudang.findMany({ where: { isActive: true } });
    if (gudangList.length > 0) {
      const stock = typeof initialStockPerGudang === "number" ? initialStockPerGudang : 50;
      await Promise.all(
        gudangList.map(g =>
          prisma.stokGudangItem.create({
            data: {
              gudangId: g.id,
              ukuranId: created.id,
              stokTersedia: stock,
              ambangBatasMin: 10,
            }
          })
        )
      );
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
