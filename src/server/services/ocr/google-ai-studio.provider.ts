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
import { parsePassport } from "./passport-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  namaLengkap: [
    /(?:NAMA\s*LENGKAP(?:\s*\/\s*FULL\s*NAME)?|FULL\s*NAME|SURNAME|NAMA|NAME)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|Kewarganegaraan|Nationality|IDN|$)/i,
    /Nama\s*:\s*(.+)/i, /NAME\s*:\s*(.+)/i,
  ],
  nomorPaspor: [
    /(?:NO\.?\s*PASPOR(?:\s*\/\s*PASSPORT\s*NO\.?)?|PASSPORT\s*(?:NO|NUMBER)\.?|PASPOR\s*(?:NO|NUMBER)\.?|NOMOR\s*PASPOR|PASSPORT\s*:|PASPOR\s*:)\s*[:=]?\s*([A-Z0-9]+)/i,
    /\b([A-Z]\d{7,8})\b/i,
  ],
  tempatTerbitPaspor: [
    /(?:KANTOR\s*(?:YANG\s*)?MENGELUARKAN(?:\s*\/\s*ISSUING\s*AUTHORITY)?|ISSUING\s*AUTHORITY|KANTOR\s*IMIGRASI|ISSUING\s*OFFICE|DITERBITKAN\s*DI(?:\s*\/\s*PLACE\s*OF\s*ISSUE)?|PLACE\s*OF\s*ISSUE)\s*[:=]?\s*([A-Z\s.,'-]+?)(?:\r?\n|$)/i,
    /1A[0-9A-Z]{10,}\s*\r?\n?\s*([A-Z\s]+?)(?:\r?\n|$)/i,
  ],
  tanggalTerbitPaspor: [
    /(?:TGL\.?\s*PENGELUARAN(?:\s*\/\s*DATE\s*OF\s*ISSUE)?|DATE\s*OF\s*ISSUE|TANGGAL\s*PENGELUARAN|TANGGAL\s*TERBIT|TGL\.?\s*TERBIT|ISSUE\s*DATE)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[^\r\n]+)/i,
  ],
  tanggalKadaluarsa: [
    /(?:BERLAKU\s*S\/?D\.?(?:\s*\/\s*DATE\s*OF\s*EXPIRY)?|DATE\s*OF\s*EXPIRY|TANGGAL\s*KADALUARSA|EXPIRY\s*DATE|BERLAKU\s*(?:HINGGA|SAMPAI)|MASA\s*BERLAKU)\s*[:=]?\s*(\d{1,2}[ \-/]+[A-Za-z]+[ \-/]+\d{4}|\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[^\r\n]+)/i,
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
        const promptText = jenis === "paspor"
          ? `Analisis gambar Paspor Indonesia ini dan ekstrak data terstruktur berikut dalam format JSON valid:
{
  "namaLengkap": "Nama lengkap pemegang paspor (contoh: MUCHAMAD ZAMRONI)",
  "nomorPaspor": "Nomor paspor (contoh: X4573266)",
  "tempatTerbitPaspor": "Kantor/kota penerbitan paspor dari kolom 'KANTOR YANG MENGELUARKAN / ISSUING AUTHORITY' atau 'KANTOR IMIGRASI' (BUKAN tempat lahir, contoh: MALANG)",
  "tanggalTerbitPaspor": "Tanggal penerbitan dari 'TGL. PENGELUARAN / DATE OF ISSUE' dalam format YYYY-MM-DD (contoh: 2024-12-10)",
  "tanggalKadaluarsa": "Tanggal habis masa berlaku dari 'BERLAKU S/D / DATE OF EXPIRY' atau baris MRZ dalam format YYYY-MM-DD (contoh: 2034-12-10)",
  "tempatLahir": "Tempat lahir dari 'TEMPAT LAHIR / PLACE OF BIRTH'",
  "tanggalLahir": "Tanggal lahir dari 'TGL. LAHIR / DATE OF BIRTH' dalam format YYYY-MM-DD",
  "rawText": "Teks mentah paspor termasuk 2 baris MRZ di bagian bawah"
}`
          : `Analisis gambar dokumen ${jenis} ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama lengkap pemegang paspor / dokumen",
  "nomorPaspor": "Nomor paspor jika dokumen paspor",
  "nik": "NIK jika KTP/KK/Akta",
  "tanggalLahir": "YYYY-MM-DD",
  "tempatLahir": "Tempat lahir",
  "masaBerlaku": "YYYY-MM-DD",
  "rawText": "Teks mentah"
}`;

        const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        const payload = {
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: mimeType, data: base64 } }
            ]
          }]
        };

        let fullText = "";
        let modelSuccess = false;

        for (const modelName of candidateModels) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(30000),
            });

            const resJson = await res.json().catch(() => null);

            if (resJson?.candidates?.[0]?.content?.parts?.[0]?.text) {
              const rawText = resJson.candidates[0].content.parts[0].text;
              fullText = rawText;
              modelSuccess = true;
              break;
            } else if (resJson?.error) {
              lastError = resJson.error.message;
              if (res.status === 429) break;
            }
          } catch (e: any) {
            lastError = e?.message || String(e);
          }
        }

        if (!modelSuccess) {
          continue; // Coba key berikutnya
        }

        const cleanText = fullText.replace(/```json/gi, "").replace(/```/g, "").trim();
        let parsedJson: Record<string, any> | null = null;
        try {
          parsedJson = JSON.parse(cleanText);
        } catch {
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { parsedJson = JSON.parse(jsonMatch[0]); } catch {}
          }
        }

        let passportParsed: ReturnType<typeof parsePassport> | null = null;
        if (jenis === "paspor") {
          passportParsed = parsePassport(fullText, parsedJson);
        }

        const expectedFields = getExpectedFields(jenis);
        const fields = expectedFields.map((field) => {
          let value = "";
          if (passportParsed && field in passportParsed) {
            value = String((passportParsed as any)[field] || "").trim();
          } else if (parsedJson && parsedJson[field]) {
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
