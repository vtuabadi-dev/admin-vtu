// OCR Provider Abstraction
// Memungkinkan swap OCR engine tanpa mengubah business logic
// Implementasi: Tesseract.js (default), Google Vision, AWS Textract, dll.

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

  /** Cleanup — dipanggil saat worker shutdown */
  dispose?(): Promise<void>;
}

// Field mappings per jenis dokumen
export const DOCUMENT_FIELD_MAPS: Record<string, string[]> = {
  ktp: ["nik", "nama", "tempat_lahir", "tanggal_lahir", "alamat", "agama", "pekerjaan"],
  kk: ["no_kk", "nama_kepala", "alamat", "daftar_anggota"],
  paspor: ["no_paspor", "nama", "tempat_lahir", "tanggal_lahir", "tanggal_terbit", "tanggal_habis", "kewarganegaraan"],
  akta_lahir: ["no_akta", "nama", "tempat_lahir", "tanggal_lahir", "nama_ayah", "nama_ibu"],
  surat_nikah: ["no_surat", "nama_suami", "nama_istri", "tanggal_nikah", "tempat_nikah"],
  buku_nikah: ["no_buku", "nama_suami", "nama_istri", "tanggal_nikah"],
  ijazah: ["nama", "institusi", "tahun_lulus", "jurusan"],
  foto: [],
  visa: ["no_visa", "nama", "tanggal_terbit", "tanggal_habis", "jenis_visa"],
  "bebas-covid19": ["nama", "no_sertifikat", "tanggal_vaksin", "jenis_vaksin"],
};

export function getExpectedFields(jenis: DokumenJenis): string[] {
  return DOCUMENT_FIELD_MAPS[jenis] || [];
}
