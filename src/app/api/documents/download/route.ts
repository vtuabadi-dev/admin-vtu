import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { generateRegistrationPdf } from "@/server/services/registration-pdf.service";
import { getStorageAdapter } from "@/server/storage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kodeRegistrasi = searchParams.get("kodeRegistrasi") || searchParams.get("kode");
  const path = searchParams.get("path");

  try {
    let pdfBuffer: Buffer | null = null;
    let filename = `FORMULIR_PENDAFTARAN_${kodeRegistrasi || "VTU"}.pdf`;

    if (kodeRegistrasi) {
      const reg = await prisma.registrationRequest.findUnique({
        where: { kodeRegistrasi },
        include: { members: true, keberangkatan: true },
      });

      if (reg) {
        filename = `${reg.kodeRegistrasi}_${reg.namaPerwakilan.replace(/[^A-Z0-9]/gi, "_")}.pdf`;
        pdfBuffer = await generateRegistrationPdf({
          registration: reg as any,
          packageInfo: (reg as any).keberangkatan ?? null,
          termsVersion: "1.0",
          termsAcceptedAt: reg.termsAcceptedAt ?? reg.createdAt,
          signedAt: reg.signedAt ?? undefined,
        });
      }
    }

    if (!pdfBuffer && path) {
      try {
        const { createLocalAdapter } = await import("@/server/storage/local");
        const localVault = createLocalAdapter();
        pdfBuffer = await localVault.download(path);
      } catch {
        const storage = getStorageAdapter();
        pdfBuffer = await storage.download(path);
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({ success: false, message: "Dokumen PDF tidak ditemukan" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[documents:download] Error generating or serving PDF:", error);
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
