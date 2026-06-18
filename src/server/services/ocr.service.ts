// OCR Service — External Provider Framework
// OCR diproses lewat API eksternal, terutama Google Vision API.
// Default provider: google-vision.

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./ocr/provider";
import { getExpectedFields } from "./ocr/provider";
import { createExternalApiProvider } from "./ocr/external-api.provider";

// ── Placeholder provider (no-op) ──────────────────────────────

const placeholderProvider: OcrProvider = {
  name: "placeholder",

  async recognize(_imagePath: string, jenis: DokumenJenis, retryCount = 0): Promise<OcrResult> {
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

  switch (configured) {
    case "google-vision":
      const { createGoogleVisionProvider } = await import("./ocr/google-vision.provider");
      _provider = createGoogleVisionProvider();
      break;

    case "external-api":
      _provider = createExternalApiProvider();
      break;

    default:
      // Tanpa konfigurasi → placeholder
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
  imagePath: string,
  jenis: DokumenJenis,
  retryCount = 0
): Promise<OcrResult> {
  const provider = await getProvider();
  return provider.recognize(imagePath, jenis, retryCount);
}

export function validateImageMetadata(buffer: Buffer): ImageMetaCheck {
  // Gunakan placeholder untuk validasi (tidak perlu init provider)
  return placeholderProvider.validateImage(buffer);
}

// Re-export types
export type { OcrField, OcrResult, ImageMetaCheck, OcrProvider } from "./ocr/provider";
export { getExpectedFields } from "./ocr/provider";
