import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const perm = checkServerPermission(session, "keberangkatan", "create");
    if (!perm.allowed) {
      return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "File Excel tidak ditemukan" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ success: false, message: "Sheet Excel kosong" }, { status: 400 });
    }

    let createdCount = 0;
    const errors: string[] = [];

    // Row 1 is header, data starts at row 2
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (!row || row.cellCount === 0) continue;

      const rawKode = row.getCell(1).text?.trim();
      const rawNamaPaket = row.getCell(2).text?.trim();
      const rawHargaPaket = parseInt(row.getCell(3).text?.replace(/[^0-9]/g, "") || "0", 10);
      const rawTanggalBerangkat = row.getCell(4).text?.trim();
      const rawTanggalPulang = row.getCell(5).text?.trim();
      const rawMaskapai = row.getCell(6).text?.trim();
      const rawNomorPenerbangan = row.getCell(7).text?.trim();
      const rawHotelMekkah = row.getCell(8).text?.trim();
      const rawHotelMadinah = row.getCell(9).text?.trim();
      const rawKuota = parseInt(row.getCell(10).text?.replace(/[^0-9]/g, "") || "45", 10);
      const rawTargetMaterialisasi = parseInt(row.getCell(11).text?.replace(/[^0-9]/g, "") || "30", 10);

      if (!rawKode || !rawNamaPaket) continue; // Skip empty/invalid rows

      // Validate dates
      let departureDate: Date;
      let returnDate: Date;
      try {
        departureDate = new Date(rawTanggalBerangkat);
        returnDate = new Date(rawTanggalPulang);
        if (isNaN(departureDate.getTime()) || isNaN(returnDate.getTime())) {
          throw new Error("Format tanggal keberangkatan atau kepulangan tidak valid. Gunakan YYYY-MM-DD.");
        }
      } catch (err: any) {
        errors.push(`Baris ${rowNumber}: ${err.message}`);
        continue;
      }

      // Initialize hotel options
      const hotelOptions = [
        {
          clusterName: "Reguler",
          hotelMekkah: rawHotelMekkah || "TBA",
          hotelMadinah: rawHotelMadinah || "TBA",
          hargaBase: rawHargaPaket,
        }
      ];

      try {
        await prisma.keberangkatan.create({
          data: {
            kode: rawKode,
            kodeIndividu: rawKode,
            namaPaket: rawNamaPaket,
            hargaPaket: rawHargaPaket,
            tanggalBerangkat: departureDate,
            tanggalPulang: returnDate,
            maskapai: rawMaskapai || "Saudia Airlines",
            nomorPenerbangan: rawNomorPenerbangan || "SV-816",
            hotelMekkah: rawHotelMekkah || "TBA",
            hotelMadinah: rawHotelMadinah || "TBA",
            hotelOptions: hotelOptions,
            kuota: rawKuota,
            maxSeat: rawKuota,
            targetMaterialisasi: rawTargetMaterialisasi,
            terisi: 0,
            status: "scheduled",
          },
        });
        createdCount++;
      } catch (err: any) {
        errors.push(`Baris ${rowNumber}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${createdCount} paket keberangkatan.`,
      createdCount,
      errors,
    });
  } catch (error: any) {
    console.error("[EXCEL IMPORT ERROR]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
