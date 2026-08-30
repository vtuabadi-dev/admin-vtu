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
import { parseKtp } from "../ktp-parser";

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
8. "nik": NIK 16 digit yang direkonstruksi dari 16 digit paling belakang MRZ line 2 disisipkan YY tahun kelahiran (contoh: 3573021208920002)
9. "rawText": Teks mentah lengkap termasuk persis 2 baris teks kode MRZ di bagian bawah paspor

Ekstrak seluruh data di atas dalam format JSON valid (tanpa markdown wrapper):
{
  "namaLengkap": "...",
  "nomorPaspor": "...",
  "tempatTerbitPaspor": "...",
  "tanggalTerbitPaspor": "YYYY-MM-DD",
  "tanggalKadaluarsa": "YYYY-MM-DD",
  "tempatLahir": "...",
  "tanggalLahir": "YYYY-MM-DD",
  "nik": "...",
  "rawText": "..."
}`;
    case "ktp":
      return `Analisis gambar KTP (Kartu Tanda Penduduk) Indonesia ini dan ekstrak data terstruktur berikut dalam format JSON valid (tanpa markdown wrapper):
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

import { GoogleGenerativeAI } from "@google/generative-ai";

async function getAllAvailableApiKeys(primaryKey?: string): Promise<string[]> {
  const keys: string[] = [];
  if (primaryKey?.trim()) {
    keys.push(primaryKey.trim());
  }

  try {
    const { loadProviders } = await import("../registry");
    const { reactivateExpiredCooldowns, isInCooldown } = await import("../cooldown-manager");
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
    const allKeys = await getAllAvailableApiKeys(config.apiKey);
    if (allKeys.length === 0) {
      throw { statusCode: 500, message: "Tidak ada Kunci API Google AI Studio yang tersedia." };
    }

    const base64 = imageBuffer.toString("base64");
    const imgSizeKB = Math.round(imageBuffer.length / 1024);

    let mimeType = "image/jpeg";
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = "image/png";
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = "image/webp";

    const candidateModels = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-pro-latest"];
    const mode = config.mode;
    const promptText = getPromptForMode(jenis, mode);

    let lastError: any = null;

    // Dual-tier Multi-Key API Router & Model Failover (Mirip OCR Flyer)
    for (let keyIdx = 0; keyIdx < allKeys.length; keyIdx++) {
      const apiKey = allKeys[keyIdx]!;
      const keySuffix = apiKey.slice(-6);
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        console.log(
          `[AI Studio Adapter] ▶ CALL SDK | key[${keyIdx + 1}/${allKeys.length}]=***${keySuffix} | model=${modelName} | jenis=${jenis}${mode ? ` | mode=${mode}` : ""} | imgSize=${imgSizeKB}KB | retry=#${retryCount}`
        );

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

          const fullText = result.response.text() || "";
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

          // Jika paspor, gunakan parser paspor untuk normalisasi tanggal, MRZ, dan resolusi alias key
          let passportParsed: ReturnType<typeof parsePassport> | null = null;
          if (jenis === "paspor" || mode?.startsWith("paspor")) {
            passportParsed = parsePassport(fullText, parsedJson);
          }

          // Jika KTP, gunakan parser KTP untuk auto-assembly alamatLengkap dan normalisasi
          let ktpParsed: ReturnType<typeof parseKtp> | null = null;
          if (jenis === "ktp") {
            ktpParsed = parseKtp(fullText, parsedJson);
          }

          const expectedFields = getFieldsForMode(jenis, mode);
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

          console.log(
            `[AI Studio Adapter] ✅ SUCCESS SDK | key=***${keySuffix} | model=${modelName} | totalMs=${Date.now() - start}ms`
          );

          return {
            success: true,
            fields,
            rawText: fullText,
            overallConfidence: 0.95,
            processingTimeMs: Date.now() - start,
            retryCount,
          };
        } catch (err: any) {
          lastError = err;
          const msg = err?.message || String(err);
          const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("ResourceExhausted");
          console.warn(`[AI Studio Adapter] ⚠️ Key ***${keySuffix} | Model ${modelName} error: ${msg.slice(0, 150)}`);
          if (isQuota) {
            // Quota habis pada key ini, langsung rotasi ke API key berikutnya!
            break;
          }
        }
      }
    }

    const errMsg = lastError?.message || "Semua Kunci API dan model Gemini gagal merespons";
    const statusCode = lastError?.status || (errMsg.includes("429") ? 429 : 500);
    throw { statusCode, message: errMsg };
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
