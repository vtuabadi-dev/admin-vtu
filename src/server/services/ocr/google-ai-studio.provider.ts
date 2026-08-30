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
import { parseKtp } from "./ktp-parser";
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

async function getAllAvailableApiKeys(): Promise<string[]> {
  const keys: string[] = [];

  try {
    const { loadProviders } = await import("./registry");
    const { reactivateExpiredCooldowns, isInCooldown } = await import("./cooldown-manager");
    const providers = await loadProviders();
    await reactivateExpiredCooldowns(providers);

    const active = providers.filter((p) => p.isActive && p.apiKey?.trim());
    active.sort((a, b) => {
      const inCoolA = isInCooldown(a) ? 1 : 0;
      const inCoolB = isInCooldown(b) ? 1 : 0;
      if (inCoolA !== inCoolB) return inCoolA - inCoolB;
      const tA = a.cooldownUntil ? new Date(a.cooldownUntil).getTime() : 0;
      const tB = b.cooldownUntil ? new Date(b.cooldownUntil).getTime() : 0;
      return tA - tB;
    });

    for (const p of active) {
      if (p.apiKey?.trim()) keys.push(p.apiKey.trim());
    }
  } catch (e) {
    // Graceful fallback to env vars
  }

  const envMain = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY || "";
  if (envMain) {
    keys.push(...envMain.split(",").map((k) => k.trim()).filter(Boolean));
  }

  for (let i = 2; i <= 20; i++) {
    const extra = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_VISION_API_KEY_${i}`];
    if (extra?.trim()) keys.push(extra.trim());
  }

  const uniqueKeys: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (k && !seen.has(k)) {
      seen.add(k);
      uniqueKeys.push(k);
    }
  }

  return uniqueKeys;
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
    const start = Date.now();
    const keys = await getAllAvailableApiKeys();

    if (keys.length === 0) {
      return {
        success: false,
        fields: [],
        rawText: "GEMINI_API_KEY / GOOGLE_VISION_API_KEY tidak dikonfigurasi.",
        overallConfidence: 0,
        processingTimeMs: Date.now() - start,
        retryCount,
      };
    }

    const base64 = imageBuffer.toString("base64");

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    let lastError = "";
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const apiKey = keys[attempt]!;

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
  "nik": "NIK 16 digit yang direkonstruksi dari 16 digit paling belakang MRZ line 2 disisipkan YY tahun kelahiran (contoh: 3573021208920002)",
  "rawText": "Teks mentah paspor termasuk persis 2 baris MRZ di bagian bawah"
}`
          : jenis === "ktp"
          ? `Analisis gambar KTP (Kartu Tanda Penduduk) Indonesia ini dan ekstrak data terstruktur berikut dalam format JSON valid:
{
  "nik": "16 digit NIK (contoh: 3174051207800001)",
  "namaLengkap": "Nama lengkap pada KTP",
  "tempatLahir": "Tempat lahir",
  "tanggalLahir": "Tanggal lahir format YYYY-MM-DD",
  "jenisKelamin": "LAKI-LAKI atau PEREMPUAN",
  "statusPerkawinan": "Status perkawinan pada KTP (contoh: KAWIN, BELUM KAWIN, CERAI HIDUP, CERAI MATI)",
  "alamat": "Alamat / nama jalan (tanpa RT/RW)",
  "rt": "Nomor RT (contoh: 002)",
  "rw": "Nomor RW (contoh: 005)",
  "kelurahan": "Nama kelurahan / desa",
  "kecamatan": "Nama kecamatan",
  "kota": "Nama kota atau kabupaten (contoh: KOTA SURABAYA atau KABUPATEN MALANG)",
  "provinsi": "Nama provinsi (contoh: JAWA TIMUR)",
  "alamatLengkap": "Gabungan lengkap: {Alamat}, RT.{RT}/RW.{RW}, Kel. {Kelurahan}, Kec. {Kecamatan}, {Kota}",
  "rawText": "Teks mentah lengkap KTP"
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

        const candidateModels = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-pro-latest"];
        const genAI = new GoogleGenerativeAI(apiKey);
        let fullText = "";

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
              },
            });

            const result = await model.generateContent([
              promptText,
              {
                inlineData: {
                  data: base64,
                  mimeType,
                },
              },
            ]);

            fullText = result.response.text() || "";
            if (fullText) break;
          } catch (e: any) {
            const msg = e?.message || String(e);
            lastError = msg;
            if (msg.includes("429") || msg.includes("quota")) break;
          }
        }

        if (!fullText) {
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

        let ktpParsed: ReturnType<typeof parseKtp> | null = null;
        if (jenis === "ktp") {
          ktpParsed = parseKtp(fullText, parsedJson);
        }

        const expectedFields = getExpectedFields(jenis);
        const fields = expectedFields.map((field) => {
          let value = "";
          if (passportParsed && field in passportParsed) {
            value = String((passportParsed as any)[field] || "").trim();
          } else if (ktpParsed && field in ktpParsed) {
            value = String((ktpParsed as any)[field] || "").trim();
          } else if (parsedJson && parsedJson[field]) {
            value = String(parsedJson[field]).trim();
          }
          if (!value && ktpParsed) {
            if (field === "kota") value = ktpParsed.kotaKabupaten || ktpParsed.kota || "";
            else if (field === "alamat") value = ktpParsed.alamatJalan || "";
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
