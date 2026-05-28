// ============================================================
// AI IMPORT API — Individual Draft Management
// GET:    Get draft details
// PUT:    Update draft extraction fields (manual edits before publishing)
// POST:   Approve and publish draft (action="approve")
// DELETE: Discard draft + cleanup temp files
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import {
  getDraftById,
  updateDraftExtraction,
  updateDraftStatus,
  approvePackageDraft,
  discardDraft,
} from "@/server/services/package-ai";
import type { PackageDraftStatus } from "@/server/services/package-ai/types";

/**
 * GET /api/admin/packages/ai-import/[id]
 * Retrieve full details of a specific draft including extraction result.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "view");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const draft = getDraftById(params.id);
    if (!draft) {
      return NextResponse.json({
        success: false,
        message: `Draft ${params.id} tidak ditemukan`,
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] GET draft error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/packages/ai-import/[id]
 * Update draft extraction fields (manual edits before publishing).
 *
 * Request body (JSON):
 * {
 *   "extraction": {
 *     "title": "Updated Title",
 *     "hotelMekkah": "Updated Hotel",
 *     // ... any PackageExtractionResult fields
 *   },
 *   "status": "REVIEW"  // optional status transition
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "edit");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const existing = getDraftById(params.id);
    if (!existing) {
      return NextResponse.json({
        success: false,
        message: `Draft ${params.id} tidak ditemukan`,
      }, { status: 404 });
    }

    if (existing.status === "PUBLISHED" || existing.status === "ARCHIVED") {
      return NextResponse.json({
        success: false,
        message: `Draft sudah ${existing.status === "PUBLISHED" ? "dipublikasikan" : "diarsipkan"}, tidak dapat diubah`,
      }, { status: 400 });
    }

    const body = await request.json();
    let draft = { ...existing };

    // Update extraction fields if provided
    if (body.extraction && typeof body.extraction === "object") {
      draft = updateDraftExtraction(params.id, body.extraction);
    }

    // Update status if provided
    if (body.status) {
      const validStatuses: PackageDraftStatus[] = ["DRAFT", "REVIEW", "READY"];
      const newStatus = (body.status as string).toUpperCase() as PackageDraftStatus;

      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json({
          success: false,
          message: `Status transisi tidak valid. Hanya: ${validStatuses.join(", ")}`,
        }, { status: 400 });
      }

      const userId = session.user.id;
      if (!userId) {
        return NextResponse.json({ success: false, message: "User ID tidak ditemukan dalam session" }, { status: 401 });
      }

      draft = updateDraftStatus(params.id, newStatus, userId);
    }

    return NextResponse.json({
      success: true,
      message: "Draft berhasil diperbarui",
      data: draft,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] PUT draft error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/packages/ai-import/[id]
 * Approve and publish a draft (action="approve").
 * The draft must be in REVIEW or READY status to be published.
 *
 * Query parameter: action=approve
 *
 * Response includes the published Keberangkatan record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "approve");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    if (action === "approve") {
      // Approve and publish the draft
      const reviewerId = session.user.id;
      if (!reviewerId) {
        return NextResponse.json({ success: false, message: "User ID tidak ditemukan dalam session" }, { status: 401 });
      }
      const published = await approvePackageDraft(params.id, reviewerId);

      return NextResponse.json({
        success: true,
        message: "Paket berhasil dipublikasikan dari draft AI",
        data: {
          publishedPackage: published,
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: "Aksi tidak valid. Gunakan ?action=approve untuk publikasi.",
    }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] POST (approve) error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/packages/ai-import/[id]
 * Discard a draft and clean up its associated temp files.
 * Published or already-archived drafts cannot be deleted.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const perm = checkServerPermission(session, "keberangkatan", "delete");
  if (!perm.allowed) {
    return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });
  }

  try {
    const draft = getDraftById(params.id);
    if (!draft) {
      return NextResponse.json({
        success: false,
        message: `Draft ${params.id} tidak ditemukan`,
      }, { status: 404 });
    }

    if (draft.status === "PUBLISHED") {
      return NextResponse.json({
        success: false,
        message: "Draft yang sudah dipublikasikan tidak dapat dihapus. Gunakan API manajemen paket untuk mengarsipkan.",
      }, { status: 400 });
    }

    const removed = discardDraft(params.id);
    if (!removed) {
      return NextResponse.json({
        success: false,
        message: `Gagal menghapus draft ${params.id}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Draft berhasil dihapus",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI-Import] DELETE draft error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
