import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { getStorageAdapter } from "@/server/storage";
import { dokumenRepo } from "@/server/repositories";
import { checkRateLimit, rateLimitKey, getRateLimitConfig } from "@/server/lib/rate-limit";
import type { DokumenJenis } from "@/shared/types";
import { prisma } from "@/server/db/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_DOKUMEN_JENIS: DokumenJenis[] = ["ktp", "kk", "paspor", "akta", "pas_foto", "vaksin"];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "create");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

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

    const jenisDokumen = rawJenis as DokumenJenis;
    if (!VALID_DOKUMEN_JENIS.includes(jenisDokumen)) {
      return NextResponse.json({ success: false, message: "Jenis dokumen tidak valid" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(jamaahId) || jamaahId.length > 64) {
      return NextResponse.json({ success: false, message: "Invalid jamaahId" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File terlalu besar (max 10MB)" }, { status: 400 });
    }

    const ext = sanitizeFilename(file.name).split(".").pop()?.toLowerCase() || "jpg";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Fetch jamaah & keberangkatan folder registry for manifest-based naming
    const jamaah = await prisma.jamaah.findUnique({
      where: { id: jamaahId },
      include: {
        group: {
          include: {
            keberangkatan: true,
          },
        },
      },
    });

    let targetFolderId: string | undefined;
    let formattedFileName = `${jamaahId}_${jenisDokumen}.${ext}`;

    if (jamaah) {
      const driveFolders = (jamaah.group?.keberangkatan?.driveFolderIds as any) || {};
      const regId = jamaah.registrationId || jamaah.id;
      const cleanName = jamaah.namaLengkap.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");

      // Get manifest number if available (fallback 000)
      const manifestRow = await prisma.manifestRow.findFirst({
        where: { jamaahId: jamaah.id },
        select: { nomorUrut: true },
      });
      const nomorManifest = String(manifestRow?.nomorUrut || "000").padStart(3, "0");

      formattedFileName = `${nomorManifest}-${regId}_${cleanName}.${ext}`;

      // Pick subfolder by document type
      if (jenisDokumen === "paspor") targetFolderId = driveFolders.paspor;
      else if (jenisDokumen === "ktp") targetFolderId = driveFolders.ktp;
      else if (jenisDokumen === "pas_foto") targetFolderId = driveFolders.foto;
      else targetFolderId = driveFolders.dokumenLain;
    }

    const storage = getStorageAdapter();
    const fileId = await storage.upload(formattedFileName, buffer, file.type || "image/jpeg", targetFolderId);

    // Update DB
    const semuaDokumen = await dokumenRepo.findByJamaah(jamaahId);
    const dokumenItem = semuaDokumen.find((d: { id: string; jenis: string }) => d.jenis === jenisDokumen);

    if (dokumenItem) {
      await dokumenRepo.updateFileStatus(dokumenItem.id, "valid");
    }

    return NextResponse.json({
      success: true,
      data: {
        dokumen: dokumenItem,
        fileUrl: await storage.getUrl(fileId),
        fileId,
        status: "uploaded",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Upload endpoint — use POST with multipart/form-data" });
}
