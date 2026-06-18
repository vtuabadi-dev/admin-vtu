import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStorageAdapter, signaturePath } from "@/server/storage";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";

function validateImageMetadata(buffer: Buffer): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (buffer.length < 10240) issues.push("File size too small (< 10KB)");
  if (buffer.length > 10 * 1024 * 1024) issues.push("File size terlalu besar (> 10MB)");
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  if (!isJpeg && !isPng) issues.push("File bukan JPEG/PNG valid (magic bytes mismatch)");
  return { valid: issues.length === 0, issues };
}

const MAX_FILE_SIZE = 100 * 1024; // 100 KB
const VALID_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

export async function POST(request: NextRequest) {
  // Rate limit — keyed by IP since this is a public endpoint
  const rlKey = rateLimitKey(request);
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

    if (!file) {
      return NextResponse.json({ success: false, message: "File is required" }, { status: 400 });
    }

    // Validate MIME type
    const clientMime = (file.type || "").toLowerCase();
    if (!VALID_MIME_TYPES.includes(clientMime)) {
      return NextResponse.json({ success: false, message: "Hanya file PNG, JPG, atau JPEG yang diizinkan" }, { status: 400 });
    }

    // Validate extension
    const ext = sanitizeFilename(file.name).split(".").pop()?.toLowerCase();
    if (ext !== "jpg" && ext !== "jpeg" && ext !== "png") {
      return NextResponse.json({ success: false, message: "Hanya file PNG, JPG, atau JPEG yang diizinkan" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "Tanda tangan terlalu besar. Maksimal 100 KB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes validation
    const metaCheck = validateImageMetadata(buffer);
    if (!metaCheck.valid) {
      return NextResponse.json({ success: false, message: "File tidak valid", details: metaCheck.issues }, { status: 400 });
    }

    // Save file to temp location — final path set after registration ID is generated
    const tempId = `tmp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const storage = getStorageAdapter();
    const storagePath = signaturePath(tempId);
    await storage.upload(storagePath, buffer, file.type || "image/jpeg");

    return NextResponse.json({
      success: true,
      data: {
        tempId,
        fileUrl: await storage.getUrl(storagePath),
        storagePath,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Signature upload endpoint — use POST with multipart/form-data" });
}
