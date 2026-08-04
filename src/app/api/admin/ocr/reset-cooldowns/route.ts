// ============================================================
// OCR Reset Cooldowns — POST endpoint to reset all cooldowns
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import { invalidateCache } from "@/server/services/ocr/registry";

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "ocr-settings", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const resetCount = await ocrProviderRepo.resetAllCooldowns();
    invalidateCache();
    return NextResponse.json({ success: true, resetCount });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
