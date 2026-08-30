import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { dokumenRepo, auditRepo } from "@/server/repositories";
import type { DokumenJenis } from "@/shared/types";

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
    const { dokumenId, jamaahId, jenis, manualData, dataStatus } = await request.json() as {
      dokumenId?: string;
      jamaahId?: string;
      jenis?: DokumenJenis;
      manualData: Record<string, any>;
      dataStatus?: "valid" | "pending" | "manual_edit" | "ocr_error";
    };

    if (!dokumenId && (!jamaahId || !jenis)) {
      return NextResponse.json({ success: false, message: "dokumenId or (jamaahId and jenis) are required" }, { status: 400 });
    }

    let data;
    if (dokumenId) {
      data = await dokumenRepo.saveManualOcrData(dokumenId, manualData, dataStatus ?? "manual_edit");
    } else if (jamaahId && jenis) {
      data = await dokumenRepo.saveManualOcrDataByJamaah(jamaahId, jenis, manualData, dataStatus ?? "manual_edit");
    }

    // Audit the OCR edit
    try {
      await auditRepo.create({
        userId: session.user.id!,
        userName: session.user.name ?? "Unknown",
        role: session.user.role ?? "admin_operasional",
        module: "dokumen",
        action: "dokumen.ocr_edit",
        detail: `Manual OCR edit on document ${dokumenId || `${jamaahId}:${jenis}`} — fields: ${Object.keys(manualData || {}).join(", ")}`,
        entityId: dokumenId || (data as any)?.id || `${jamaahId}:${jenis}`,
        entityType: "DokumenItem",
      });
    } catch { /* Non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
