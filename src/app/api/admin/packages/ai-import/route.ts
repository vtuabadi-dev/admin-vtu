// ============================================================
// AI IMPORT API — Package Flyer Import Endpoint
// POST: Accept multipart with flyer image (JPEG only) + caption
//       → process through AI pipeline → return extraction preview
//       → package enters DRAFT REVIEW state (never auto-publish)
// GET: List recent package drafts with optional status filter
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import {
  processPackageFlyer,
  saveFlyerImage,
  createPackageDraft,
  listDrafts,
} from "@/server/services/package-ai";
import type { PackageDraftStatus } from "@/server/services/package-ai/types";

const MAX_FLYER_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_MIME_TYPES = ["image/jpeg", "image/jpg"];
const VALID_EXTENSIONS = ["jpg", "jpeg"];

/**
 * POST: Upload a flyer image + caption for AI processing.
 *
 * Request: multipart/form-data
 *   - flyer: File (JPEG image of the package flyer)
 *   - caption: string (caption text from social media/post)
 *
 * Response:
 *   - success: true
 *   - data.extractionResult: Parsed package fields (preview)
 *   - data.draft: Created draft with DRAFT status
 *   - data.warning: Optional warning if confidence is low
 *
 * IMPORTANT: Packages ALWAYS enter DRAFT REVIEW state.
 * Use PUT /[id] to update, POST /[id]?action=approve to publish.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "create");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const flyerFile = formData.get("flyer") as File | null;
    const caption = formData.get("caption") as string | null;

    // ── Validation ──────────────────────────────────────────

    if (!flyerFile || !caption) {
      return NextResponse.json({
        success: false,
        message: "Field 'flyer' (file) dan 'caption' (text) wajib diisi",
      }, { status: 400 });
    }

    if (typeof caption !== "string" || caption.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: "Caption tidak boleh kosong",
      }, { status: 400 });
    }

    if (caption.length > 5000) {
      return NextResponse.json({
        success: false,
        message: "Caption terlalu panjang (maksimal 5000 karakter)",
      }, { status: 400 });
    }

    // Validate MIME type
    const clientMime = (flyerFile.type || "").toLowerCase();
    if (!VALID_MIME_TYPES.includes(clientMime)) {
      return NextResponse.json({
        success: false,
        message: "Hanya file JPG/JPEG yang diizinkan untuk flyer (invalid MIME type)",
      }, { status: 400 });
    }

    // Validate file extension
    const fileName = flyerFile.name || "flyer.jpg";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!VALID_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        success: false,
        message: "Hanya file dengan ekstensi .jpg atau .jpeg yang diizinkan",
      }, { status: 400 });
    }

    if (flyerFile.size > MAX_FLYER_SIZE) {
      return NextResponse.json({
        success: false,
        message: "File flyer terlalu besar (maksimal 10MB)",
      }, { status: 400 });
    }

    if (flyerFile.size < 10240) {
      return NextResponse.json({
        success: false,
        message: "File flyer terlalu kecil (< 10KB), mungkin bukan gambar valid",
      }, { status: 400 });
    }

    // ── Process ─────────────────────────────────────────────

    // Convert File to Buffer
    const buffer = Buffer.from(await flyerFile.arrayBuffer());

    // Save flyer to temp storage (validates magic bytes)
    const flyerPath = saveFlyerImage(buffer, fileName);

    // Run AI processing pipeline
    const extractionResult = await processPackageFlyer(flyerPath, caption);

    // Create draft (always DRAFT — never auto-publish)
    const draft = await createPackageDraft(extractionResult, flyerPath);

    // ── Response ────────────────────────────────────────────

    const responseData: Record<string, unknown> = {
      extractionResult,
      draft: {
        id: draft.id,
        status: draft.status,
        createdAt: draft.createdAt,
      },
    };

    // Add warning if confidence is low
    if (extractionResult.confidence < 50) {
      responseData.warning =
        "Kualitas OCR rendah. Periksa hasil ekstraksi sebelum melanjutkan.";
    }

    return NextResponse.json({
      success: true,
      message: "Flyer berhasil diproses. Paket dalam status DRAFT — review sebelum publikasi.",
      data: responseData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] POST error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * GET: List recent AI-imported package drafts.
 *
 * Query parameters:
 *   - status: Optional filter by PackageDraftStatus
 *     (DRAFT | REVIEW | READY | PUBLISHED | ARCHIVED)
 *
 * Response: { success, data: PackageDraft[], total }
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "view");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status")?.toUpperCase();
    const status = (statusParam as PackageDraftStatus) || undefined;

    // Validate status filter if provided
    const validStatuses: PackageDraftStatus[] = ["DRAFT", "REVIEW", "READY", "PUBLISHED", "ARCHIVED"];
    if (statusParam && !validStatuses.includes(status as PackageDraftStatus)) {
      return NextResponse.json({
        success: false,
        message: `Status tidak valid. Gunakan: ${validStatuses.join(", ")}`,
      }, { status: 400 });
    }

    const drafts = listDrafts(status);

    return NextResponse.json({
      success: true,
      data: drafts,
      total: drafts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] GET error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
