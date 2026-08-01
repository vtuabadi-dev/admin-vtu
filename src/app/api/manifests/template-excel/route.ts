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
    const sheet = workbook.addWorksheet("Manifest Jamaah");

    sheet.columns = [
      { header: "KELUARGA/ROMBONGAN", key: "rombongan", width: 42 },
      { header: "NO JAMAAH", key: "noJamaah", width: 14 },
      { header: "ID REGISTER", key: "idRegister", width: 16 },
      { header: "NO ID (*)", key: "noId", width: 22 },
      { header: "JENIS IDENTITAS (*)", key: "jenisIdentitas", width: 20 },
      { header: "NAMA", key: "nama", width: 30 },
      { header: "HOTEL MAKKAH", key: "hotelMekkah", width: 25 },
      { header: "HOTEL MADINAH", key: "hotelMadinah", width: 25 },
      { header: "KAMAR", key: "kamar", width: 20 },
      { header: "JK (*)", key: "jenisKelamin", width: 10 },
      { header: "TEMPAT LAHIR (*)", key: "tempatLahir", width: 20 },
      { header: "TGL LAHIR (*)", key: "tanggalLahir", width: 16 },
      { header: "STATUS MENIKAH", key: "statusMenikah", width: 18 },
      { header: "NO TELP/HP", key: "noTelp", width: 18 },
      { header: "KOTA/KAB (*)", key: "kota", width: 24 },
      { header: "PULAU (*)", key: "pulau", width: 18 },
      { header: "ALAMAT", key: "alamat", width: 35 },
    ];

    // Sample data matching Excel screenshot 6
    sheet.addRows([
      {
        rombongan: "2 PAX UPGRADE DOUBLE + PLATINUM (38.900) 11/03/2026",
        noJamaah: 1,
        idRegister: "2980-1",
        noId: "3172045303990006",
        jenisIdentitas: "KTP",
        nama: "FARHAH KAMILAH",
        hotelMekkah: "Safwah Tower",
        hotelMadinah: "Durrat Al Eiman",
        kamar: "UPGRADE DOUBLE",
        jenisKelamin: "P",
        tempatLahir: "JAKARTA",
        tanggalLahir: "03/03/1999",
        statusMenikah: "Belum Menikah",
        noTelp: "081234567890",
        kota: "JAKARTA SELATAN",
        pulau: "JAWA",
        alamat: "Jl. Tebet Raya No. 45, Jakarta Selatan",
      },
      {
        rombongan: "2 PAX UPGRADE DOUBLE + PLATINUM (38.900) 11/03/2026",
        noJamaah: 2,
        idRegister: "2980-2",
        noId: "3175061707000015",
        jenisIdentitas: "KTP",
        nama: "SAMSURYA GANDI",
        hotelMekkah: "Safwah Tower",
        hotelMadinah: "Durrat Al Eiman",
        kamar: "UPGRADE DOUBLE",
        jenisKelamin: "L",
        tempatLahir: "JAKARTA",
        tanggalLahir: "17/07/2000",
        statusMenikah: "Belum Menikah",
        noTelp: "081987654321",
        kota: "JAKARTA SELATAN",
        pulau: "JAWA",
        alamat: "Jl. Tebet Raya No. 45, Jakarta Selatan",
      },
      {
        rombongan: "1 PAX QUAD FAMILY + PLATINUM (38.900) 12/03/2026",
        noJamaah: 3,
        idRegister: "2981",
        noId: "A1234567",
        jenisIdentitas: "PASPOR",
        nama: "Ahmad Zaki",
        hotelMekkah: "Safwah Tower",
        hotelMadinah: "Durrat Al Eiman",
        kamar: "QUAD FAMILY",
        jenisKelamin: "L",
        tempatLahir: "SURABAYA",
        tanggalLahir: "15/05/1992",
        statusMenikah: "Menikah",
        noTelp: "081122334455",
        kota: "KOTA SURABAYA",
        pulau: "JAWA",
        alamat: "Jl. Pemuda No. 12, Surabaya",
      },
    ]);

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } }; // Amber 900
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Manifest_Jamaah_VTU.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("[MANIFEST TEMPLATE DOWNLOAD ERROR]", error);
    return NextResponse.json({ success: false, message: "Gagal membuat template Excel" }, { status: 500 });
  }
}
