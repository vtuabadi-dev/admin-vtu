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
      // Find matching package or group
      const matchKeb = await prisma.keberangkatan.findFirst({
        where: {
          OR: [
            { namaPaket: namaPaket },
            { kode: namaPaket },
            { kodeIndividu: namaPaket },
            { id: namaPaket },
          ],
        },
        select: {
          id: true,
          paketGrupId: true,
          parentKeberangkatanId: true,
          namaPaket: true,
          kode: true,
          kodeIndividu: true,
          tanggalBerangkat: true,
          driveFolderIds: true,
        },
      });

      const matchGrup = !matchKeb
        ? await prisma.paketGrup.findFirst({
            where: { namaPaket: namaPaket },
            select: { id: true },
          })
        : null;

      const rootParentId = matchKeb?.parentKeberangkatanId || matchKeb?.id || null;
      const targetGrupId = matchKeb?.paketGrupId || matchGrup?.id || null;

      // Find all related packages in the whole group (Parent + All Split Branches)
      const groupMembers = await prisma.keberangkatan.findMany({
        where: {
          OR: [
            ...(rootParentId ? [{ id: rootParentId }, { parentKeberangkatanId: rootParentId }] : []),
            ...(targetGrupId ? [{ paketGrupId: targetGrupId }] : []),
            ...(matchKeb ? [{ namaPaket: matchKeb.namaPaket }] : []),
          ],
        },
        select: {
          id: true,
          namaPaket: true,
          kode: true,
          kodeIndividu: true,
          splitLabel: true,
          driveFolderIds: true,
        },
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
        namesSet.add(g.id);
      });

      if (namesSet.size > 0) {
        targetPackageNames = Array.from(namesSet);
        linkedPackageNames = uniqueTitles.length > 0 ? uniqueTitles : [namaPaket];
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
        namaPewakaf: true,
        nomorWhatsapp: true,
        niatAtasNama: true,
        jumlahMushaf: true,
        lokasiWakaf: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Resolve Tour Leader & Muthowif information
    let tourLeader = "";
    let tourLeaderKontak = "";
    let muthowif = "";
    let muthowifKontak = "";

    // 1. From matched Keberangkatan / Group Members meta
    const matchKebForMeta = await prisma.keberangkatan.findFirst({
      where: namaPaket && namaPaket !== "ALL" ? {
        OR: [
          { namaPaket: namaPaket },
          { kode: namaPaket },
          { kodeIndividu: namaPaket },
          { id: namaPaket },
        ]
      } : {},
      select: { driveFolderIds: true },
    });

    if (matchKebForMeta?.driveFolderIds) {
      const meta = matchKebForMeta.driveFolderIds as any;
      if (meta.tourLeader?.nama) {
        tourLeader = meta.tourLeader.nama;
        tourLeaderKontak = meta.tourLeader.kontak || "";
      }
      if (meta.muthowif?.nama) {
        muthowif = meta.muthowif.nama;
        muthowifKontak = meta.muthowif.kontak || "";
      }
    }

    // 2. From badalList / wakafList if not found
    if (!tourLeader) {
      const foundBadal = badalList.find((b) => b.namaTourLeader)?.namaTourLeader;
      const foundWakaf = wakafList.find((w) => w.namaTourLeader)?.namaTourLeader;
      if (foundBadal) tourLeader = foundBadal;
      else if (foundWakaf) tourLeader = foundWakaf;
    }
    if (!muthowif) {
      const foundBadal = badalList.find((b) => b.namaMuthowif)?.namaMuthowif;
      const foundWakaf = wakafList.find((w) => w.namaMuthowif)?.namaMuthowif;
      if (foundBadal) muthowif = foundBadal;
      else if (foundWakaf) muthowif = foundWakaf;
    }

    // 3. From package title parsing (e.g. UST RIDHWAN UST DZUL)
    if ((!tourLeader || !muthowif) && namaPaket) {
      const ustMatches = namaPaket.match(/(?:UST|USTADZ|USTAZ|HABIB|KYAI)\.?\s+[A-Za-z0-9_]+/gi);
      if (ustMatches && ustMatches.length > 0) {
        if (!tourLeader && ustMatches[0]) tourLeader = ustMatches[0];
        if (!muthowif && ustMatches[1]) muthowif = ustMatches[1];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        badalList,
        wakafList,
        linkedPackageNames,
        isDualStartingGroup,
        petugasInfo: {
          tourLeader,
          tourLeaderKontak,
          muthowif,
          muthowifKontak,
        },
      },
    });
  } catch (error: any) {
    console.error("[LAPORAN PAKET GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal mengambil laporan kolektif paket" }, { status: 500 });
  }
}
