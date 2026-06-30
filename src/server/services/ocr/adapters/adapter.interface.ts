// ============================================================
// OCR Adapter Interface
// ============================================================
// Every OCR provider (Google Vision, Azure, AWS, etc.)
// implements this interface. Add a new adapter = add a new file.
// Business layer & Gateway are unaffected.
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrResult, ImageMetaCheck } from "../provider";

export interface OcrAdapter {
  /** Unique adapter type identifier (matches OcrProviderType enum) */
  readonly type: string;

  /** Process OCR on image buffer using the given API key & optional URL */
  recognize(
    imageBuffer: Buffer,
    jenis: DokumenJenis,
    config: OcrAdapterConfig,
    retryCount?: number,
  ): Promise<OcrResult>;

  /** Validate image metadata before OCR */
  validateImage(buffer: Buffer): ImageMetaCheck;

  /** Optional: test connectivity to the provider */
  testConnection?(config: OcrAdapterConfig): Promise<{ ok: boolean; message: string }>;
}

export interface OcrAdapterConfig {
  apiKey: string;
  apiUrl?: string;
  apiHeaderName?: string;
  apiHeaderPrefix?: string;
  timeout?: number;
}
