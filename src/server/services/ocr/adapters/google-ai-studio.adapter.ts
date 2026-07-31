// ============================================================
// Google AI Studio OCR Adapter (Gemini Multimodal)
// ============================================================
// Implements OcrAdapter for Google AI Studio (Gemini 2.0 / 1.5 Flash).
// Uses generativelanguage.googleapis.com API.
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

export const googleAiStudioAdapter: OcrAdapter = {
  type: "google_ai_studio",

  async recognize(
    imageBuffer: Buffer,
    jenis: DokumenJenis,
    config: OcrAdapterConfig,
    retryCount = 0,
  ): Promise<OcrResult> {
    const start = Date.now();
    const apiKey = config.apiKey;
    const base64 = imageBuffer.toString("base64");

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    let lastStatusCode: number | undefined;
    let lastErrorMessage = "";

    try {
      // Pure 100% Google AI Studio (Gemini Flash Multimodal OCR)
      for (const modelName of ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"]) {
        let geminiRes: Response | null = null;

        try {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: "Extract all plain text, prices, dates, hotel names, and details from this image exactly as written, word for word." },
                    { inline_data: { mime_type: mimeType, data: base64 } }
                  ]
                }]
              }),
              signal: AbortSignal.timeout(config.timeout ?? 30000),
            }
          );
        } catch (fetchErr: any) {
          // Network error or timeout — record and try next model
          lastErrorMessage = fetchErr?.message || String(fetchErr);
          const isTimeout = lastErrorMessage.includes("timeout") || lastErrorMessage.includes("abort");
          if (isTimeout) {
            lastStatusCode = undefined;
            lastErrorMessage = `Timeout pada model ${modelName}: ${lastErrorMessage}`;
          }
          continue;
        }

        if (geminiRes && geminiRes.ok) {
          const gData = await geminiRes.json();
          const fullText = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
        }

        // Response exists but NOT ok — capture the REAL status code
        if (geminiRes) {
          lastStatusCode = geminiRes.status;
          const errBody = await geminiRes.text().catch(() => "");
          lastErrorMessage = `Model ${modelName} HTTP ${geminiRes.status}: ${errBody.slice(0, 300)}`;

          // 401 = invalid key, no point trying other models
          if (geminiRes.status === 401) {
            throw { statusCode: 401, message: `API key tidak valid (HTTP 401). ${errBody.slice(0, 200)}` };
          }

          // 403/429 = quota/rate limit, might apply to all models under the same key
          if (geminiRes.status === 403 || geminiRes.status === 429) {
            // Try next model, but if all fail we'll throw the real 403/429
            continue;
          }

          // Other errors (5xx etc) — try next model
          continue;
        }
      }

      // All 3 models failed — throw the REAL last status code, not a fake 401
      throw {
        statusCode: lastStatusCode || 500,
        message: lastErrorMessage || "Semua model Google AI Studio gagal merespons.",
      };
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode) {
        throw err;
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
      // 100% Pure Google AI Studio Key Check
      const resGemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      ).catch(() => null);

      if (resGemini && resGemini.ok) {
        return { ok: true, message: "Connected! (Google AI Studio API Key Valid 🎉)" };
      }

      return { ok: false, message: "Authentication failed — Kunci Google AI Studio tidak valid." };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Connection failed" };
    }
  },
};

// Export backward compatible alias
export const googleVisionAdapter = googleAiStudioAdapter;
