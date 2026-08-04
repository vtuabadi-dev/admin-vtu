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

    const perm = checkServerPermission(session, "sistem", "create");
    if (!perm.allowed) {
      return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const defaultTipe = (formData.get("defaultTipe") as string) || "TOUR_LEADER";

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

      const rawNama = row.getCell(1).text?.trim();
      const rawNoHp = row.getCell(2).text?.trim();
      let rawTipe = row.getCell(3).text?.trim().toUpperCase();

      if (!rawNama) continue; // Skip empty rows

      // Normalize tipe
      if (rawTipe !== "TOUR_LEADER" && rawTipe !== "MUTHOWIF") {
        rawTipe = defaultTipe;
      }

      try {
        await prisma.masterPetugas.create({
          data: {
            nama: rawNama,
            noHp: rawNoHp || null,
            tipe: rawTipe,
            isActive: true,
          },
        });
        createdCount++;
      } catch (err: any) {
        errors.push(`Baris ${rowNumber}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${createdCount} petugas.`,
      createdCount,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
