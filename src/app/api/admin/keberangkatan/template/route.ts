import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template Keberangkatan");

    sheet.columns = [
      // 1. Informasi Utama Paket (Kolom 1 - 8)
      { header: "Kode Paket", key: "kode", width: 20 },
      { header: "Nama Paket", key: "namaPaket", width: 35 },
      { header: "Tanggal Berangkat (YYYY-MM-DD)", key: "tanggalBerangkat", width: 30 },
      { header: "Tanggal Pulang (YYYY-MM-DD)", key: "tanggalPulang", width: 30 },
      { header: "Maskapai", key: "maskapai", width: 20 },
      { header: "Nomor Penerbangan", key: "nomorPenerbangan", width: 20 },
      { header: "Kuota", key: "kuota", width: 12 },
      { header: "Target Materialisasi", key: "targetMaterialisasi", width: 20 },

      // 2. Paket Tanpa Klaster / Reguler (Kolom 9 - 13)
      { header: "[Tanpa Klaster] Harga Base (Rp)", key: "regHargaBase", width: 25 },
      { header: "[Tanpa Klaster] Upgrade Double (Rp)", key: "regUpgradeDouble", width: 28 },
      { header: "[Tanpa Klaster] Upgrade Triple (Rp)", key: "regUpgradeTriple", width: 28 },
      { header: "[Tanpa Klaster] Hotel Mekkah", key: "regHotelMekkah", width: 25 },
      { header: "[Tanpa Klaster] Hotel Madinah", key: "regHotelMadinah", width: 25 },

      // 3. Klaster 1 / Bronze (Kolom 14 - 19)
      { header: "[K1] Nama Klaster", key: "k1Nama", width: 20 },
      { header: "[K1] Harga Base (Rp)", key: "k1HargaBase", width: 22 },
      { header: "[K1] Upgrade Double (Rp)", key: "k1UpgradeDouble", width: 25 },
      { header: "[K1] Upgrade Triple (Rp)", key: "k1UpgradeTriple", width: 25 },
      { header: "[K1] Hotel Mekkah", key: "k1HotelMekkah", width: 25 },
      { header: "[K1] Hotel Madinah", key: "k1HotelMadinah", width: 25 },

      // 4. Klaster 2 / Silver (Kolom 20 - 25)
      { header: "[K2] Nama Klaster", key: "k2Nama", width: 20 },
      { header: "[K2] Harga Base (Rp)", key: "k2HargaBase", width: 22 },
      { header: "[K2] Upgrade Double (Rp)", key: "k2UpgradeDouble", width: 25 },
      { header: "[K2] Upgrade Triple (Rp)", key: "k2UpgradeTriple", width: 25 },
      { header: "[K2] Hotel Mekkah", key: "k2HotelMekkah", width: 25 },
      { header: "[K2] Hotel Madinah", key: "k2HotelMadinah", width: 25 },

      // 5. Klaster 3 / Gold (Kolom 26 - 31)
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
      tanggalPulang: "2026-08-10",
      maskapai: "Saudia Airlines",
      nomorPenerbangan: "SV-816",
      kuota: 45,
      targetMaterialisasi: 30,

      regHargaBase: 25000000,
      regUpgradeDouble: 3500000,
      regUpgradeTriple: 2000000,
      regHotelMekkah: "Safwah Tower",
      regHotelMadinah: "Durrat Al Eiman",
    });

    // Sample Row 2: Paket 3-Klaster (Bronze, Silver, Gold)
    sheet.addRow({
      kode: "KBR-2026-002",
      namaPaket: "PAKET VIP 3 KLASTER 10 H - 01 Sep 2026 (SAUDIA AIRLINES)",
      tanggalBerangkat: "2026-09-01",
      tanggalPulang: "2026-09-10",
      maskapai: "Saudia Airlines",
      nomorPenerbangan: "SV-818",
      kuota: 45,
      targetMaterialisasi: 30,

      k1Nama: "Bronze",
      k1HargaBase: 25000000,
      k1UpgradeDouble: 3500000,
      k1UpgradeTriple: 2000000,
      k1HotelMekkah: "Safwah Tower",
      k1HotelMadinah: "Durrat Al Eiman",

      k2Nama: "Silver",
      k2HargaBase: 28000000,
      k2UpgradeDouble: 4500000,
      k2UpgradeTriple: 2500000,
      k2HotelMekkah: "Pullman Zamzam",
      k2HotelMadinah: "Ansar Palace",

      k3Nama: "Gold",
      k3HargaBase: 32000000,
      k3UpgradeDouble: 6000000,
      k3UpgradeTriple: 3500000,
      k3HotelMekkah: "Fairmont Tower",
      k3HotelMadinah: "Oberoi Madinah",
    });

    // Header styling per section color
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;

    for (let col = 1; col <= 31; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      let fgColor = "FF059669"; // Default Emerald (Informasi Utama A-H)
      if (col >= 9 && col <= 13) {
        fgColor = "FF334155"; // Dark Slate Gray (Tanpa Klaster)
      } else if (col >= 14 && col <= 19) {
        fgColor = "FF92400E"; // Bronze Brown (Klaster 1)
      } else if (col >= 20 && col <= 25) {
        fgColor = "FF475569"; // Cool Silver Gray (Klaster 2)
      } else if (col >= 26 && col <= 31) {
        fgColor = "FFD97706"; // Amber Gold (Klaster 3)
      }

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fgColor },
      };
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
