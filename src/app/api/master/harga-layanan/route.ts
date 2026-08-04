import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const data = await prisma.masterHargaLayanan.findMany();
    const config: Record<string, number> = {};
    
    // Default fallback if not set in DB
    config["BADAL_UMROH"] = 2500000;
    config["WAKAF_QURAN"] = 350000;
    
    data.forEach((item: any) => {
      config[item.tipeLayanan] = item.harga;
    });
    
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error("[MASTER HARGA GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil data harga layanan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tipeLayanan, harga } = body;

    if (!tipeLayanan || harga === undefined) {
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const updated = await prisma.masterHargaLayanan.upsert({
      where: { tipeLayanan },
      update: { 
        harga: Number(harga), 
        updatedBy: session.user.name || session.user.email 
      },
      create: { 
        tipeLayanan, 
        harga: Number(harga), 
        updatedBy: session.user.name || session.user.email 
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "Harga berhasil diupdate" });
  } catch (error: any) {
    console.error("[MASTER HARGA POST ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal update harga layanan" }, { status: 500 });
  }
}
