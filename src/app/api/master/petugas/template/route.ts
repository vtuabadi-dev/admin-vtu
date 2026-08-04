import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const perm = checkServerPermission(session, "sistem", "view");
    if (!perm.allowed) {
      return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Master Petugas");

    // Columns setup
    worksheet.columns = [
      { header: "Nama Lengkap", key: "nama", width: 30 },
      { header: "No HP / WhatsApp", key: "noHp", width: 20 },
      { header: "Tipe (TOUR_LEADER / MUTHOWIF)", key: "tipe", width: 30 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0284C7" }, // Sky-600
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Sample data rows
    worksheet.addRow({
      nama: "Ustadz Ahmad Fulan",
      noHp: "081234567890",
      tipe: "TOUR_LEADER",
    });
    worksheet.addRow({
      nama: "Syekh Abdullah",
      noHp: "089876543210",
      tipe: "MUTHOWIF",
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Template_Import_Master_Petugas.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
