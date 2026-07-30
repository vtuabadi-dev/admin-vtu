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

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    try {
      // 1. Try Google Cloud Vision API
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
      ).catch(() => null);

      if (res && res.ok) {
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
      }

      // 2. Fallback: If Key is a Google AI Studio (Gemini) Key, try Gemini Flash models
      for (const modelName of ["gemini-2.0-flash", "gemini-1.5-flash"]) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Extract all plain text from this image exactly as written." },
                  { inline_data: { mime_type: mimeType, data: base64 } }
                ]
              }]
            }),
            signal: AbortSignal.timeout(config.timeout ?? 30000),
          }
        ).catch(() => null);

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
      }

      // If both Cloud Vision & Gemini Vision failed, handle error without disabling Google AI Studio keys
      const text = res ? await res.text().catch(() => "") : "Gemini & Vision OCR request failed";
      throw { statusCode: res?.status || 500, message: text.slice(0, 500) };
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
      // 1. Check Google Cloud Vision API endpoint
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

      if (res.ok || res.status === 429) {
        return { ok: true, message: "Connected! (Google Cloud Vision API Valid)" };
      }

      // 2. Check if key is a valid Google AI Studio (Gemini) API Key
      const resGemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      ).catch(() => null);

      if (resGemini?.ok) {
        return { ok: true, message: "Connected! (Google AI Studio / Gemini API Key Valid 🎉)" };
      }

      const text = await res.text().catch(() => "");
      let reason = "Periksa API key / Google AI Studio Key";
      try {
        const json = JSON.parse(text);
        if (json?.error?.message) {
          reason = json.error.message;
        }
      } catch (e) {
        if (text) reason = text.slice(0, 200);
      }
      return { ok: false, message: `Authentication failed (HTTP ${res.status}): ${reason}` };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Connection failed" };
    }
  },
};
