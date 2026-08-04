import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { masterDataService } from "@/server/services/master-data.service";
import { hotelCityRepo } from "@/server/repositories/master/hotel-city.repository";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const perm = checkServerPermission(session, "sistem", "create");
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

    // Get all hotel cities for matching
    const existingCitiesRes = await hotelCityRepo.findAll({ limit: 200 });
    const citiesMap = new Map<string, string>(); // lowercase name -> id
    existingCitiesRes.data.forEach((c) => citiesMap.set(c.name.toLowerCase().trim(), c.id));

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Row 1 is header, data starts at row 2
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (!row || row.cellCount === 0) continue;

      const rawNama = row.getCell(1).text?.trim();
      const rawKota = row.getCell(2).text?.trim();
      const rawBintang = row.getCell(3).text?.trim();
      const rawJarak = row.getCell(4).text?.trim();

      if (!rawNama) continue; // Skip empty rows

      try {
        // Resolve or create City ID
        const cityName = rawKota || "Makkah";
        const cityKey = cityName.toLowerCase().trim();
        let cityId = citiesMap.get(cityKey);

        if (!cityId) {
          // Auto create city
          const cleanCode = `CTY-${cityName.toUpperCase().replace(/[^A-Z0-9]/g, "-").substring(0, 5)}`;
          const newCity = await hotelCityRepo.create({
            name: cityName,
            code: cleanCode,
            isActive: true,
          });
          cityId = newCity.id;
          citiesMap.set(cityKey, cityId);
        }

        // Parse star rating
        const parsedRating = parseInt(rawBintang, 10);
        const starRating = isNaN(parsedRating) ? 5 : Math.min(Math.max(parsedRating, 1), 5);

        // Generate unique hotel code
        const cleanName = rawNama.toUpperCase().replace(/[^A-Z0-9]/g, "-");
        const hotelCode = `HTL-${cleanName.substring(0, 8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await masterDataService.createHotel({
          code: hotelCode,
          name: rawNama,
          cityId: cityId,
          starRating,
          jarakText: rawJarak || null,
          isActive: true,
        });

        createdCount++;
      } catch (err: any) {
        if (err?.message === "DUPLICATE_NAME") {
          skippedCount++;
        } else {
          errors.push(`Baris ${rowNumber} (${rawNama}): ${err?.message || "Gagal menyimpan"}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        createdCount,
        skippedCount,
        errors,
      },
      message: `Berhasil mengimpor ${createdCount} data hotel.${skippedCount > 0 ? ` (${skippedCount} duplikat dilewati)` : ""}`,
    });
  } catch (error: any) {
    console.error("[EXCEL IMPORT ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengimpor file Excel" },
      { status: 500 }
    );
  }
}
