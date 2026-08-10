import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { prisma } from "@/server/db";

function parseNum(val: any, defaultVal = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const str = String(val).replace(/[^0-9]/g, "");
  return str ? parseInt(str, 10) : defaultVal;
}

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

      if (!rawKode || !rawNamaPaket) continue; // Skip empty/invalid rows

      // Smart format detection (31-column new format vs 11-column legacy format)
      const cell3Text = row.getCell(3).text?.trim();
      const isLegacyFormat = /^\d+$/.test(cell3Text?.replace(/[^0-9]/g, "") || "") && cell3Text.length > 5;

      let rawTanggalBerangkat: string;
      let rawTanggalPulang: string;
      let rawMaskapai: string;
      let rawNomorPenerbangan: string;
      let rawKuota: number;
      let rawTargetMaterialisasi: number;
      let legacyHargaBase = 0;
      let legacyHotelMekkah = "";
      let legacyHotelMadinah = "";

      if (isLegacyFormat) {
        // Legacy 11-column format
        legacyHargaBase = parseNum(row.getCell(3).text);
        rawTanggalBerangkat = row.getCell(4).text?.trim();
        rawTanggalPulang = row.getCell(5).text?.trim();
        rawMaskapai = row.getCell(6).text?.trim();
        rawNomorPenerbangan = row.getCell(7).text?.trim();
        legacyHotelMekkah = row.getCell(8).text?.trim();
        legacyHotelMadinah = row.getCell(9).text?.trim();
        rawKuota = parseNum(row.getCell(10).text, 45);
        rawTargetMaterialisasi = parseNum(row.getCell(11).text, 30);
      } else {
        // New 31-column format
        rawTanggalBerangkat = row.getCell(3).text?.trim();
        rawTanggalPulang = row.getCell(4).text?.trim();
        rawMaskapai = row.getCell(5).text?.trim();
        rawNomorPenerbangan = row.getCell(6).text?.trim();
        rawKuota = parseNum(row.getCell(7).text, 45);
        rawTargetMaterialisasi = parseNum(row.getCell(8).text, 30);
      }

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

      // Process Clusters (K1, K2, K3) if available
      const hotelOptions: any[] = [];
      if (!isLegacyFormat) {
        const clusterCols = [
          { nameCol: 14, priceCol: 15, doubleCol: 16, tripleCol: 17, mekkahCol: 18, madinahCol: 19, defaultName: "Bronze" },
          { nameCol: 20, priceCol: 21, doubleCol: 22, tripleCol: 23, mekkahCol: 24, madinahCol: 25, defaultName: "Silver" },
          { nameCol: 26, priceCol: 27, doubleCol: 28, tripleCol: 29, mekkahCol: 30, madinahCol: 31, defaultName: "Gold" },
        ];

        for (const c of clusterCols) {
          const cName = row.getCell(c.nameCol).text?.trim();
          const cPrice = parseNum(row.getCell(c.priceCol).text);
          const cDouble = parseNum(row.getCell(c.doubleCol).text);
          const cTriple = parseNum(row.getCell(c.tripleCol).text);
          const cMekkah = row.getCell(c.mekkahCol).text?.trim();
          const cMadinah = row.getCell(c.madinahCol).text?.trim();

          if (cName || cPrice > 0 || cMekkah || cMadinah) {
            hotelOptions.push({
              clusterName: cName || c.defaultName,
              hargaBase: cPrice,
              upgradeDouble: cDouble,
              upgradeTriple: cTriple,
              hotelMekkah: cMekkah || "TBA",
              hotelMadinah: cMadinah || "TBA",
            });
          }
        }
      }

      // Fallback to Reguler (Tanpa Klaster) if no K1-K3 clusters were filled
      if (hotelOptions.length === 0) {
        if (isLegacyFormat) {
          hotelOptions.push({
            clusterName: "Reguler",
            hargaBase: legacyHargaBase,
            upgradeDouble: 0,
            upgradeTriple: 0,
            hotelMekkah: legacyHotelMekkah || "TBA",
            hotelMadinah: legacyHotelMadinah || "TBA",
          });
        } else {
          const regPrice = parseNum(row.getCell(9).text);
          const regDouble = parseNum(row.getCell(10).text);
          const regTriple = parseNum(row.getCell(11).text);
          const regMekkah = row.getCell(12).text?.trim();
          const regMadinah = row.getCell(13).text?.trim();

          hotelOptions.push({
            clusterName: "Reguler",
            hargaBase: regPrice,
            upgradeDouble: regDouble,
            upgradeTriple: regTriple,
            hotelMekkah: regMekkah || "TBA",
            hotelMadinah: regMadinah || "TBA",
          });
        }
      }

      // Calculate summary fields
      const basePrice = hotelOptions[0]?.hargaBase || 0;
      const mekkahNames = Array.from(new Set(hotelOptions.map(o => o.hotelMekkah).filter(h => h && h !== "TBA")));
      const madinahNames = Array.from(new Set(hotelOptions.map(o => o.hotelMadinah).filter(h => h && h !== "TBA")));

      const summaryHotelMekkah = mekkahNames.length > 0 ? mekkahNames.join(" / ") : "TBA";
      const summaryHotelMadinah = madinahNames.length > 0 ? madinahNames.join(" / ") : "TBA";
      const pricingMode = hotelOptions.length > 1 ? "TIER" : "SINGLE";

      try {
        await prisma.keberangkatan.create({
          data: {
            kode: rawKode,
            kodeIndividu: rawKode,
            namaPaket: rawNamaPaket,
            hargaPaket: basePrice,
            tanggalBerangkat: departureDate,
            tanggalPulang: returnDate,
            maskapai: rawMaskapai || "Saudia Airlines",
            nomorPenerbangan: rawNomorPenerbangan || "SV-816",
            hotelMekkah: summaryHotelMekkah,
            hotelMadinah: summaryHotelMadinah,
            hotelOptions: hotelOptions,
            pricingMode: pricingMode as any,
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
