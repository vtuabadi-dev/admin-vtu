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
  const gudangId = searchParams.get("gudangId") || undefined;

  try {
    const gudangList = await prisma.masterGudang.findMany({
      where: { isActive: true },
      orderBy: { kodeGudang: "asc" }
    });

    const items = await prisma.masterPerlengkapan.findMany({
      where: { isActive: true },
      include: {
        ukuran: {
          include: {
            stokGudang: {
              include: { gudang: true }
            }
          }
        },
        mutasi: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    const recentMutasi = await prisma.perlengkapanMutasi.findMany({
      include: {
        barang: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Compute stats
    const totalJenis = items.length;
    let totalStokFisik = 0;
    let stokKritisCount = 0;

    items.forEach((it) => {
      let itemTotal = 0;
      (it.ukuran || []).forEach((u) => {
        (u.stokGudang || []).forEach((sg) => {
          if (!gudangId || sg.gudangId === gudangId) {
            itemTotal += sg.stokTersedia;
          }
        });
      });
      totalStokFisik += itemTotal;
      if (itemTotal <= it.stokMinimum) stokKritisCount++;
    });

    return NextResponse.json({
      success: true,
      data: {
        gudangList,
        items,
        recentMutasi,
        stats: {
          totalJenis,
          totalStokFisik,
          stokKritisCount,
        },
      },
    });
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
    const { action } = body;

    if (action === "mutasi") {
      const { barangId, tipe, jumlah, keterangan, petugas, gudangId, ukuranId } = body;
      if (!barangId || !tipe || !jumlah) {
        return NextResponse.json({ success: false, message: "Data mutasi tidak lengkap" }, { status: 400 });
      }

      const qty = parseInt(jumlah, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ success: false, message: "Jumlah mutasi harus lebih dari 0" }, { status: 400 });
      }

      const barang = await prisma.masterPerlengkapan.findUnique({ where: { id: barangId } });
      if (!barang) {
        return NextResponse.json({ success: false, message: "Barang tidak ditemukan" }, { status: 404 });
      }

      // If specific warehouse & size variant is selected for mutation
      if (gudangId && ukuranId) {
        const stokItem = await prisma.stokGudangItem.findUnique({
          where: { gudangId_ukuranId: { gudangId, ukuranId } }
        });

        if (tipe === "KELUAR" && (!stokItem || stokItem.stokTersedia < qty)) {
          return NextResponse.json({
            success: false,
            message: `Stok pada gudang tidak mencukupi. Stok saat ini: ${stokItem?.stokTersedia || 0}`,
          }, { status: 400 });
        }

        const newStokGudang = tipe === "MASUK" ? ((stokItem?.stokTersedia || 0) + qty) : ((stokItem?.stokTersedia || 0) - qty);

        await prisma.stokGudangItem.upsert({
          where: { gudangId_ukuranId: { gudangId, ukuranId } },
          update: { stokTersedia: newStokGudang },
          create: { gudangId, ukuranId, stokTersedia: newStokGudang, ambangBatasMin: 10 }
        });
      }

      const newStokTotal = tipe === "MASUK" ? barang.stokTersedia + qty : Math.max(0, barang.stokTersedia - qty);

      const [mutasiResult, updatedBarang] = await prisma.$transaction([
        prisma.perlengkapanMutasi.create({
          data: {
            barangId,
            tipe,
            jumlah: qty,
            keterangan: keterangan || null,
            petugas: petugas || (session.user as any)?.name || "Admin",
          },
        }),
        prisma.masterPerlengkapan.update({
          where: { id: barangId },
          data: { stokTersedia: newStokTotal },
        }),
      ]);

      return NextResponse.json({ success: true, data: { mutasi: mutasiResult, barang: updatedBarang } });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
