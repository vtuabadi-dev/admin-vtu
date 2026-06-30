// ============================================================
// Google Vision OCR Adapter
// ============================================================
// Implements OcrAdapter for Google Cloud Vision API.
// Uses TEXT_DETECTION feature. API key from OcrProvider table.
// No filesystem access — pure Buffer → base64 → API.
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrAdapter, OcrAdapterConfig } from "./adapter.interface";
import type { OcrResult, ImageMetaCheck } from "../provider";
import { getExpectedFields } from "../provider";

// ── Field Extraction Patterns ────────────────────────────

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  namaLengkap: [
    /Nama\s*:\s*(.+)/i, /NAME\s*:\s*(.+)/i,
    /Surname\s*:\s*(.+)/i, /Given\s*Names?\s*:\s*(.+)/i,
  ],
  nomorPaspor: [
    /Paspor\s*(?:No|Number)?\s*:\s*([A-Z0-9]+)/i,
    /Passport\s*(?:No|Number)?\s*:\s*([A-Z0-9]+)/i,
  ],
  nik: [
    /NIK\s*:\s*(\d+)/i, /KTP\s*(?:No|Number)?\s*:\s*(\d+)/i,
  ],
  tanggalLahir: [
    /Tempat\s*\/?\s*Tgl?\s*\.?\s*Lahir\s*:\s*.+?,\s*([\d\-/]+)/i,
    /Tanggal\s*Lahir\s*:\s*([\d\-/]+)/i,
    /Tgl?\s*\.?\s*Lahir\s*:\s*([\d\-/]+)/i,
    /Date\s*of\s*Birth\s*:\s*([\d\-/]+)/i,
  ],
  tempatLahir: [
    /Tempat\s*Lahir\s*:\s*(.+)/i,
    /Place\s*of\s*Birth\s*:\s*(.+)/i,
    /Tempat\s*\/?\s*Tgl?\s*\.?\s*Lahir\s*:\s*([^,]+)/i,
  ],
  masaBerlaku: [
    /Berlaku\s*(?:sampai|hingga)?\s*:\s*([\d\-/]+)/i,
    /Expiry\s*Date\s*:\s*([\d\-/]+)/i,
  ],
};

function extractField(text: string, field: string): string {
  const patterns = FIELD_PATTERNS[field] ?? [];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  for (const line of text.split("\n")) {
    if (line.toLowerCase().includes(field.toLowerCase())) {
      return line.replace(/^[^:]*:\s*/, "").trim();
    }
  }
  return "";
}

// ── Adapter Implementation ───────────────────────────────

export const googleVisionAdapter: OcrAdapter = {
  type: "google_vision",

  async recognize(
    imageBuffer: Buffer,
    jenis: DokumenJenis,
    config: OcrAdapterConfig,
    retryCount = 0,
  ): Promise<OcrResult> {
    const start = Date.now();
    const apiKey = config.apiKey;
    const base64 = imageBuffer.toString("base64");

    try {
      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            }],
          }),
          signal: AbortSignal.timeout(config.timeout ?? 30000),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw { statusCode: res.status, message: text.slice(0, 500) };
      }

      const data = await res.json();
      const fullText: string = data?.responses?.[0]?.fullTextAnnotation?.text ?? "";

      const expectedFields = getExpectedFields(jenis);
      const fields = expectedFields.map((field) => {
        const value = extractField(fullText, field);
        return { field, value, confidence: value ? 0.9 : 0 };
      });

      return {
        success: true,
        fields,
        rawText: fullText,
        overallConfidence: fullText ? 0.9 : 0,
        processingTimeMs: Date.now() - start,
        retryCount,
      };
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode) {
        throw err; // Re-throw structured error for health monitor
      }
      throw { statusCode: undefined, message: err?.message || String(err) };
    }
  },

  validateImage(buffer: Buffer): ImageMetaCheck {
    const issues: string[] = [];
    if (buffer.length < 10240) issues.push("File terlalu kecil (< 10KB)");
    if (buffer.length > 10 * 1024 * 1024) issues.push("File terlalu besar (> 10MB)");

    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    if (!isJpeg && !isPng) issues.push("File bukan JPEG/PNG valid");

    return { valid: issues.length === 0, issues };
  },

  async testConnection(config: OcrAdapterConfig): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: "iVBORw0KGgo=" }, // minimal 1x1 pixel PNG
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            }],
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: `Authentication failed (HTTP ${res.status}) — periksa API key` };
      }
      if (res.ok || res.status === 429) {
        return { ok: true, message: res.status === 429 ? "Connected (rate limited)" : "Connected" };
      }
      const text = await res.text().catch(() => "");
      return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Connection failed" };
    }
  },
};
