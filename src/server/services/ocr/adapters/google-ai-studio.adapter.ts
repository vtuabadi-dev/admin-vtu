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
import { parsePassport } from "../passport-parser";

// ── Field Extraction Patterns ────────────────────────────

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

// ── Endorsement-specific prompts ─────────────────────────

/**
 * Prompt untuk halaman pertama paspor endorsement.
 * Mengambil data dokumen TANPA nama — nama diambil dari halaman endorsement.
 */
function getPromptPasporTanpaNama(): string {
  return `Analisis gambar Paspor Indonesia ini. JANGAN masukkan nama pemegang paspor.
Ekstrak HANYA data berikut dalam format JSON valid (tanpa markdown wrapper):
{
  "nomorPaspor": "Nomor paspor pada kanan atas (contoh: X4573266)",
  "tempatTerbitPaspor": "Kota penerbitan paspor di PALING BAWAH SEBELAH KANAN pada 'KANTOR YANG MENGELUARKAN / ISSUING OFFICE' atau 'ISSUING AUTHORITY' (contoh: MALANG) — BUKAN tempat lahir",
  "tanggalKadaluarsa": "Tanggal habis masa berlaku TEPAT DI ATAS kota penerbitan pada 'TGL. HABIS BERLAKU / DATE OF EXPIRY' atau dari baris MRZ, format YYYY-MM-DD (contoh: 2034-12-10)",
  "tanggalTerbitPaspor": "Tanggal penerbitan DI SEBELAH KIRI tanggal kadaluarsa pada 'TGL. PENGELUARAN / DATE OF ISSUE', format YYYY-MM-DD (contoh: 2024-12-10)",
  "rawText": "Teks mentah paspor termasuk 2 baris MRZ di bagian bawah"
}`;
}

/**
 * Prompt untuk halaman kedua paspor — lembar endorsement nama.
 * Mengambil HANYA nama yang tertera di halaman endorsement.
 */
function getPromptPasporEndorsementNama(): string {
  return `Ini adalah halaman endorsement (halaman kedua) paspor Indonesia.
Halaman ini berisi perubahan atau penambahan nama pemegang paspor.
Ekstrak HANYA nama lengkap yang tercantum dalam format JSON valid (tanpa markdown wrapper):
{
  "namaLengkap": "Nama lengkap sesuai endorsement yang tertera di halaman ini",
  "rawText": "Teks mentah halaman endorsement"
}`;
}

// ── Main prompt selector ──────────────────────────────────

function getPromptForMode(jenis: DokumenJenis, mode?: string): string {
  if (mode === "paspor_tanpa_nama") return getPromptPasporTanpaNama();
  if (mode === "paspor_endorsement_nama") return getPromptPasporEndorsementNama();
  return getPromptForJenis(jenis);
}

/** Fields yang diekstrak berdasarkan mode */
function getFieldsForMode(jenis: DokumenJenis, mode?: string): string[] {
  if (mode === "paspor_tanpa_nama") {
    return ["nomorPaspor", "tempatTerbitPaspor", "tanggalTerbitPaspor", "tanggalKadaluarsa"];
  }
  if (mode === "paspor_endorsement_nama") {
    return ["namaLengkap"];
  }
  return getExpectedFields(jenis);
}

function getPromptForJenis(jenis: DokumenJenis): string {
  switch (jenis) {
    case "paspor":
      return `Analisis gambar Paspor Indonesia ini. Paspor Indonesia memiliki tata letak halaman data sebagai berikut:
1. "nomorPaspor": Nomor paspor pada kanan atas di kolom 'NO. PASPOR / PASSPORT NO.' (contoh: X4573266)
2. "namaLengkap": Nama pemegang paspor pada 'NAMA LENGKAP / FULL NAME' (contoh: MUCHAMAD ZAMRONI)
3. "tempatTerbitPaspor": Kota tempat penerbitan paspor yang terletak di PALING BAWAH SEBELAH KANAN pada kolom 'KANTOR YANG MENGELUARKAN / ISSUING OFFICE' atau 'ISSUING AUTHORITY' (contoh: MALANG, JAKARTA) — BUKAN tempat lahir.
4. "tanggalKadaluarsa": Tanggal habis masa berlaku paspor yang terletak TEPAT DI ATAS kota penerbitan paspor pada kolom 'TGL. HABIS BERLAKU / DATE OF EXPIRY' atau 'BERLAKU S/D' atau dari baris MRZ, format YYYY-MM-DD (contoh: 2034-12-10).
5. "tanggalTerbitPaspor": Tanggal penerbitan paspor yang terletak DI SEBELAH KIRI tanggal kadaluarsa pada kolom 'TGL. PENGELUARAN / DATE OF ISSUE', format YYYY-MM-DD (contoh: 2024-12-10).
6. "tempatLahir": Tempat lahir pada 'TEMPAT LAHIR / PLACE OF BIRTH' (contoh: MALANG)
7. "tanggalLahir": Tanggal lahir pada 'TGL. LAHIR / DATE OF BIRTH', format YYYY-MM-DD (contoh: 1992-08-12)
8. "rawText": Teks mentah lengkap termasuk 2 baris MRZ di bagian bawah paspor

Ekstrak seluruh data di atas dalam format JSON valid (tanpa markdown wrapper):
{
  "namaLengkap": "...",
  "nomorPaspor": "...",
  "tempatTerbitPaspor": "...",
  "tanggalTerbitPaspor": "YYYY-MM-DD",
  "tanggalKadaluarsa": "YYYY-MM-DD",
  "tempatLahir": "...",
  "tanggalLahir": "YYYY-MM-DD",
  "rawText": "..."
}`;
    case "ktp":
      return `Analisis gambar KTP (Kartu Tanda Penduduk) ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama lengkap",
  "nik": "NIK 16 digit",
  "tanggalLahir": "YYYY-MM-DD",
  "tempatLahir": "Tempat lahir",
  "rawText": "Teks mentah KTP"
}`;
    case "kk":
      return `Analisis gambar Kartu Keluarga ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama kepala keluarga / anggota",
  "nik": "NIK 16 digit",
  "rawText": "Teks mentah KK"
}`;
    case "akta":
      return `Analisis gambar Akta Lahir ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama lengkap",
  "nik": "NIK jika ada",
  "tanggalLahir": "YYYY-MM-DD",
  "tempatLahir": "Tempat lahir",
  "rawText": "Teks mentah Akta"
}`;
    case "vaksin":
      return `Analisis gambar Sertifikat Vaksin ini dan ekstrak data terstruktur berikut dalam format JSON:
{
  "namaLengkap": "Nama lengkap pemegang sertifikat",
  "rawText": "Teks mentah sertifikat"
}`;
    default:
      return `Extract all plain text, names, dates, document numbers, and details from this image accurately.`;
  }
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

    // ── Model Selection (try gemini-2.0-flash, fallback to gemini-1.5-flash) ──
    const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
    const mode = config.mode;
    const promptText = getPromptForMode(jenis, mode);

    let lastError: { statusCode?: number; message: string } | null = null;

    for (const modelName of candidateModels) {
      console.log(
        `[AI Studio Adapter] ▶ CALL API | model=${modelName} | key=***${keySuffix} | jenis=${jenis}${mode ? ` | mode=${mode}` : ""} | imgSize=${imgSizeKB}KB | retry=#${retryCount}`
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
                  { text: promptText },
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

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text().catch(() => "");
          const errMsg = `Model ${modelName} HTTP ${geminiRes.status}: ${errBody.slice(0, 200)}`;
          console.warn(`[AI Studio Adapter] ⚠️ ${errMsg}`);
          lastError = { statusCode: geminiRes.status, message: errMsg };
          // If rate limit 429 or quota, don't waste time with other models on same key
          if (geminiRes.status === 429) {
            break;
          }
          continue;
        }

        const gData = await geminiRes.json();
        const fullText = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const textLen = fullText.length;

        // Try parsing JSON response from Gemini
        let parsedJson: Record<string, any> | null = null;
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedJson = JSON.parse(jsonMatch[0]);
          }
        } catch {
          /* non-blocking — fallback to regex extractField */
        }

        // Jika paspor, gunakan parser paspor untuk normalisasi tanggal, MRZ, dan resolusi alias key
        let passportParsed: ReturnType<typeof parsePassport> | null = null;
        if (jenis === "paspor" || mode?.startsWith("paspor")) {
          passportParsed = parsePassport(fullText, parsedJson);
        }

        const expectedFields = getFieldsForMode(jenis, mode);
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

        console.log(
          `[AI Studio Adapter] ✅ SUCCESS | model=${modelName} | key=***${keySuffix} | textLength=${textLen} chars | totalMs=${Date.now() - start}ms`
        );

        return {
          success: true,
          fields,
          rawText: fullText,
          overallConfidence: fullText ? 0.95 : 0,
          processingTimeMs: Date.now() - start,
          retryCount,
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        const isTimeout = msg.includes("timeout") || msg.includes("abort");
        console.error(
          `[AI Studio Adapter] ❌ ${isTimeout ? "TIMEOUT" : "NETWORK ERROR"} | model=${modelName} | key=***${keySuffix} | ${msg.slice(0, 150)}`
        );
        lastError = { statusCode: undefined, message: msg };
      }
    }

    // If all models failed, throw lastError to trigger rotation/retry in gateway
    throw lastError || { statusCode: undefined, message: "All candidate Gemini models failed" };
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
