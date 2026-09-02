import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Fetch active master data from database
    const [dbAirlines, dbHotels, dbClusters, dbCities, dbPerlengkapan, dbRoutes] = await Promise.all([
      prisma.masterAirline.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: "asc" } }),
      prisma.masterHotel.findMany({ where: { isActive: true }, select: { name: true, city: { select: { code: true, name: true } } }, orderBy: { name: "asc" } }),
      prisma.masterCluster.findMany({ where: { isActive: true }, select: { nama: true }, orderBy: { nama: "asc" } }),
      prisma.masterCity.findMany({ where: { isActive: true }, select: { name: true, code: true }, orderBy: { name: "asc" } }),
      prisma.masterPerlengkapan.findMany({ where: { isActive: true }, select: { name: true }, orderBy: { name: "asc" } }),
      prisma.masterRoute.findMany({ where: { isActive: true }, select: { kode: true, ruteIn: true, ruteOut: true }, orderBy: { kode: "asc" } }),
    ]);

    // Fallbacks if master data in database is empty
    const fallbackAirlines = ["Saudia Airlines", "Lion Air", "Garuda Indonesia", "Etihad Airways", "Qatar Airways", "Oman Air", "Emirates", "Batik Air"];
    const fallbackStartingPoints = ["Surabaya (SUB)", "Jakarta (CGK)", "Medan (KNO)", "Solo (SOC)", "Makassar (UPG)", "Kertajati (KJT)"];
    const fallbackHotelsMekkah = ["Safwah Tower", "Pullman Zamzam", "Fairmont Makkah", "Clock Tower", "Swissotel Makkah", "Movenpick Makkah", "Anjum Hotel"];
    const fallbackHotelsMadinah = ["Durrat Al Eiman", "Ansar Palace", "Oberoi Madinah", "Frontel Al Harithia", "Pullman Zamzam Madinah", "Grand Plaza Madinah"];
    const fallbackClusters = ["Bronze", "Silver", "Gold", "Platinum", "Executive", "Reguler"];
    const fallbackPerlengkapan = ["Termasuk (Gratis)", "Belum / Tidak Termasuk", "Opsional (Bayar Terpisah)"];
    const fallbackRoutes = ["JED-MED", "MED-JED", "JED-JED", "MED-MED", "JED.TH-M", "JED.TH-J", "TD.D-J", "TD.C-J", "TD.C-M", "MED-J", "UD.D-J", "UD.D-M", "JED.D-J", "JED.C-M"];

    const airlineList = dbAirlines.length > 0 ? dbAirlines.map(a => a.name) : fallbackAirlines;
    const startingList = dbCities.length > 0 ? dbCities.map(c => `${c.name} (${c.code})`) : fallbackStartingPoints;
    const clusterList = dbClusters.length > 0 ? dbClusters.map(c => c.nama) : fallbackClusters;
    const perlengkapanList = Array.from(new Set([
      ...fallbackPerlengkapan,
      ...dbPerlengkapan.map(p => p.name),
    ]));
    const routeList = Array.from(new Set([
      ...(dbRoutes.length > 0 ? dbRoutes.map(r => r.kode) : fallbackRoutes),
    ]));

    const mekkahDb = dbHotels.filter(h => h.city?.code === "MEK" || h.city?.name.toLowerCase().includes("mek")).map(h => h.name);
    const madinahDb = dbHotels.filter(h => h.city?.code === "MED" || h.city?.name.toLowerCase().includes("mad")).map(h => h.name);

    const mekkahList = mekkahDb.length > 0 ? mekkahDb : fallbackHotelsMekkah;
    const madinahList = madinahDb.length > 0 ? madinahDb : fallbackHotelsMadinah;

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    // 1. Create Main Worksheet
    const sheet = workbook.addWorksheet("Template Keberangkatan");

    sheet.columns = [
      // 1. Informasi Utama Paket (Kolom 1 - 11)
      { header: "Kode Paket", key: "kode", width: 20 },
      { header: "Nama Paket", key: "namaPaket", width: 35 },
      { header: "Tanggal Berangkat (YYYY-MM-DD)", key: "tanggalBerangkat", width: 30 },
      { header: "Durasi (Hari)", key: "tanggalPulang", width: 18 },
      { header: "Maskapai", key: "maskapai", width: 22 },
      { header: "Starting Point", key: "startingPoint", width: 22 },
      { header: "Nomor Penerbangan", key: "nomorPenerbangan", width: 20 },
      { header: "Kuota", key: "kuota", width: 12 },
      { header: "Target Materialisasi", key: "targetMaterialisasi", width: 20 },
      { header: "Perlengkapan", key: "perlengkapan", width: 26 },
      { header: "Rute In-Out", key: "ruteInOut", width: 32 },

      // 2. Paket Tanpa Klaster / Reguler (Kolom 12 - 16)
      { header: "[Tanpa Klaster] Harga Base (Rp)", key: "regHargaBase", width: 25 },
      { header: "[Tanpa Klaster] Upgrade Double (Rp)", key: "regUpgradeDouble", width: 28 },
      { header: "[Tanpa Klaster] Upgrade Triple (Rp)", key: "regUpgradeTriple", width: 28 },
      { header: "[Tanpa Klaster] Hotel Mekkah", key: "regHotelMekkah", width: 25 },
      { header: "[Tanpa Klaster] Hotel Madinah", key: "regHotelMadinah", width: 25 },

      // 3. Klaster 1 / Bronze (Kolom 17 - 22)
      { header: "[K1] Nama Klaster", key: "k1Nama", width: 20 },
      { header: "[K1] Harga Base (Rp)", key: "k1HargaBase", width: 22 },
      { header: "[K1] Upgrade Double (Rp)", key: "k1UpgradeDouble", width: 25 },
      { header: "[K1] Upgrade Triple (Rp)", key: "k1UpgradeTriple", width: 25 },
      { header: "[K1] Hotel Mekkah", key: "k1HotelMekkah", width: 25 },
      { header: "[K1] Hotel Madinah", key: "k1HotelMadinah", width: 25 },

      // 4. Klaster 2 / Silver (Kolom 23 - 28)
      { header: "[K2] Nama Klaster", key: "k2Nama", width: 20 },
      { header: "[K2] Harga Base (Rp)", key: "k2HargaBase", width: 22 },
      { header: "[K2] Upgrade Double (Rp)", key: "k2UpgradeDouble", width: 25 },
      { header: "[K2] Upgrade Triple (Rp)", key: "k2UpgradeTriple", width: 25 },
      { header: "[K2] Hotel Mekkah", key: "k2HotelMekkah", width: 25 },
      { header: "[K2] Hotel Madinah", key: "k2HotelMadinah", width: 25 },

      // 5. Klaster 3 / Gold (Kolom 29 - 34)
      { header: "[K3] Nama Klaster", key: "k3Nama", width: 20 },
      { header: "[K3] Harga Base (Rp)", key: "k3HargaBase", width: 22 },
      { header: "[K3] Upgrade Double (Rp)", key: "k3UpgradeDouble", width: 25 },
      { header: "[K3] Upgrade Triple (Rp)", key: "k3UpgradeTriple", width: 25 },
      { header: "[K3] Hotel Mekkah", key: "k3HotelMekkah", width: 25 },
      { header: "[K3] Hotel Madinah", key: "k3HotelMadinah", width: 25 },
    ];

    // Sample Row 1: Paket Tanpa Klaster
    sheet.addRow({
      kode: "KBR-2026-001",
      namaPaket: "PAKET REGULER 10 H - 01 Agt 2026 (SAUDIA AIRLINES)",
      tanggalBerangkat: "2026-08-01",
      tanggalPulang: 10,
      maskapai: airlineList[0] || "Saudia Airlines",
      startingPoint: startingList[0] || "Surabaya (SUB)",
      nomorPenerbangan: "SV-816",
      kuota: 45,
      targetMaterialisasi: 30,
      perlengkapan: perlengkapanList[0] || "Termasuk (Gratis)",
      ruteInOut: routeList[0] || "JED-MED (Jeddah In - Madinah Out)",

      regHargaBase: 25000000,
      regUpgradeDouble: 3500000,
      regUpgradeTriple: 2000000,
      regHotelMekkah: mekkahList[0] || "Safwah Tower",
      regHotelMadinah: madinahList[0] || "Durrat Al Eiman",
    });

    // Sample Row 2: Paket 3-Klaster (Bronze, Silver, Gold)
    sheet.addRow({
      kode: "KBR-2026-002",
      namaPaket: "PAKET VIP 3 KLASTER 10 H - 01 Sep 2026 (SAUDIA AIRLINES)",
      tanggalBerangkat: "2026-09-01",
      tanggalPulang: 10,
      maskapai: airlineList[0] || "Saudia Airlines",
      startingPoint: startingList[0] || "Surabaya (SUB)",
      nomorPenerbangan: "SV-818",
      kuota: 45,
      targetMaterialisasi: 30,
      perlengkapan: perlengkapanList[0] || "Termasuk (Gratis)",
      ruteInOut: routeList[0] || "JED-MED (Jeddah In - Madinah Out)",

      k1Nama: clusterList[0] || "Bronze",
      k1HargaBase: 25000000,
      k1UpgradeDouble: 3500000,
      k1UpgradeTriple: 2000000,
      k1HotelMekkah: mekkahList[0] || "Safwah Tower",
      k1HotelMadinah: madinahList[0] || "Durrat Al Eiman",

      k2Nama: clusterList[1] || "Silver",
      k2HargaBase: 28000000,
      k2UpgradeDouble: 4500000,
      k2UpgradeTriple: 2500000,
      k2HotelMekkah: mekkahList[1] || mekkahList[0] || "Pullman Zamzam",
      k2HotelMadinah: madinahList[1] || madinahList[0] || "Ansar Palace",

      k3Nama: clusterList[2] || "Gold",
      k3HargaBase: 32000000,
      k3UpgradeDouble: 6000000,
      k3UpgradeTriple: 3500000,
      k3HotelMekkah: mekkahList[2] || mekkahList[0] || "Fairmont Tower",
      k3HotelMadinah: madinahList[2] || madinahList[0] || "Oberoi Madinah",
    });

    // Header styling per section color
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;

    for (let col = 1; col <= 34; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      let fgColor = "FF059669"; // Default Emerald (Informasi Utama 1-11)
      if (col >= 12 && col <= 16) {
        fgColor = "FF334155"; // Dark Slate Gray (Tanpa Klaster)
      } else if (col >= 17 && col <= 22) {
        fgColor = "FF92400E"; // Bronze Brown (Klaster 1)
      } else if (col >= 23 && col <= 28) {
        fgColor = "FF475569"; // Cool Silver Gray (Klaster 2)
      } else if (col >= 29 && col <= 34) {
        fgColor = "FFD97706"; // Amber Gold (Klaster 3)
      }

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fgColor },
      };
    }

    // 2. Create Hidden Worksheet for Master Data Lookups
    const lookupSheet = workbook.addWorksheet("MasterData");
    lookupSheet.state = "hidden";

    const maxLookupRows = Math.max(
      airlineList.length,
      startingList.length,
      mekkahList.length,
      madinahList.length,
      clusterList.length,
      perlengkapanList.length,
      routeList.length
    );

    for (let i = 0; i < maxLookupRows; i++) {
      lookupSheet.addRow([
        airlineList[i] || "",
        startingList[i] || "",
        mekkahList[i] || "",
        madinahList[i] || "",
        clusterList[i] || "",
        perlengkapanList[i] || "",
        routeList[i] || "",
      ]);
    }

    // Formulas for Data Validation ranges
    const airlineRef = `MasterData!$A$1:$A$${airlineList.length}`;
    const startingRef = `MasterData!$B$1:$B$${startingList.length}`;
    const mekkahRef = `MasterData!$C$1:$C$${mekkahList.length}`;
    const madinahRef = `MasterData!$D$1:$D$${madinahList.length}`;
    const clusterRef = `MasterData!$E$1:$E$${clusterList.length}`;
    const perlengkapanRef = `MasterData!$F$1:$F$${perlengkapanList.length}`;
    const routeRef = `MasterData!$G$1:$G$${routeList.length}`;

    // Apply Data Validation (Dropdown lists) for data rows 2 to 100
    for (let r = 2; r <= 100; r++) {
      // Maskapai (Col 5)
      sheet.getCell(r, 5).dataValidation = { type: "list", allowBlank: true, formulae: [airlineRef] };
      // Starting Point (Col 6)
      sheet.getCell(r, 6).dataValidation = { type: "list", allowBlank: true, formulae: [startingRef] };
      // Perlengkapan (Col 10)
      sheet.getCell(r, 10).dataValidation = { type: "list", allowBlank: true, formulae: [perlengkapanRef] };
      // Rute In-Out (Col 11)
      sheet.getCell(r, 11).dataValidation = { type: "list", allowBlank: true, formulae: [routeRef] };

      // [Tanpa Klaster] Hotel Mekkah (Col 15) & Hotel Madinah (Col 16)
      sheet.getCell(r, 15).dataValidation = { type: "list", allowBlank: true, formulae: [mekkahRef] };
      sheet.getCell(r, 16).dataValidation = { type: "list", allowBlank: true, formulae: [madinahRef] };

      // [K1] Nama Klaster (Col 17), Hotel Mekkah (Col 21), Hotel Madinah (Col 22)
      sheet.getCell(r, 17).dataValidation = { type: "list", allowBlank: true, formulae: [clusterRef] };
      sheet.getCell(r, 21).dataValidation = { type: "list", allowBlank: true, formulae: [mekkahRef] };
      sheet.getCell(r, 22).dataValidation = { type: "list", allowBlank: true, formulae: [madinahRef] };

      // [K2] Nama Klaster (Col 23), Hotel Mekkah (Col 27), Hotel Madinah (Col 28)
      sheet.getCell(r, 23).dataValidation = { type: "list", allowBlank: true, formulae: [clusterRef] };
      sheet.getCell(r, 27).dataValidation = { type: "list", allowBlank: true, formulae: [mekkahRef] };
      sheet.getCell(r, 28).dataValidation = { type: "list", allowBlank: true, formulae: [madinahRef] };

      // [K3] Nama Klaster (Col 29), Hotel Mekkah (Col 33), Hotel Madinah (Col 34)
      sheet.getCell(r, 29).dataValidation = { type: "list", allowBlank: true, formulae: [clusterRef] };
      sheet.getCell(r, 33).dataValidation = { type: "list", allowBlank: true, formulae: [mekkahRef] };
      sheet.getCell(r, 34).dataValidation = { type: "list", allowBlank: true, formulae: [madinahRef] };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template_import_keberangkatan.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("[TEMPLATE DOWNLOAD ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal membuat template Excel" }, { status: 500 });
  }
}
