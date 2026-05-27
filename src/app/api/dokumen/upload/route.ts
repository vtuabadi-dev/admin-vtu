import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { getStorageAdapter, dokumenPath } from "@/server/storage";
import { validateImageMetadata } from "@/server/services/ocr.service";
import { dokumenRepo } from "@/server/repositories";
import { enqueueDocumentOcr } from "@/server/queue";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";
import type { DokumenJenis } from "@/shared/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_MIME_TYPES = ["image/jpeg", "image/jpg"];
const VALID_DOKUMEN_JENIS: DokumenJenis[] = ["ktp", "kk", "paspor", "akta", "pas_foto", "vaksin"];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  // Rate limit uploads
  const rlKey = rateLimitKey(request, session);
  const rl = checkRateLimit(rlKey, getRateLimitConfig("upload"));
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many uploads. Try again later.", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const jamaahId = formData.get("jamaahId") as string | null;
    const rawJenis = formData.get("jenisDokumen") as string | null;

    if (!file || !jamaahId || !rawJenis) {
      return NextResponse.json({ success: false, message: "file, jamaahId, and jenisDokumen are required" }, { status: 400 });
    }

    // Validate jenisDokumen against allowed values
    const jenisDokumen = rawJenis as DokumenJenis;
    if (!VALID_DOKUMEN_JENIS.includes(jenisDokumen)) {
      return NextResponse.json({ success: false, message: "Jenis dokumen tidak valid" }, { status: 400 });
    }

    // Validate jamaahId format (cuid — alphanumeric, no path chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(jamaahId) || jamaahId.length > 64) {
      return NextResponse.json({ success: false, message: "Invalid jamaahId" }, { status: 400 });
    }

    // Validate MIME type from content, not just extension
    const clientMime = (file.type || "").toLowerCase();
    if (!VALID_MIME_TYPES.includes(clientMime)) {
      return NextResponse.json({ success: false, message: "Hanya file JPG/JPEG yang diizinkan (invalid MIME type)" }, { status: 400 });
    }

    // Validate extension
    const ext = sanitizeFilename(file.name).split(".").pop()?.toLowerCase();
    if (ext !== "jpg" && ext !== "jpeg") {
      return NextResponse.json({ success: false, message: "Hanya file JPG/JPEG yang diizinkan" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File terlalu besar (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes validation (double-check Content-Type bypass)
    const metaCheck = validateImageMetadata(buffer);
    if (!metaCheck.valid) {
      return NextResponse.json({ success: false, message: "File tidak valid", details: metaCheck.issues }, { status: 400 });
    }

    // Save file
    const storage = getStorageAdapter();
    const storagePath = dokumenPath(jamaahId, jenisDokumen, ext);
    const fileUrl = await storage.upload(storagePath, buffer, file.type || "image/jpeg");

    // Find existing dokumen item untuk jamaah+jenis ini
    const semuaDokumen = await dokumenRepo.findByJamaah(jamaahId);
    const dokumenItem = semuaDokumen.find((d) => d.jenis === jenisDokumen);

    if (dokumenItem) {
      await dokumenRepo.updateFileStatus(dokumenItem.id, "valid");
    }

    // Enqueue OCR processing
    const ocrJobId = `ocr-${jamaahId}-${jenisDokumen}-${Date.now()}`;
    try {
      await enqueueDocumentOcr({
        id: ocrJobId,
        queue: "document-ocr",
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
        data: {
          dokumenId: dokumenItem?.id || jenisDokumen,
          jamaahId,
          fileUrl,
          jenisDokumen,
        },
      } as Parameters<typeof enqueueDocumentOcr>[0]);
    } catch {
      // OCR queue not critical — upload succeeds even if OCR can't be enqueued
      console.warn("[Upload] Failed to enqueue OCR job, continuing with upload");
    }

    return NextResponse.json({
      success: true,
      data: {
        dokumen: dokumenItem,
        fileUrl: await storage.getUrl(storagePath),
        ocrJobId,
        status: "processing",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Upload endpoint — use POST with multipart/form-data" });
}
