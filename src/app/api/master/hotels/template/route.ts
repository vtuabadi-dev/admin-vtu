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
    const sheet = workbook.addWorksheet("Master Hotel");

    sheet.columns = [
      { header: "Nama Hotel", key: "nama", width: 30 },
      { header: "Kota Lokasi", key: "kota", width: 20 },
      { header: "Rating Bintang", key: "bintang", width: 15 },
      { header: "Jarak ke Pelataran", key: "jarakText", width: 25 },
    ];

    sheet.addRows([
      { nama: "Safwa Tower Makkah", kota: "Makkah", bintang: 5, jarakText: "100 meter" },
      { nama: "Dar Al-Taqwa Madinah", kota: "Madinah", bintang: 5, jarakText: "150 meter" },
      { nama: "Movenpick Anwar Madinah", kota: "Madinah", bintang: 5, jarakText: "200 meter" },
      { nama: "Crown Plaza Jeddah", kota: "Jeddah", bintang: 4, jarakText: "-" },
    ]);

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7 text-sky-600" } };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template_import_hotel.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("[TEMPLATE DOWNLOAD ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal membuat template Excel" }, { status: 500 });
  }
}
