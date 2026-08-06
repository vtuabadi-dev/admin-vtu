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

    // Resolve all package names in group if package belongs to a combined PaketGrup (Dual Starting Point)
    let targetPackageNames: string[] | null = null;
    let linkedPackageNames: string[] = [];
    let isDualStartingGroup = false;

    if (namaPaket && namaPaket !== "ALL") {
      const matchKeb = await prisma.keberangkatan.findFirst({
        where: {
          OR: [
            { namaPaket: namaPaket },
            { kode: namaPaket },
            { kodeIndividu: namaPaket },
          ],
        },
        select: { id: true, paketGrupId: true, namaPaket: true, kode: true, kodeIndividu: true },
      });

      if (matchKeb?.paketGrupId) {
        const groupMembers = await prisma.keberangkatan.findMany({
          where: { paketGrupId: matchKeb.paketGrupId },
          select: { namaPaket: true, kode: true, kodeIndividu: true },
        });

        const namesSet = new Set<string>();
        const uniqueTitles: string[] = [];

        groupMembers.forEach((g) => {
          if (g.namaPaket) {
            namesSet.add(g.namaPaket);
            if (!uniqueTitles.includes(g.namaPaket)) {
              uniqueTitles.push(g.namaPaket);
            }
          }
          if (g.kode) namesSet.add(g.kode);
          if (g.kodeIndividu) namesSet.add(g.kodeIndividu);
        });

        targetPackageNames = Array.from(namesSet);
        linkedPackageNames = uniqueTitles;
        if (linkedPackageNames.length > 1) {
          isDualStartingGroup = true;
        }
      } else {
        targetPackageNames = [namaPaket];
        linkedPackageNames = [namaPaket];
      }
    }

    // Fetch Badal Umroh (Confirmed/Lunas or All)
    const badalWhere: any = {};
    if (targetPackageNames && targetPackageNames.length > 0) {
      badalWhere.namaPaketUmroh = { in: targetPackageNames };
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
    if (targetPackageNames && targetPackageNames.length > 0) {
      wakafWhere.namaPaketUmroh = { in: targetPackageNames };
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
        linkedPackageNames,
        isDualStartingGroup,
      },
    });
  } catch (error: any) {
    console.error("[LAPORAN PAKET GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil laporan kolektif paket" }, { status: 500 });
  }
}
