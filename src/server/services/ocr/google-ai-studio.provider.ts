// ============================================================
// Google AI Studio OCR Provider (Legacy Env-Var Fallback)
// ============================================================
// Uses Google AI Studio (Gemini 2.0 Flash) REST API directly.
// Key from GEMINI_API_KEY or GOOGLE_VISION_API_KEY environment variable.
// Supports multi-key rotation via GEMINI_API_KEY_2...20 or GOOGLE_VISION_API_KEY_2...20.
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrProvider, OcrResult, ImageMetaCheck } from "./provider";
import { getExpectedFields } from "./provider";

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

export function extractField(text: string, field: string): string {
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

function parseApiKeys(): string[] {
  const keys: string[] = [];

  const main = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY || "";
  if (main) {
    keys.push(...main.split(",").map((k) => k.trim()).filter(Boolean));
  }

  for (let i = 2; i <= 20; i++) {
    const extra = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_VISION_API_KEY_${i}`];
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

export class GoogleAiStudioOcrProvider implements OcrProvider {
  readonly name = "Google AI Studio OCR";

  async initialize(): Promise<void> {
    // Initialization logic if needed
  }

  async recognize(
    imageBuffer: Buffer,
    jenis: DokumenJenis,
    retryCount = 0,
  ): Promise<OcrResult> {
    const keys = parseApiKeys();

    if (keys.length === 0) {
      return {
        success: false,
        fields: [],
        rawText: "GEMINI_API_KEY / Google AI Studio Key not set",
        overallConfidence: 0,
        processingTimeMs: 0,
        retryCount,
      };
    }

    const start = Date.now();
    const base64 = imageBuffer.toString("base64");

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    let lastError = "";
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const apiKey = getNextApiKey(keys)!;

      try {
        const promptText = `Analisis gambar dokumen ${jenis} ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama lengkap pemegang paspor / dokumen",
  "nomorPaspor": "Nomor paspor jika dokumen paspor",
  "nik": "NIK jika KTP/KK/Akta",
  "tanggalLahir": "YYYY-MM-DD",
  "tempatLahir": "Tempat lahir",
  "masaBerlaku": "YYYY-MM-DD",
  "rawText": "Teks mentah"
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: mimeType, data: base64 } }
                ]
              }]
            }),
            signal: AbortSignal.timeout(30000),
          },
        );

        if (res.status === 429) {
          lastError = `Rate limited on key #${(keyIndex - 1) % keys.length + 1}`;
          continue;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return {
            success: false,
            fields: [],
            rawText: `Google AI Studio API error (HTTP ${res.status}): ${text.slice(0, 200)}`,
            overallConfidence: 0,
            processingTimeMs: Date.now() - start,
            retryCount,
          };
        }

        const gData = await res.json();
        const fullText = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        let parsedJson: Record<string, any> | null = null;
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsedJson = JSON.parse(jsonMatch[0]);
        } catch { /* fallback */ }

        const expectedFields = getExpectedFields(jenis);
        const fields = expectedFields.map((field) => {
          let value = "";
          if (parsedJson && parsedJson[field]) {
            value = String(parsedJson[field]).trim();
          }
          if (!value) {
            value = extractField(fullText, field);
          }
          return { field, value, confidence: value ? 0.95 : 0 };
        });

        return {
          success: true,
          fields,
          rawText: fullText,
          overallConfidence: fullText ? 0.95 : 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    return {
      success: false,
      fields: [],
      rawText: `Semua API key Google AI Studio gagal. Last error: ${lastError}`,
      overallConfidence: 0,
      processingTimeMs: Date.now() - start,
      retryCount,
    };
  }

  validateImage(buffer: Buffer): ImageMetaCheck {
    const issues: string[] = [];
    if (buffer.length < 10240) issues.push("File terlalu kecil (< 10KB)");
    if (buffer.length > 10 * 1024 * 1024) issues.push("File terlalu besar (> 10MB)");

    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    if (!isJpeg && !isPng) issues.push("File bukan JPEG/PNG valid");

    return { valid: issues.length === 0, issues };
  }
}

export function createGoogleAiStudioProvider(): OcrProvider {
  return new GoogleAiStudioOcrProvider();
}

export const createGoogleVisionProvider = createGoogleAiStudioProvider;
