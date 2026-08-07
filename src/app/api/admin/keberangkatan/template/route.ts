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
      { header: "Kode Paket", key: "kode", width: 20 },
      { header: "Nama Paket", key: "namaPaket", width: 40 },
      { header: "Harga Paket (Rp)", key: "hargaPaket", width: 18 },
      { header: "Tanggal Berangkat (YYYY-MM-DD)", key: "tanggalBerangkat", width: 30 },
      { header: "Tanggal Pulang (YYYY-MM-DD)", key: "tanggalPulang", width: 30 },
      { header: "Maskapai", key: "maskapai", width: 20 },
      { header: "Nomor Penerbangan", key: "nomorPenerbangan", width: 20 },
      { header: "Hotel Mekkah", key: "hotelMekkah", width: 25 },
      { header: "Hotel Madinah", key: "hotelMadinah", width: 25 },
      { header: "Kuota", key: "kuota", width: 10 },
      { header: "Target Materialisasi", key: "targetMaterialisasi", width: 20 },
    ];

    sheet.addRows([
      {
        kode: "KBR-2026-001",
        namaPaket: "PAKET UMROH 10 H SBY (JED.C-M) - 01 Agt 2026 (SAUDIA AIRLINES)",
        hargaPaket: 25000000,
        tanggalBerangkat: "2026-08-01",
        tanggalPulang: "2026-08-10",
        maskapai: "Saudia Airlines",
        nomorPenerbangan: "SV-816",
        hotelMekkah: "Safwah Tower",
        hotelMadinah: "Durrat Al Eiman",
        kuota: 45,
        targetMaterialisasi: 30,
      },
    ]);

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }; // Emerald green color

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
