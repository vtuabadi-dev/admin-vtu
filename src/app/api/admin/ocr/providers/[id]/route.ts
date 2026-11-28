// ============================================================
// OCR Provider — GET / PUT / DELETE by ID
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import { invalidateCache } from "@/server/services/ocr/registry";
import { testProviderConnection } from "@/server/services/ocr/gateway";
import { isAuthorizedOcrAdmin, isSuperAdminUser, maskProviderRecord } from "@/app/api/admin/ocr/masking-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const provider = await ocrProviderRepo.findById(params.id);
    if (!provider) return NextResponse.json({ success: false, message: "Provider not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: maskProviderRecord(provider) });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // PUT hanya mengubah apiKey jika body.apiKey non-kosong dan tidak mengandung "•"
    if (!body.apiKey || body.apiKey.trim() === "" || body.apiKey.includes("•")) {
      delete body.apiKey;
    }

    const provider = await ocrProviderRepo.update(params.id, body);
    invalidateCache();
    return NextResponse.json({ success: true, data: maskProviderRecord(provider) });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isSuperAdminUser(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    await ocrProviderRepo.delete(params.id);
    invalidateCache();
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

// ── Test Connection ──────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isAuthorizedOcrAdmin(session)) {
    return NextResponse.json({ success: false, message: "Forbidden: role not authorized" }, { status: 403 });
  }

  try {
    const provider = await ocrProviderRepo.findById(params.id);
    if (!provider) return NextResponse.json({ success: false, message: "Provider not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === "test") {
      const result = await testProviderConnection(provider);
      return NextResponse.json({ success: result.ok, data: result });
    }

    if (action === "toggle") {
      const updated = await ocrProviderRepo.toggleActive(params.id);
      invalidateCache();
      return NextResponse.json({ success: true, data: maskProviderRecord(updated) });
    }

    if (action === "reactivate" || action === "reset-health") {
      const updated = await ocrProviderRepo.reactivate(params.id);
      invalidateCache();
      return NextResponse.json({ success: true, data: maskProviderRecord(updated) });
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
