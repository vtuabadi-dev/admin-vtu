// Google Cloud Vision OCR Provider
// OCR diproses synchronous via Google Vision API (tanpa queue/worker/Redis).
// Set OCR_PROVIDER=google-vision + GOOGLE_VISION_API_KEY di .env

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./provider";
import { getExpectedFields } from "./provider";
import fs from "fs";

// ── API Key Management ───────────────────────────────────────
// Support multiple keys (comma-separated) with auto-rotation on rate limit.
// GOOGLE_VISION_API_KEY=key1,key2,key3
// atau eja satu per satu: GOOGLE_VISION_API_KEY_2, _3, dst.

function getApiKeys(): string[] {
  const main = process.env.GOOGLE_VISION_API_KEY ?? "";
  const keys = main
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  for (let i = 2; i <= 20; i++) {
    const extra = process.env[`GOOGLE_VISION_API_KEY_${i}`];
    if (extra?.trim()) keys.push(extra.trim());
  }

  return keys;
}

let keyIndex = 0;

function getNextApiKey(keys: string[]): string | null {
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length]!;
  keyIndex++;
  return key;
}

// ── Field Extraction ─────────────────────────────────────────

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
    // KTP Indonesia: "Tempat/Tgl Lahir: JAKARTA, 15-07-1980"
    /Tempat\s*\/?\s*Tgl?\s*\.?\s*Lahir\s*:\s*([^,]+)/i,
  ],
  masaBerlaku: [
    /Berlaku\s*(?:sampai|hingga)?\s*:\s*([\d\-/]+)/i,
    /Expiry\s*Date\s*:\s*([\d\-/]+)/i,
  ],
};

export function extractField(text: string, field: string): string {
  const patterns = FIELD_PATTERNS[field] ?? [];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match?.[1]) return match[1].trim();
  }

  // Fallback: return first line containing the field name
  for (const line of text.split("\n")) {
    if (line.toLowerCase().includes(field.toLowerCase())) {
      return line.replace(/^[^:]*:\s*/, "").trim();
    }
  }

  return "";
}

// ── Provider ──────────────────────────────────────────────────

export function createGoogleVisionProvider(): OcrProvider {
  return {
    name: "google-vision",

    async recognize(imagePath: string, jenis: DokumenJenis, retryCount = 0): Promise<OcrResult> {
      const keys = getApiKeys();
      if (keys.length === 0) {
        return {
          success: false,
          fields: [],
          rawText: "GOOGLE_VISION_API_KEY not set",
          overallConfidence: 0,
          processingTimeMs: 0,
          retryCount,
        };
      }

      const start = Date.now();

      let imageBuffer: Buffer;
      try {
        imageBuffer = fs.readFileSync(imagePath);
      } catch (err) {
        return {
          success: false,
          fields: [],
          rawText: `Cannot read image file: ${(err as Error).message}`,
          overallConfidence: 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      }
      const base64 = imageBuffer.toString("base64");

      let lastError = "";
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const apiKey = getNextApiKey(keys)!;

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
              signal: AbortSignal.timeout(30000),
            },
          );

          // Rate limit → coba key berikutnya
          if (res.status === 429) {
            lastError = `Rate limited on key #${(keyIndex - 1) % keys.length + 1}`;
            continue;
          }

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return {
              success: false,
              fields: [],
              rawText: text,
              overallConfidence: 0,
              processingTimeMs: Date.now() - start,
              retryCount,
            };
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
        } catch (err) {
          lastError = (err as Error).message;
        }
      }

      return {
        success: false,
        fields: [],
        rawText: lastError || "All API keys exhausted",
        overallConfidence: 0,
        processingTimeMs: Date.now() - start,
        retryCount,
      };
    },

    validateImage(buffer: Buffer): ImageMetaCheck {
      const issues: string[] = [];
      if (buffer.length < 10240) issues.push("File terlalu kecil (< 10KB)");
      if (buffer.length > 10 * 1024 * 1024) issues.push("File terlalu besar (> 10MB)");

      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      if (!isJpeg && !isPng) {
        issues.push("File bukan JPEG/PNG valid (magic bytes mismatch)");
      }

      return { valid: issues.length === 0, issues };
    },
  };
}
