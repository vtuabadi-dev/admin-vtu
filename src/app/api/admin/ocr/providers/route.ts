// ============================================================
// OCR Providers — GET (list) & POST (create)
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import { invalidateCache } from "@/server/services/ocr/registry";
import { isAuthorizedOcrAdmin, maskProviderRecord } from "@/app/api/admin/ocr/masking-utils";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const providers = await ocrProviderRepo.findAll();
    const masked = providers.map((p) => maskProviderRecord(p));
    return NextResponse.json({ success: true, data: masked });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const provider = await ocrProviderRepo.create(body);
    invalidateCache();
    return NextResponse.json({ success: true, data: maskProviderRecord(provider) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
