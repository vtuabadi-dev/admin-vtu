import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";

const DEFAULT_ITEMS = [
  { code: "KPR-24", name: "Koper Bagasi 24 Inch VTU", stokTersedia: 150, stokMinimum: 25, satuan: "pcs" },
  { code: "KPR-20", name: "Koper Kabin 20 Inch VTU", stokTersedia: 150, stokMinimum: 25, satuan: "pcs" },
  { code: "TAS-PSP", name: "Tas Paspor & Selempang VTU", stokTersedia: 200, stokMinimum: 30, satuan: "pcs" },
  { code: "IHR-PRI", name: "Kain Ihram Pria (Set 2 Lembar)", stokTersedia: 120, stokMinimum: 25, satuan: "set" },
  { code: "MKN-WAN", name: "Mukena & Bergo Wanita VTU", stokTersedia: 130, stokMinimum: 25, satuan: "set" },
  { code: "BTK-SRG", name: "Bahan Kain Batik Seragam VTU", stokTersedia: 300, stokMinimum: 40, satuan: "meter" },
  { code: "SBK-IHR", name: "Sabuk Ihram Gesper Putih", stokTersedia: 100, stokMinimum: 20, satuan: "pcs" },
  { code: "BK-DOA", name: "Buku Doa & Dzikir Panduan Umroh", stokTersedia: 250, stokMinimum: 50, satuan: "buku" },
  { code: "TAG-ID", name: "Tali Koper & ID Card Gantung", stokTersedia: 400, stokMinimum: 50, satuan: "pcs" },
];

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let items = await prisma.masterPerlengkapan.findMany({
      include: {
        mutasi: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    // Auto-seed if empty
    if (items.length === 0) {
      for (const item of DEFAULT_ITEMS) {
        await prisma.masterPerlengkapan.create({
          data: item,
        });
      }
      items = await prisma.masterPerlengkapan.findMany({
        include: {
          mutasi: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { name: "asc" },
      });
    }

    const recentMutasi = await prisma.perlengkapanMutasi.findMany({
      include: {
        barang: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalJenis = items.length;
    const totalStokFisik = items.reduce((acc, it) => acc + it.stokTersedia, 0);
    const stokKritisCount = items.filter((it) => it.stokTersedia <= it.stokMinimum).length;

    return NextResponse.json({
      success: true,
      data: {
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

    if (action === "create") {
      const { code, name, stokTersedia, stokMinimum, satuan } = body;
      if (!code || !name) {
        return NextResponse.json({ success: false, message: "Kode dan Nama Barang wajib diisi" }, { status: 400 });
      }

      const existing = await prisma.masterPerlengkapan.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Kode barang sudah terdaftar" }, { status: 400 });
      }

      const newItem = await prisma.masterPerlengkapan.create({
        data: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          stokTersedia: Number(stokTersedia) || 0,
          stokMinimum: Number(stokMinimum) || 10,
          satuan: satuan || "pcs",
        },
      });

      return NextResponse.json({ success: true, data: newItem });
    }

    if (action === "mutasi") {
      const { barangId, tipe, jumlah, keterangan, petugas } = body;
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

      if (tipe === "KELUAR" && barang.stokTersedia < qty) {
        return NextResponse.json({
          success: false,
          message: `Stok tidak mencukupi. Stok saat ini: ${barang.stokTersedia} ${barang.satuan}`,
        }, { status: 400 });
      }

      const newStok = tipe === "MASUK" ? barang.stokTersedia + qty : barang.stokTersedia - qty;

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
          data: { stokTersedia: newStok },
        }),
      ]);

      return NextResponse.json({ success: true, data: { mutasi: mutasiResult, barang: updatedBarang } });
    }

    if (action === "update") {
      const { id, name, stokMinimum, satuan, stokTersedia } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: "ID Barang wajib disertakan" }, { status: 400 });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (stokMinimum !== undefined) updateData.stokMinimum = Number(stokMinimum);
      if (satuan !== undefined) updateData.satuan = satuan;
      if (stokTersedia !== undefined) updateData.stokTersedia = Number(stokTersedia);

      const updated = await prisma.masterPerlengkapan.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
