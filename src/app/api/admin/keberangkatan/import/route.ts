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

function parseExcelSerialDate(serial: number): Date | null {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const dateInfo = new Date(utcValue);
  return isNaN(dateInfo.getTime()) ? null : dateInfo;
}

function parseDateString(str?: string): Date | null {
  if (!str) return null;
  const clean = str.trim();
  if (!clean) return null;

  // ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // Indonesian / European format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // Short year format DD/MM/YY or DD-MM-YY
  const dmyShortMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})$/);
  if (dmyShortMatch && dmyShortMatch[1] && dmyShortMatch[2] && dmyShortMatch[3]) {
    const d = parseInt(dmyShortMatch[1], 10);
    const m = parseInt(dmyShortMatch[2], 10) - 1;
    let y = parseInt(dmyShortMatch[3], 10);
    y += y < 50 ? 2000 : 1900;
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // Text month format e.g. "06 Sep 2026", "15 September 2026"
  const MONTH_NAMES: Record<string, number> = {
    jan: 0, januari: 0, january: 0,
    feb: 1, februari: 1, february: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agu: 7, agustus: 7, aug: 7, august: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9, oct: 9, october: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11, december: 11,
  };

  const textMonthMatch = clean.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (textMonthMatch && textMonthMatch[1] && textMonthMatch[2] && textMonthMatch[3]) {
    const d = parseInt(textMonthMatch[1], 10);
    const mStr = textMonthMatch[2].toLowerCase();
    const y = parseInt(textMonthMatch[3], 10);
    if (mStr in MONTH_NAMES && MONTH_NAMES[mStr] !== undefined) {
      const date = new Date(y, MONTH_NAMES[mStr]!, d);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  // Native Date constructor fallback
  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function parseExcelDate(cell: any): Date | null {
  if (!cell) return null;
  const val = cell.value;

  // 1. Direct Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // 2. Formula object with Date/number result
  if (val && typeof val === "object" && "result" in val) {
    if (val.result instanceof Date) return isNaN(val.result.getTime()) ? null : val.result;
    if (typeof val.result === "number") return parseExcelSerialDate(val.result);
    if (typeof val.result === "string") return parseDateString(val.result);
  }

  // 3. Excel serial number (e.g. 46271)
  if (typeof val === "number" && val > 10000 && val < 100000) {
    return parseExcelSerialDate(val);
  }

  // 4. Formatted string or raw value string
  const strVal = String(cell.text || cell.value || "").trim();
  if (!strVal) return null;

  return parseDateString(strVal);
}

function extractDurationFromText(text?: string): number {
  if (!text) return 12;
  const matchH = text.match(/(\d{1,2})\s*(?:h|hari|day|days)\b/i);
  if (matchH && matchH[1]) {
    const days = parseInt(matchH[1], 10);
    if (days >= 3 && days <= 40) return days;
  }
  const matchNum = text.match(/\b(\d{1,2})\b/);
  if (matchNum && matchNum[1]) {
    const days = parseInt(matchNum[1], 10);
    if (days >= 3 && days <= 40) return days;
  }
  return 12;
}

function parseDurationOrDate(cell: any, departureDate: Date, rawNamaPaket: string): { returnDate: Date; durationDays: number } {
  const parsedDate = parseExcelDate(cell);
  if (parsedDate && parsedDate.getTime() > departureDate.getTime()) {
    const diffMs = parsedDate.getTime() - departureDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { returnDate: parsedDate, durationDays: diffDays > 0 ? diffDays : 12 };
  }

  const cellStr = String(cell?.text || cell?.value || "").trim();
  let duration = extractDurationFromText(cellStr);

  if (!duration || duration === 12) {
    const titleDuration = extractDurationFromText(rawNamaPaket);
    if (titleDuration && titleDuration !== 12) {
      duration = titleDuration;
    }
  }

  const retDate = new Date(departureDate.getTime());
  retDate.setDate(retDate.getDate() + duration);

  return { returnDate: retDate, durationDays: duration };
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

    // Prefetch Master Data for ID Resolution
    const [allAirlines, allCities] = await Promise.all([
      prisma.masterAirline.findMany({ where: { isActive: true } }),
      prisma.masterCity.findMany({ where: { isActive: true } }),
    ]);

    const findAirlineId = (nameOrCode?: string): string | undefined => {
      if (!nameOrCode) return undefined;
      const clean = nameOrCode.trim().toLowerCase();
      const match = allAirlines.find(
        (a) => a.name.toLowerCase() === clean || a.code.toLowerCase() === clean
      );
      return match?.id;
    };

    const findStartingPointId = (nameOrCode?: string): string | undefined => {
      if (!nameOrCode) return undefined;
      const clean = nameOrCode.trim().toLowerCase();
      const match = allCities.find(
        (c) =>
          clean.includes(c.name.toLowerCase()) ||
          clean.includes(c.code.toLowerCase()) ||
          c.name.toLowerCase().includes(clean)
      );
      return match?.id;
    };

    let createdCount = 0;
    const errors: string[] = [];

    // Row 1 is header, data starts at row 2
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (!row || row.cellCount === 0) continue;

      const rawKode = row.getCell(1).text?.trim();
      const rawNamaPaket = row.getCell(2).text?.trim();

      if (!rawKode || !rawNamaPaket) continue; // Skip empty/invalid rows

      // Smart format detection (33-col new format vs 32-col format vs 11-col legacy format)
      const cell3Text = row.getCell(3).text?.trim();
      const isLegacyFormat = /^\d+$/.test(cell3Text?.replace(/[^0-9]/g, "") || "") && cell3Text.length > 5;

      let rawMaskapai: string;
      let rawStartingPoint: string | undefined;
      let rawNomorPenerbangan: string;
      let rawKuota: number;
      let rawTargetMaterialisasi: number;
      let rawPerlengkapan: string | undefined;
      let rawRute: string | undefined;
      let legacyHargaBase = 0;
      let legacyHotelMekkah = "";
      let legacyHotelMadinah = "";
      let regColOffset = 0; // 0 for legacy/32-col, 1 for 33-col, 2 for 34-col format

      let cellBerangkat = isLegacyFormat ? row.getCell(4) : row.getCell(3);
      let cellPulang = isLegacyFormat ? row.getCell(5) : row.getCell(4);

      if (isLegacyFormat) {
        // Legacy 11-column format
        legacyHargaBase = parseNum(row.getCell(3).text);
        rawMaskapai = row.getCell(6).text?.trim();
        rawNomorPenerbangan = row.getCell(7).text?.trim();
        legacyHotelMekkah = row.getCell(8).text?.trim();
        legacyHotelMadinah = row.getCell(9).text?.trim();
        rawKuota = parseNum(row.getCell(10).text, 45);
        rawTargetMaterialisasi = parseNum(row.getCell(11).text, 30);
      } else {
        // Modern format with Starting Point
        rawMaskapai = row.getCell(5).text?.trim();
        rawStartingPoint = row.getCell(6).text?.trim();
        rawNomorPenerbangan = row.getCell(7).text?.trim();
        rawKuota = parseNum(row.getCell(8).text, 45);
        rawTargetMaterialisasi = parseNum(row.getCell(9).text, 30);

        // Detect Col 10 (Perlengkapan) & Col 11 (Rute In-Out) vs RegHargaBase
        const cell10Text = row.getCell(10).text?.trim();
        const cell11Text = row.getCell(11).text?.trim();
        const cell12Text = row.getCell(12).text?.trim();

        const cell10Num = parseNum(cell10Text);
        const cell11Num = parseNum(cell11Text);
        const cell12Num = parseNum(cell12Text);

        if (cell10Text && (cell10Num < 100000 || cell12Num > 100000)) {
          // Col 10 is Perlengkapan
          rawPerlengkapan = cell10Text;
          regColOffset = 1;

          if (cell11Text && (cell11Num < 100000 || cell12Num > 100000)) {
            // Col 11 is Rute In-Out (34-col format)
            rawRute = cell11Text;
            regColOffset = 2;
          }
        }
      }

      // Validate departure date & dynamically auto-calculate return date (via date, duration number, or package title)
      let departureDate: Date;
      let returnDate: Date;
      try {
        const parsedDep = parseExcelDate(cellBerangkat);
        if (!parsedDep) {
          throw new Error("Format tanggal keberangkatan tidak valid. Gunakan YYYY-MM-DD atau DD/MM/YYYY.");
        }
        departureDate = parsedDep;

        const { returnDate: calcRet } = parseDurationOrDate(cellPulang, departureDate, rawNamaPaket);
        returnDate = calcRet;
      } catch (err: any) {
        errors.push(`Baris ${rowNumber}: ${err.message}`);
        continue;
      }

      // Resolve IDs from Master Data
      const maskapaiId = findAirlineId(rawMaskapai);
      const startingPointId = findStartingPointId(rawStartingPoint);

      // Process Clusters (K1, K2, K3) if available
      const hotelOptions: any[] = [];
      if (!isLegacyFormat) {
        const clusterCols = [
          { nameCol: 15 + regColOffset, priceCol: 16 + regColOffset, doubleCol: 17 + regColOffset, tripleCol: 18 + regColOffset, mekkahCol: 19 + regColOffset, madinahCol: 20 + regColOffset, defaultName: "Bronze" },
          { nameCol: 21 + regColOffset, priceCol: 22 + regColOffset, doubleCol: 23 + regColOffset, tripleCol: 24 + regColOffset, mekkahCol: 25 + regColOffset, madinahCol: 26 + regColOffset, defaultName: "Silver" },
          { nameCol: 27 + regColOffset, priceCol: 28 + regColOffset, doubleCol: 29 + regColOffset, tripleCol: 30 + regColOffset, mekkahCol: 31 + regColOffset, madinahCol: 32 + regColOffset, defaultName: "Gold" },
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
          const regPrice = parseNum(row.getCell(10 + regColOffset).text);
          const regDouble = parseNum(row.getCell(11 + regColOffset).text);
          const regTriple = parseNum(row.getCell(12 + regColOffset).text);
          const regMekkah = row.getCell(13 + regColOffset).text?.trim();
          const regMadinah = row.getCell(14 + regColOffset).text?.trim();

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
      const mekkahNames = Array.from(new Set(hotelOptions.map((o) => o.hotelMekkah).filter((h) => h && h !== "TBA")));
      const madinahNames = Array.from(new Set(hotelOptions.map((o) => o.hotelMadinah).filter((h) => h && h !== "TBA")));

      const summaryHotelMekkah = mekkahNames.length > 0 ? mekkahNames.join(" / ") : "TBA";
      const summaryHotelMadinah = madinahNames.length > 0 ? madinahNames.join(" / ") : "TBA";
      const pricingMode = hotelOptions.length > 1 ? "TIER" : "SINGLE";

      const includeList: string[] = [];
      if (rawPerlengkapan) {
        includeList.push(`Perlengkapan: ${rawPerlengkapan}`);
      }
      if (rawRute) {
        includeList.push(`Rute In-Out: ${rawRute}`);
      }

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
            maskapaiId: maskapaiId || null,
            startingPointId: startingPointId || null,
            nomorPenerbangan: rawNomorPenerbangan || "SV-816",
            hotelMekkah: summaryHotelMekkah,
            hotelMadinah: summaryHotelMadinah,
            hotelOptions: hotelOptions,
            include: includeList,
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
