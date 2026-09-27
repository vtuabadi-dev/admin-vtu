import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getStorageAdapter } from "@/server/storage";
import { createLocalAdapter } from "@/server/storage/local";
import type { OperationalRole } from "@/shared/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as OperationalRole;
  const allowedRoles = new Set([
    "super_admin",
    "admin_operasional",
    "admin_pembayaran",
    "admin_dokumen",
    "admin_manifest",
    "admin_badal",
    "tour_leader",
    "jamaah",
  ]);

  const hasAccess =
    allowedRoles.has(role) ||
    checkServerPermission(session, "dokumen", "view").allowed ||
    checkServerPermission(session, "pembayaran", "view").allowed;

  if (!hasAccess) {
    return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 });
  }

  const rawParam =
    request.nextUrl.searchParams.get("id") ||
    request.nextUrl.searchParams.get("path") ||
    request.nextUrl.searchParams.get("file");

  if (!rawParam) {
    return NextResponse.json({ success: false, message: "id or path query parameter is required" }, { status: 400 });
  }

  let cleanTarget = rawParam.trim();
  if (cleanTarget.includes("id=")) {
    cleanTarget = cleanTarget.split("id=")[1]?.split("&")[0] || cleanTarget;
  } else if (cleanTarget.includes("path=")) {
    cleanTarget = cleanTarget.split("path=")[1]?.split("&")[0] || cleanTarget;
  }
  cleanTarget = decodeURIComponent(cleanTarget);

  // If cleanTarget is a base64 data URI
  if (cleanTarget.startsWith("data:")) {
    const commaIdx = cleanTarget.indexOf(",");
    if (commaIdx !== -1) {
      const meta = cleanTarget.slice(0, commaIdx);
      const base64Data = cleanTarget.slice(commaIdx + 1);
      const mimeMatch = meta.match(/data:([^;]+)/);
      const contentType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : "image/jpeg";
      const buffer = Buffer.from(base64Data, "base64");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": "inline",
        },
      });
    }
  }

  let buffer: Buffer | null = null;

  // 1. If target looks like a relative file path or filename, check local storage/filesystem first
  const isPathOrFile = cleanTarget.includes("/") || cleanTarget.includes("\\") || /\.[a-z0-9]{3,4}$/i.test(cleanTarget);

  if (isPathOrFile) {
    try {
      const local = createLocalAdapter();
      if (await local.exists(cleanTarget)) {
        buffer = await local.download(cleanTarget);
      }
    } catch {
      // Proceed to filesystem checks
    }

    if (!buffer) {
      const candidates = [
        path.resolve(process.env.STORAGE_PATH || "./storage", cleanTarget),
        path.resolve(process.cwd(), "storage", cleanTarget),
        path.resolve(process.cwd(), "public/uploads", cleanTarget),
        path.resolve(process.cwd(), "public", cleanTarget),
        path.resolve("/tmp/storage", cleanTarget),
      ];

      for (const cand of candidates) {
        try {
          const content = await fs.readFile(cand);
          if (content && content.length > 0) {
            buffer = content;
            break;
          }
        } catch {
          // Continue searching candidates
        }
      }
    }
  }

  // 2. Try primary storage adapter (e.g. Google Drive with direct fileId or filename search)
  if (!buffer) {
    try {
      const storage = getStorageAdapter();
      buffer = await storage.download(cleanTarget);
    } catch (primaryErr) {
      console.warn(`[storage/download] Primary storage adapter download failed for "${cleanTarget}":`, primaryErr);
    }
  }

  // 3. Fallback: try local storage adapter one more time
  if (!buffer) {
    try {
      const local = createLocalAdapter();
      buffer = await local.download(cleanTarget);
    } catch {
      // Not found
    }
  }

  if (!buffer || buffer.length === 0) {
    return NextResponse.json({ success: false, message: `File tidak ditemukan: ${cleanTarget}` }, { status: 404 });
  }

  // Detect content type from magic bytes with extension fallback
  let contentType = "application/octet-stream";
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = "image/jpeg";
  else if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = "image/png";
  else if (buffer[0] === 0x47 && buffer[1] === 0x49) contentType = "image/gif";
  else if (buffer[0] === 0x25 && buffer[1] === 0x50) contentType = "application/pdf";
  else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) contentType = "image/webp";
  else {
    const ext = cleanTarget.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "webp") contentType = "image/webp";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "svg") contentType = "image/svg+xml";
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
