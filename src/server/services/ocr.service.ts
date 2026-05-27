// OCR Service — Tesseract.js integration untuk ekstraksi data dokumen
// Dipanggil dari OCR worker (document-ocr queue)

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

// Field mappings per jenis dokumen — fields yang diekstrak dari OCR
const FIELD_MAPS: Record<string, string[]> = {
  ktp: ["nik", "nama", "tempat_lahir", "tanggal_lahir", "alamat", "agama", "pekerjaan"],
  kk: ["no_kk", "nama_kepala", "alamat", "daftar_anggota"],
  paspor: ["no_paspor", "nama", "tempat_lahir", "tanggal_lahir", "tanggal_terbit", "tanggal_habis", "kewarganegaraan"],
  akta_lahir: ["no_akta", "nama", "tempat_lahir", "tanggal_lahir", "nama_ayah", "nama_ibu"],
  surat_nikah: ["no_surat", "nama_suami", "nama_istri", "tanggal_nikah", "tempat_nikah"],
  buku_nikah: ["no_buku", "nama_suami", "nama_istri", "tanggal_nikah"],
  ijazah: ["nama", "institusi", "tahun_lulus", "jurusan"],
  foto: [], // no OCR for photos
  visa: ["no_visa", "nama", "tanggal_terbit", "tanggal_habis", "jenis_visa"],
  "bebas-covid19": ["nama", "no_sertifikat", "tanggal_vaksin", "jenis_vaksin"],
};

function getExpectedFields(jenis: DokumenJenis): string[] {
  return FIELD_MAPS[jenis] || [];
}

// Coba import Tesseract; fallback ke stub jika tidak tersedia di runtime
async function getTesseractWorker() {
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("ind");
    return worker;
  } catch {
    console.warn("[OCR] Tesseract.js not available, using stub OCR");
    return null;
  }
}

export async function processDocument(
  imagePath: string,
  jenis: DokumenJenis,
  retryCount = 0
): Promise<OcrResult> {
  const start = Date.now();
  const expectedFields = getExpectedFields(jenis);

  const tesseract = await getTesseractWorker();

  if (!tesseract) {
    // Stub OCR — return placeholder fields dengan low confidence
    return {
      success: true,
      fields: expectedFields.map((f) => ({ field: f, value: "", confidence: 0 })),
      rawText: "",
      overallConfidence: 0,
      processingTimeMs: Date.now() - start,
      retryCount,
    };
  }

  try {
    const { data } = await tesseract.recognize(imagePath);
    const rawText = data.text || "";

    // Ekstrak field dari raw text dengan regex sederhana
    const fields: OcrField[] = expectedFields.map((field) => {
      let value = "";
      let confidence = 0;

      // Cari pola "field: value" atau "field = value" dalam text
      const patterns = [
        new RegExp(`${field}\\s*[:=]\\s*(.+?)(?:\\n|$)`, "i"),
        new RegExp(`(?:^|\\n)\\s*${field}\\s+(\\S[^\\n]*)`, "i"),
      ];

      for (const pattern of patterns) {
        const match = rawText.match(pattern);
        if (match?.[1]) {
          value = match[1].trim();
          break;
        }
      }

      // Confidence: high jika ditemukan, low jika tidak
      confidence = value ? Math.min(80 + data.confidence / 5, 95) : 0;

      return { field, value, confidence };
    });

    return {
      success: true,
      fields,
      rawText,
      overallConfidence: data.confidence || 0,
      processingTimeMs: Date.now() - start,
      retryCount,
    };
  } catch (err) {
    return {
      success: false,
      fields: expectedFields.map((f) => ({ field: f, value: "", confidence: 0 })),
      rawText: "",
      overallConfidence: 0,
      processingTimeMs: Date.now() - start,
      retryCount,
    };
  } finally {
    try { await tesseract.terminate(); } catch { /* ignore */ }
  }
}

// Validasi kualitas gambar sebelum OCR (basic check)
export function validateImageMetadata(buffer: Buffer): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Minimal size: 10KB (terlalu kecil = bukan gambar valid)
  if (buffer.length < 10240) {
    issues.push("File size too small (< 10KB), mungkin bukan gambar valid");
  }

  // Max size: 10MB
  if (buffer.length > 10 * 1024 * 1024) {
    issues.push("File size terlalu besar (> 10MB)");
  }

  // Check magic bytes: JPEG = FF D8 FF
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  if (!isJpeg) {
    issues.push("File bukan JPEG valid (magic bytes mismatch)");
  }

  return { valid: issues.length === 0, issues };
}
