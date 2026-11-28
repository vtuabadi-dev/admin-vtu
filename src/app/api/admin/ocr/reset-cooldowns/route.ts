// ============================================================
// OCR Reset Cooldowns — POST endpoint to reset all cooldowns
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import { invalidateCache } from "@/server/services/ocr/registry";
import { isAuthorizedOcrAdmin } from "@/app/api/admin/ocr/masking-utils";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const resetCount = await ocrProviderRepo.resetAllCooldowns();
    invalidateCache();
    return NextResponse.json({ success: true, resetCount });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
