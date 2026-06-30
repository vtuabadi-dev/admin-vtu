// ============================================================
// OCR Statistics — GET summary, daily, logs
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "ocr-settings", "view");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") || "summary";

    switch (type) {
      case "summary": {
        const summary = await ocrProviderRepo.getSummaryStats();
        return NextResponse.json({ success: true, data: summary });
      }

      case "providers": {
        const stats = await ocrProviderRepo.getProviderStats();
        return NextResponse.json({ success: true, data: stats });
      }

      case "logs": {
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
        const logs = await ocrProviderRepo.getUsageLogs({ page, pageSize });
        return NextResponse.json({ success: true, data: logs.data, total: logs.total });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown stats type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
