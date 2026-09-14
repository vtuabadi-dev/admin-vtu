import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { extractFlightTicketOcr } from "@/server/services/ocr/flight-ticket-ocr.service";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    let departureDate: string | undefined = undefined;

    // 1. Handle multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      departureDate = (formData.get("departureDate") as string) || undefined;

      if (!file) {
        return NextResponse.json(
          { success: false, message: "File dokumen/gambar e-tiket harus disertakan." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      mimeType = file.type || "image/jpeg";

      // Detect PDF from filename if mimeType is generic
      if (file.name.toLowerCase().endsWith(".pdf")) {
        mimeType = "application/pdf";
      }
    }
    // 2. Handle application/json (Base64 / Data URL / Clipboard Paste)
    else if (contentType.includes("application/json")) {
      const body = await request.json();
      departureDate = body.departureDate;
      const base64Content = body.fileBase64 || body.dataUrl || body.fileUrl;

      if (!base64Content) {
        return NextResponse.json(
          { success: false, message: "Data base64 dokumen/gambar e-tiket harus disertakan." },
          { status: 400 }
        );
      }

      if (base64Content.startsWith("data:")) {
        const parts = base64Content.split(",");
        const header = parts[0];
        const matchMime = header.match(/data:([^;]+)/);
        if (matchMime) mimeType = matchMime[1];
        fileBuffer = Buffer.from(parts[1] || "", "base64");
      } else {
        fileBuffer = Buffer.from(base64Content, "base64");
        if (body.mimeType) mimeType = body.mimeType;
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Unsupported Content-Type. Gunakan multipart/form-data atau application/json." },
        { status: 400 }
      );
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, message: "Berkas tiket kosong atau tidak dapat dibaca." },
        { status: 400 }
      );
    }

    // Call OCR Service
    const ocrResult = await extractFlightTicketOcr(fileBuffer, mimeType, departureDate);

    if (!ocrResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: ocrResult.error || "Gagal mengekstrak rincian penerbangan dari dokumen.",
          rawText: ocrResult.rawText,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengekstrak ${ocrResult.segments.length} segmen penerbangan.`,
      data: {
        pnrMain: ocrResult.pnrMain,
        maskapai: ocrResult.maskapai,
        segments: ocrResult.segments,
        confidence: ocrResult.confidence,
        rawText: ocrResult.rawText,
      },
    });
  } catch (error: any) {
    console.error("[api/keberangkatan/flight-ocr] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan internal server.",
      },
      { status: 500 }
    );
  }
}
