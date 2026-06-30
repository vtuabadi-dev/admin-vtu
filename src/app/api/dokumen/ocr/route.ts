import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { checkServerPermission } from "@/shared/lib/rbac-utils";
import { processDocument } from "@/server/services/ocr.service";
import { getStorageAdapter } from "@/server/storage";
import type { DokumenJenis } from "@/shared/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const perm = checkServerPermission(session, "dokumen", "edit");
  if (!perm.allowed) return NextResponse.json({ success: false, message: perm.reason }, { status: 403 });

  try {
    const { dokumenId, fileUrl, jenis } = await request.json() as {
      dokumenId: string;
      fileUrl: string;
      jenis: DokumenJenis;
    };

    if (!dokumenId || !fileUrl || !jenis) {
      return NextResponse.json({ success: false, message: "dokumenId, fileUrl, and jenis are required" }, { status: 400 });
    }

    // Download file dari storage ke memory buffer — tanpa filesystem
    const storage = getStorageAdapter();
    const buffer = await storage.download(fileUrl);

    // OCR langsung dari buffer — tanpa write/read/delete temp file
    const ocrResult = await processDocument(buffer, jenis);

    if (!ocrResult.success) {
      return NextResponse.json({ success: false, message: "OCR processing failed", details: ocrResult.rawText }, { status: 500 });
    }

    // Convert OCR result to OcrData format
    const ocrData: Record<string, any> = {
      confidence: ocrResult.overallConfidence,
      rawText: ocrResult.rawText,
    };

    // Extract fields from OCR result
    for (const field of ocrResult.fields) {
      if (field.value) {
        ocrData[field.field] = field.value;
      }
    }

    return NextResponse.json({ success: true, data: ocrData });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
