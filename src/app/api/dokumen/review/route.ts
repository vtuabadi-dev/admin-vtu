import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { dokumenRepo, auditRepo } from "@/server/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const data = await dokumenRepo.getReviewQueue();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { dokumenId, manualData, dataStatus } = await request.json() as {
      dokumenId: string;
      manualData: { namaLengkap?: string; nik?: string; nomorPaspor?: string; tanggalLahir?: string };
      dataStatus?: "valid" | "pending" | "manual_edit" | "ocr_error";
    };

    if (!dokumenId || !manualData) {
      return NextResponse.json({ success: false, message: "dokumenId and manualData are required" }, { status: 400 });
    }

    const data = await dokumenRepo.saveManualOcrData(dokumenId, manualData, dataStatus ?? "manual_edit");

    // Audit the OCR edit
    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role ?? "admin_operasional",
        module: "dokumen",
        action: "dokumen.ocr_edit",
        detail: `Manual OCR edit on document ${dokumenId} — fields: ${Object.keys(manualData).join(", ")}`,
        entityId: dokumenId,
        entityType: "DokumenItem",
      });
    } catch { /* Non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
