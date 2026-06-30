// OCR Service — External Provider Framework
// OCR diproses lewat API eksternal, terutama Google Vision API.
// Default provider: google-vision.
// Menerima Buffer langsung — tidak membaca filesystem.
//
// Feature Flag: OCR_DB_DRIVEN=true  → gunakan OCR Gateway (DB-driven, adaptive)
//               OCR_DB_DRIVEN unset → gunakan legacy env-var system

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./ocr/provider";
import { getExpectedFields } from "./ocr/provider";
import { createExternalApiProvider } from "./ocr/external-api.provider";

// ── Placeholder provider (no-op, development only) ────────────

const placeholderProvider: OcrProvider = {
  name: "placeholder",

  async recognize(_imageBuffer: Buffer, jenis: DokumenJenis, retryCount = 0): Promise<OcrResult> {
    const expectedFields = getExpectedFields(jenis);
    return {
      success: true,
      fields: expectedFields.map((field) => ({ field, value: "", confidence: 0 })),
      rawText: "",
      overallConfidence: 0,
      processingTimeMs: 0,
      retryCount,
    };
  },

  validateImage(buffer: Buffer): ImageMetaCheck {
    const issues: string[] = [];

    if (buffer.length < 10240) {
      issues.push("File size too small (< 10KB), mungkin bukan gambar valid");
    }
    if (buffer.length > 10 * 1024 * 1024) {
      issues.push("File size terlalu besar (> 10MB)");
    }

    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    if (!isJpeg && !isPng) {
      issues.push("File bukan JPEG/PNG valid (magic bytes mismatch)");
    }

    return { valid: issues.length === 0, issues };
  },
};

let _provider: OcrProvider | null = null;

async function getProvider(): Promise<OcrProvider> {
  if (_provider) return _provider;

  const configured = process.env.OCR_PROVIDER?.trim() || "google-vision";
  const isProduction = process.env.NODE_ENV === "production";

  switch (configured) {
    case "google-vision": {
      const keys = process.env.GOOGLE_VISION_API_KEY ?? "";
      // Also check for multi-key support: GOOGLE_VISION_API_KEY_2, _3, etc.
      const hasAnyKey = keys.split(",").filter(Boolean).length > 0 ||
        Array.from({ length: 19 }, (_, i) => process.env[`GOOGLE_VISION_API_KEY_${i + 2}`]).some(k => k?.trim());

      if (!hasAnyKey && isProduction) {
        throw new Error(
          "[OCR] Production memerlukan GOOGLE_VISION_API_KEY.\n" +
          "Set di environment variables Vercel:\n" +
          "  GOOGLE_VISION_API_KEY=<api-key>\n" +
          "Atau ganti provider: OCR_PROVIDER=external-api (lalu set OCR_API_URL + OCR_API_KEY)\n" +
          "Untuk development tanpa OCR: OCR_PROVIDER=placeholder"
        );
      }

      if (!hasAnyKey) {
        // Development without key → use placeholder
        console.warn("[OCR] GOOGLE_VISION_API_KEY tidak di-set — menggunakan placeholder (OCR akan return empty).");
        _provider = placeholderProvider;
        break;
      }

      const { createGoogleVisionProvider } = await import("./ocr/google-vision.provider");
      _provider = createGoogleVisionProvider();
      break;
    }

    case "external-api": {
      const url = process.env.OCR_API_URL?.trim();
      if (!url && isProduction) {
        throw new Error(
          "[OCR] Production memerlukan OCR_API_URL saat OCR_PROVIDER=external-api.\n" +
          "Set di environment variables Vercel:\n" +
          "  OCR_API_URL=<ocr-service-url>\n" +
          "  OCR_API_KEY=<api-key>\n" +
          "Atau ganti ke: OCR_PROVIDER=google-vision"
        );
      }
      _provider = createExternalApiProvider();
      break;
    }

    case "placeholder":
      _provider = placeholderProvider;
      break;

    default:
      // Unknown provider → placeholder
      console.warn(`[OCR] Unknown OCR_PROVIDER="${configured}" — menggunakan placeholder.`);
      _provider = placeholderProvider;
      break;
  }

  await _provider.initialize?.();
  return _provider;
}

export function setOcrProvider(provider: OcrProvider): void {
  _provider = provider;
}

// ── Public API ────────────────────────────────────────────────

export async function processDocument(
  imageBuffer: Buffer,
  jenis: DokumenJenis,
  retryCount = 0
): Promise<OcrResult> {
  // ── DB-Driven OCR Gateway (adaptive, multi-provider) ──
  if (process.env.OCR_DB_DRIVEN === "true") {
    const { process: gatewayProcess } = await import("./ocr/gateway");
    console.log("[OCR] Using DB-driven gateway mode");
    return gatewayProcess(imageBuffer, jenis, retryCount);
  }

  // ── Legacy env-var path ──
  const provider = await getProvider();
  return provider.recognize(imageBuffer, jenis, retryCount);
}

export function validateImageMetadata(buffer: Buffer): ImageMetaCheck {
  // ── DB-Driven: use gateway validator ──
  if (process.env.OCR_DB_DRIVEN === "true") {
    // Dynamic import to avoid bundling gateway in legacy path
    const { validateImage } = require("./ocr/gateway") as typeof import("./ocr/gateway");
    return validateImage(buffer);
  }

  // Gunakan placeholder untuk validasi (tidak perlu init provider)
  return placeholderProvider.validateImage(buffer);
}

// Re-export types
export type { OcrField, OcrResult, ImageMetaCheck, OcrProvider } from "./ocr/provider";
export { getExpectedFields } from "./ocr/provider";
