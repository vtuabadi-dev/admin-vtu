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
    const namaPaket = searchParams.get("namaPaket");

    // Fetch Badal Umroh (Confirmed/Lunas or All)
    const badalWhere: any = {};
    if (namaPaket && namaPaket !== "ALL") {
      badalWhere.namaPaketUmroh = namaPaket;
    }

    const badalList = await prisma.badalUmrohRegistration.findMany({
      where: badalWhere,
      select: {
        id: true,
        namaPaketUmroh: true,
        namaTourLeader: true,
        namaMuthowif: true,
        namaAlmarhum: true,
        jenisKelamin: true,
        hubungan: true,
        paketBadal: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Wakaf Quran (Without exposing pewakaf name in collective view)
    const wakafWhere: any = {};
    if (namaPaket && namaPaket !== "ALL") {
      wakafWhere.namaPaketUmroh = namaPaket;
    }

    const wakafList = await prisma.wakafQuranRegistration.findMany({
      where: wakafWhere,
      select: {
        id: true,
        namaPaketUmroh: true,
        namaTourLeader: true,
        namaMuthowif: true,
        niatAtasNama: true,
        jumlahMushaf: true,
        lokasiWakaf: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        badalList,
        wakafList,
      },
    });
  } catch (error: any) {
    console.error("[LAPORAN PAKET GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil laporan kolektif paket" }, { status: 500 });
  }
}
