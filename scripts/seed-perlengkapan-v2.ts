import { prisma } from "../src/server/db/client";

async function main() {
  console.log("=== SEEDING MASTER GUDANG & PERLENGKAPAN V2 ===");

  const gudangData = [
    { kodeGudang: "GDG-SUB", namaGudang: "Gudang Utama Surabaya", alamat: "Jl. Raya Surabaya No. 12", penanggungJawab: "Admin Surabaya" },
    { kodeGudang: "GDG-JKT", namaGudang: "Gudang Transit Jakarta", alamat: "Jl. Bandara Soekarno Hatta", penanggungJawab: "Admin Jakarta" },
    { kodeGudang: "GDG-BND", namaGudang: "Gudang Operasional Bandara", alamat: "Area Handling Bandara", penanggungJawab: "Tim Handling" },
  ];

  const gudangList = [];
  for (const g of gudangData) {
    const gdg = await prisma.masterGudang.upsert({ where: { kodeGudang: g.kodeGudang }, update: g, create: g });
    gudangList.push(gdg);
  }
  console.log("Gudang Seeded:", gudangList.map(g => g.namaGudang));

  // Deactivate old unified item SRG-VTU if exists
  await prisma.masterPerlengkapan.updateMany({
    where: { code: "SRG-VTU" },
    data: { isActive: false },
  });

  const items = [
    { code: "BTK-DOA", name: "Buku Doa & Dzikir Panduan Umroh", satuan: "buku", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "SLY-HRH", name: "Slayer Leher VTU (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "TAS-SRT", name: "Tas Serut Sandal (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "IDC-JMH", name: "ID Card & Tali Gantung Jamaah (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },

    { code: "KPR-24", name: "Koper Bagasi Besar 24 Inch VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "ALL" },
    { code: "SRG-LAK", name: "Seragam Umroh Laki-Laki (Kain / Kemeja)", satuan: "set", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "LAKI_LAKI" },
    { code: "SRG-PRM", name: "Seragam Umroh Perempuan (Kain / Outer)", satuan: "set", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "PEREMPUAN" },
    { code: "MKN-WMN", name: "Mukena & Bergo Wanita VTU", satuan: "set", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "PEREMPUAN" },
    { code: "IHR-PRI", name: "Kain Ihram Pria (Set 2 Lembar)", satuan: "set", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "LAKI_LAKI" },
    { code: "CVR-PAS", name: "Cover Paspor Paspor VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "ALL" },
    { code: "TAS-TNG", name: "Tas Tenteng Kabin VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "ALL" },

    { code: "TAS-SLP", name: "Tas Selempang VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "ADDON_KHUSUS", genderTarget: "ALL" },
    { code: "KHM-WMN", name: "Khimar Wanita VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "ADDON_KHUSUS", genderTarget: "PEREMPUAN" },
    { code: "SRG-TNG", name: "Sarung Tangan Wanita VTU", satuan: "pasang", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "ADDON_KHUSUS", genderTarget: "PEREMPUAN" },
  ];

  for (const it of items) {
    const itemObj = await prisma.masterPerlengkapan.upsert({
      where: { code: it.code },
      update: { ...it, isActive: true } as any,
      create: { ...it, isActive: true } as any,
    });

    let sizes: { kelompokUkuran: string; kodeUkuran: string; namaUkuran: string }[] = [];

    if (it.code === "SRG-LAK") {
      sizes = [
        { kelompokUkuran: "KAIN", kodeUkuran: "KAIN", namaUkuran: "Bahan Kain (Belum Jadi)" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "S", namaUkuran: "Kemeja Dewasa S" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "M", namaUkuran: "Kemeja Dewasa M" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "L", namaUkuran: "Kemeja Dewasa L" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "XL", namaUkuran: "Kemeja Dewasa XL" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "XXL", namaUkuran: "Kemeja Dewasa XXL" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "4L", namaUkuran: "Kemeja Dewasa 4L" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "3", namaUkuran: "Kemeja Anak No 3" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "4", namaUkuran: "Kemeja Anak No 4" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "5", namaUkuran: "Kemeja Anak No 5" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "6", namaUkuran: "Kemeja Anak No 6" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "7", namaUkuran: "Kemeja Anak No 7" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "8", namaUkuran: "Kemeja Anak No 8" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "9", namaUkuran: "Kemeja Anak No 9" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "10", namaUkuran: "Kemeja Anak No 10" },
      ];
    } else if (it.code === "SRG-PRM") {
      sizes = [
        { kelompokUkuran: "KAIN", kodeUkuran: "KAIN", namaUkuran: "Bahan Kain (Belum Jadi)" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "S", namaUkuran: "Outer Dewasa S" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "M", namaUkuran: "Outer Dewasa M" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "L", namaUkuran: "Outer Dewasa L" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "XL", namaUkuran: "Outer Dewasa XL" },
      ];
    } else {
      sizes = [
        { kelompokUkuran: "STANDAR", kodeUkuran: "STD", namaUkuran: "Ukuran Standar" },
      ];
    }

    for (const sz of sizes) {
      const ukObj = await prisma.masterPerlengkapanUkuran.upsert({
        where: { barangId_kodeUkuran: { barangId: itemObj.id, kodeUkuran: sz.kodeUkuran } },
        update: { ...sz, barangId: itemObj.id },
        create: { ...sz, barangId: itemObj.id },
      });

      for (const gdg of gudangList) {
        await prisma.stokGudangItem.upsert({
          where: { gudangId_ukuranId: { gudangId: gdg.id, ukuranId: ukObj.id } },
          update: { stokTersedia: 100, ambangBatasMin: 15 },
          create: { gudangId: gdg.id, ukuranId: ukObj.id, stokTersedia: 100, ambangBatasMin: 15 },
        });
      }
    }
  }

  console.log("Seeding Master Perlengkapan V2 finished successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
