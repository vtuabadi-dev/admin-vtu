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
    const keySuffix = apiKey.slice(-6); // Last 6 chars for logging (safe)
    const base64 = imageBuffer.toString("base64");
    const imgSizeKB = Math.round(imageBuffer.length / 1024);

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    // ── Single model call — quota is per-KEY, not per-model ──
    // Trying multiple models with the same key wastes quota!
    const modelName = "gemini-2.0-flash";

    console.log(
      `[AI Studio Adapter] ▶ CALL API | model=${modelName} | key=***${keySuffix} | jenis=${jenis} | imgSize=${imgSizeKB}KB | retry=#${retryCount}`
    );

    try {
      const fetchStart = Date.now();
      const geminiRes = await fetch(
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
      const fetchMs = Date.now() - fetchStart;

      console.log(
        `[AI Studio Adapter] ◀ RESPONSE | model=${modelName} | key=***${keySuffix} | HTTP ${geminiRes.status} | ${fetchMs}ms`
      );

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const fullText = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const textLen = fullText.length;
        const expectedFields = getExpectedFields(jenis);
        const fields = expectedFields.map((field) => {
          const value = extractField(fullText, field);
          return { field, value, confidence: value ? 0.9 : 0 };
        });

        console.log(
          `[AI Studio Adapter] ✅ SUCCESS | key=***${keySuffix} | textLength=${textLen} chars | totalMs=${Date.now() - start}ms`
        );

        return {
          success: true,
          fields,
          rawText: fullText,
          overallConfidence: fullText ? 0.9 : 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      }

      // NOT ok — capture real status code
      const errBody = await geminiRes.text().catch(() => "");
      const errMsg = `Model ${modelName} HTTP ${geminiRes.status}: ${errBody.slice(0, 300)}`;

      console.error(
        `[AI Studio Adapter] ❌ FAIL | key=***${keySuffix} | HTTP ${geminiRes.status} | ${errMsg.slice(0, 150)}`
      );

      // Throw with REAL status code — let gateway handle retry with different KEY
      throw { statusCode: geminiRes.status, message: errMsg };

    } catch (err: any) {
      // If it already has statusCode, re-throw as-is
      if (err?.statusCode) {
        throw err;
      }
      // Network/timeout error
      const msg = err?.message || String(err);
      const isTimeout = msg.includes("timeout") || msg.includes("abort");
      console.error(
        `[AI Studio Adapter] ❌ ${isTimeout ? "TIMEOUT" : "NETWORK ERROR"} | key=***${keySuffix} | ${msg.slice(0, 150)}`
      );
      throw { statusCode: undefined, message: msg };
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
