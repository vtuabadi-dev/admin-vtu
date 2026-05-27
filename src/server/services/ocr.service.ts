// OCR Service — Business logic layer
// Menggunakan OcrProvider abstraction (swap engine tanpa ubah logic)

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./ocr/provider";
import { createTesseractProvider } from "./ocr/tesseract.provider";

// Singleton provider — bisa diganti dengan provider lain via setOcrProvider()
let _provider: OcrProvider | null = null;

async function getProvider(): Promise<OcrProvider> {
  if (_provider) return _provider;
  _provider = createTesseractProvider();
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
  // Gunakan Tesseract provider untuk validasi (tidak perlu init)
  const provider = createTesseractProvider();
  return provider.validateImage(buffer);
}

// Re-export types
export type { OcrField, OcrResult, ImageMetaCheck, OcrProvider } from "./ocr/provider";
export { getExpectedFields } from "./ocr/provider";
