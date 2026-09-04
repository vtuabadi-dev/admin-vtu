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
  const paketId = searchParams.get("paketId") || undefined;
  const statusFilter = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    // Packages for dropdown filter
    const packages = await prisma.keberangkatan.findMany({
      select: {
        id: true,
        namaPaket: true,
        kodeIndividu: true,
        tanggalBerangkat: true,
        status: true,
      },
      orderBy: { tanggalBerangkat: "desc" },
    });

    // Master items for checklist
    const masterItems = await prisma.masterPerlengkapan.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const where: any = {
      status: { not: "batal" },
    };

    if (paketId && paketId !== "all") {
      where.group = {
        paketKeberangkatanId: paketId,
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { namaLengkap: { contains: q, mode: "insensitive" } },
        { registrationId: { contains: q, mode: "insensitive" } },
        { nomorPaspor: { contains: q, mode: "insensitive" } },
        { nik: { contains: q, mode: "insensitive" } },
      ];
    }

    const jamaahList = await prisma.jamaah.findMany({
      where,
      include: {
        group: {
          include: {
            keberangkatan: true,
          },
        },
        detailPengambilan: {
          include: {
            barang: true,
          },
        },
      },
      orderBy: [
        { registrationId: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Calculate status counts
    let countTanpa = 0;
    let countBelumAmbil = 0;
    let countSebagian = 0;
    let countSudahAmbil = 0;

    const formattedJamaah = jamaahList.map((j: any) => {
      const isGroupTanpa = j.group?.tanpaPerlengkapan || j.group?.perlengkapan === "EXCLUDE";
      let effectiveStatus = j.statusPerlengkapan;
      if (!effectiveStatus || effectiveStatus === "BELUM_AMBIL") {
        if (isGroupTanpa) effectiveStatus = "TANPA";
        else effectiveStatus = "BELUM_AMBIL";
      }

      if (effectiveStatus === "TANPA") countTanpa++;
      else if (effectiveStatus === "SUDAH_AMBIL") countSudahAmbil++;
      else if (effectiveStatus === "SEBAGIAN") countSebagian++;
      else countBelumAmbil++;

      return {
        id: j.id,
        registrationId: j.registrationId,
        nomorPeserta: j.nomorPeserta,
        namaLengkap: j.namaLengkap,
        nomorTelepon: j.nomorTelepon,
        nomorPaspor: j.nomorPaspor,
        statusPerlengkapan: effectiveStatus,
        tanggalAmbilPerlengkapan: j.tanggalAmbilPerlengkapan,
        catatanPerlengkapan: j.catatanPerlengkapan,
        groupName: j.group?.namaGroup || "-",
        groupCode: j.group?.kodeRegistrasi || "-",
        paketId: j.group?.paketKeberangkatanId,
        namaPaket: j.group?.keberangkatan?.namaPaket || "-",
        tanggalKeberangkatan: j.group?.keberangkatan?.tanggalBerangkat,
        checklist: (j.detailPengambilan || []).map((dp: any) => ({
          barangId: dp.barangId,
          namaBarang: dp.barang?.name,
          code: dp.barang?.code,
          status: dp.status,
          tanggalAmbil: dp.tanggalAmbil,
          petugas: dp.petugas,
        })),
      };
    });

    // Filter by status if requested
    const filteredData = statusFilter && statusFilter !== "ALL"
      ? formattedJamaah.filter((j: any) => j.statusPerlengkapan === statusFilter)
      : formattedJamaah;

    return NextResponse.json({
      success: true,
      data: {
        packages,
        masterItems,
        jamaah: filteredData,
        stats: {
          total: formattedJamaah.length,
          tanpa: countTanpa,
          belumAmbil: countBelumAmbil,
          sebagian: countSebagian,
          sudahAmbil: countSudahAmbil,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jamaahId, statusPerlengkapan, tanggalAmbilPerlengkapan, catatanPerlengkapan, items } = body;

    if (!jamaahId) {
      return NextResponse.json({ success: false, message: "Jamaah ID wajib diisi" }, { status: 400 });
    }

    let finalStatus = statusPerlengkapan;
    const now = new Date();
    const petugasName = (session.user as any)?.name || "Admin";

    // If items checklist is provided
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const existing = await prisma.pengambilanPerlengkapanItem.findUnique({
          where: {
            jamaahId_barangId: {
              jamaahId,
              barangId: it.barangId,
            },
          },
        });

        const isNewlyTaken = it.status === "SUDAH" && (!existing || existing.status !== "SUDAH");

        await prisma.pengambilanPerlengkapanItem.upsert({
          where: {
            jamaahId_barangId: {
              jamaahId,
              barangId: it.barangId,
            },
          },
          update: {
            status: it.status,
            tanggalAmbil: it.status === "SUDAH" ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now) : null,
            petugas: petugasName,
          },
          create: {
            jamaahId,
            barangId: it.barangId,
            status: it.status,
            tanggalAmbil: it.status === "SUDAH" ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now) : null,
            petugas: petugasName,
          },
        });

        // Deduct inventory stock if newly checked as taken
        if (isNewlyTaken) {
          const barang = await prisma.masterPerlengkapan.findUnique({ where: { id: it.barangId } });
          if (barang && barang.stokTersedia > 0) {
            await prisma.$transaction([
              prisma.perlengkapanMutasi.create({
                data: {
                  barangId: it.barangId,
                  tipe: "KELUAR",
                  jumlah: 1,
                  keterangan: `Pengambilan perlengkapan jamaah`,
                  petugas: petugasName,
                },
              }),
              prisma.masterPerlengkapan.update({
                where: { id: it.barangId },
                data: { stokTersedia: { decrement: 1 } },
              }),
            ]);
          }
        }
      }

      // Auto-calculate status if not TANPA
      if (finalStatus !== "TANPA") {
        const sudahCount = items.filter((it: any) => it.status === "SUDAH").length;
        if (sudahCount === items.length) {
          finalStatus = "SUDAH_AMBIL";
        } else if (sudahCount > 0) {
          finalStatus = "SEBAGIAN";
        } else {
          finalStatus = "BELUM_AMBIL";
        }
      }
    }

    const updatedJamaah = await prisma.jamaah.update({
      where: { id: jamaahId },
      data: {
        statusPerlengkapan: finalStatus,
        tanggalAmbilPerlengkapan:
          finalStatus === "SUDAH_AMBIL" || finalStatus === "SEBAGIAN"
            ? (tanggalAmbilPerlengkapan ? new Date(tanggalAmbilPerlengkapan) : now)
            : null,
        catatanPerlengkapan: catatanPerlengkapan !== undefined ? catatanPerlengkapan : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updatedJamaah });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
