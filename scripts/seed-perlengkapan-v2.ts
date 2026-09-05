import { prisma } from "../src/server/db/client";

async function main() {
  console.log("=== SEEDING MASTER GUDANG & PERLENGKAPAN V2 (FAST) ===");

  const gudangData = [
    { kodeGudang: "GDG-SUB", namaGudang: "Gudang Utama Surabaya", alamat: "Jl. Raya Surabaya No. 12", penanggungJawab: "Admin Surabaya" },
    { kodeGudang: "GDG-JKT", namaGudang: "Gudang Transit Jakarta", alamat: "Jl. Bandara Soekarno Hatta", penanggungJawab: "Admin Jakarta" },
    { kodeGudang: "GDG-BND", namaGudang: "Gudang Operasional Bandara", alamat: "Area Handling Bandara", penanggungJawab: "Tim Handling" },
  ];

  const gudangList = await Promise.all(
    gudangData.map(g => prisma.masterGudang.upsert({ where: { kodeGudang: g.kodeGudang }, update: g, create: g }))
  );
  console.log("Gudang Seeded:", gudangList.map(g => g.namaGudang));

  const items = [
    { code: "BTK-DOA", name: "Buku Doa & Dzikir Panduan Umroh", satuan: "buku", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "SLY-HRH", name: "Slayer Leher VTU (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "TAS-SRT", name: "Tas Serut Sandal (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },
    { code: "IDC-JMH", name: "ID Card & Tali Gantung Jamaah (Hari H)", satuan: "pcs", tipePengambilan: "SERENTAK_HARI_H", sifatPerlengkapan: "UMUM_WAJIB", genderTarget: "ALL" },

    { code: "KPR-24", name: "Koper Bagasi Besar 24 Inch VTU", satuan: "pcs", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "ALL" },
    { code: "SRG-VTU", name: "Seragam Umroh VTU (Kain/Jadi)", satuan: "set", tipePengambilan: "BEBAS_KAPAN_SAJA", sifatPerlengkapan: "PAKET_STANDAR", genderTarget: "ALL" },
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
      update: it as any,
      create: it as any,
    });

    if (it.code === "SRG-VTU") {
      const sizes = [
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "3", namaUkuran: "Anak Kemeja No 3" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "4", namaUkuran: "Anak Kemeja No 4" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "5", namaUkuran: "Anak Kemeja No 5" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "6", namaUkuran: "Anak Kemeja No 6" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "7", namaUkuran: "Anak Kemeja No 7" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "8", namaUkuran: "Anak Kemeja No 8" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "9", namaUkuran: "Anak Kemeja No 9" },
        { kelompokUkuran: "ANAK_LAKI", kodeUkuran: "10", namaUkuran: "Anak Kemeja No 10" },

        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "S", namaUkuran: "Dewasa Laki Kemeja S" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "M", namaUkuran: "Dewasa Laki Kemeja M" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "L", namaUkuran: "Dewasa Laki Kemeja L" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "XL", namaUkuran: "Dewasa Laki Kemeja XL" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "XXL", namaUkuran: "Dewasa Laki Kemeja XXL" },
        { kelompokUkuran: "DEWASA_LAKI", kodeUkuran: "4L", namaUkuran: "Dewasa Laki Kemeja 4L" },

        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "W-S", namaUkuran: "Dewasa Perempuan Outer S" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "W-M", namaUkuran: "Dewasa Perempuan Outer M" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "W-L", namaUkuran: "Dewasa Perempuan Outer L" },
        { kelompokUkuran: "DEWASA_PEREMPUAN", kodeUkuran: "W-XL", namaUkuran: "Dewasa Perempuan Outer XL" },
      ];

      for (const sz of sizes) {
        const ukObj = await prisma.masterPerlengkapanUkuran.upsert({
          where: { barangId_kodeUkuran: { barangId: itemObj.id, kodeUkuran: sz.kodeUkuran } },
          update: { ...sz, barangId: itemObj.id },
          create: { ...sz, barangId: itemObj.id },
        });

        await Promise.all(gudangList.map(gdg =>
          prisma.stokGudangItem.upsert({
            where: { gudangId_ukuranId: { gudangId: gdg.id, ukuranId: ukObj.id } },
            update: { stokTersedia: 100, ambangBatasMin: 15 },
            create: { gudangId: gdg.id, ukuranId: ukObj.id, stokTersedia: 100, ambangBatasMin: 15 },
          })
        ));
      }
    } else {
      const ukObj = await prisma.masterPerlengkapanUkuran.upsert({
        where: { barangId_kodeUkuran: { barangId: itemObj.id, kodeUkuran: "STD" } },
        update: { kelompokUkuran: "STANDAR", namaUkuran: "Ukuran Standar" },
        create: { barangId: itemObj.id, kelompokUkuran: "STANDAR", kodeUkuran: "STD", namaUkuran: "Ukuran Standar" },
      });

      await Promise.all(gudangList.map(gdg =>
        prisma.stokGudangItem.upsert({
          where: { gudangId_ukuranId: { gudangId: gdg.id, ukuranId: ukObj.id } },
          update: { stokTersedia: 150, ambangBatasMin: 20 },
          create: { gudangId: gdg.id, ukuranId: ukObj.id, stokTersedia: 150, ambangBatasMin: 20 },
        })
      ));
    }
  }

  console.log("Seeding Master Perlengkapan V2 finished successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
