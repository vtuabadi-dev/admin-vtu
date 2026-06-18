// OCR Provider Abstraction
// Memungkinkan swap OCR provider tanpa mengubah business logic.
// Implementasi utama: Google Vision API atau custom external API.

import type { DokumenJenis } from "@/shared/types";

export interface OcrField {
  field: string;
  value: string;
  confidence: number;
}

export interface OcrResult {
  success: boolean;
  fields: OcrField[];
  rawText: string;
  overallConfidence: number;
  processingTimeMs: number;
  retryCount: number;
}

export interface ImageMetaCheck {
  valid: boolean;
  issues: string[];
}

export interface OcrProvider {
  /** Nama provider (untuk logging) */
  readonly name: string;

  /** Proses OCR pada gambar */
  recognize(imagePath: string, jenis: DokumenJenis, retryCount?: number): Promise<OcrResult>;

  /** Validasi metadata gambar sebelum OCR */
  validateImage(buffer: Buffer): ImageMetaCheck;

  /** Konfigurasi provider — dipanggil saat inisialisasi */
  initialize?(): Promise<void>;

  /** Cleanup provider bila diperlukan */
  dispose?(): Promise<void>;
}

// Field mappings per jenis dokumen — must match DokumenJenis union
export const DOCUMENT_FIELD_MAPS: Record<string, string[]> = {
  paspor: ["namaLengkap", "nomorPaspor", "tanggalLahir", "tempatLahir", "masaBerlaku"],
  pas_foto: [],
  vaksin: ["namaLengkap"],
  ktp: ["namaLengkap", "nik", "tanggalLahir", "tempatLahir"],
  kk: ["namaLengkap", "nik"],
  akta: ["namaLengkap", "nik", "tanggalLahir", "tempatLahir"],
};

export function getExpectedFields(jenis: DokumenJenis): string[] {
  return DOCUMENT_FIELD_MAPS[jenis] || [];
}
