// ============================================================
// FLIGHT TICKET OCR SERVICE — Gemini Vision AI (Image & PDF)
// Reads e-tickets, GDS PNR sheets, screenshots, physical ticket photos
// Extracts multi-segment flight details for Keberangkatan
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/server/db/client";
import type { FlightSegment } from "@/shared/types";

export interface FlightOcrResult {
  success: boolean;
  pnrMain: string;
  maskapai?: string;
  segments: FlightSegment[];
  rawText?: string;
  confidence: number;
  error?: string;
}

async function getGeminiApiKey(): Promise<string> {
  try {
    const dbProviders = await prisma.ocrProvider.findMany({
      where: { isActive: true },
      orderBy: { rotationOrder: "asc" },
    });
    for (const p of dbProviders) {
      const typeStr = String(p.providerType || "").toLowerCase();
      const labelStr = String(p.label || "").toLowerCase();
      if (typeStr.includes("gemini") || typeStr.includes("google") || labelStr.includes("gemini")) {
        if (p.apiKey && p.apiKey.trim()) return p.apiKey.trim();
      }
    }
  } catch (e) {
    console.warn("[flight-ocr] Error loading DB OCR providers:", e);
  }

  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.GEMINI_API_KEY_2 ||
    "";
  return envKey.trim();
}

/**
 * Normalizes 3-letter IATA airport codes from common Indonesian city / airport names
 */
function normalizeAirportCode(val: string): string {
  if (!val) return "";
  const cleaned = val.trim().toUpperCase();
  const map: Record<string, string> = {
    SURABAYA: "SUB",
    JUANDA: "SUB",
    JAKARTA: "CGK",
    "SOEKARNO-HATTA": "CGK",
    "SOEKARNO HATTA": "CGK",
    CENGKARENG: "CGK",
    JEDDAH: "JED",
    JEDDA: "JED",
    MADINAH: "MED",
    MEDINA: "MED",
    BRUNEI: "BWN",
    "BANDAR SERI BEGAWAN": "BWN",
    KUALA_LUMPUR: "KUL",
    "KUALA LUMPUR": "KUL",
    KLIA: "KUL",
    SINGAPORE: "SIN",
    CHANGI: "SIN",
    DOHA: "DOH",
    DUBAI: "DXB",
    MUSCAT: "MCT",
    MAKASSAR: "UPG",
    "SULTAN HASANUDDIN": "UPG",
    MEDAN: "KNO",
    KUALANAMU: "KNO",
    SOLO: "SOC",
    YOGYAKARTA: "YIA",
    KULONPROGO: "YIA",
  };
  return map[cleaned] || cleaned.slice(0, 4).replace(/[^A-Z]/g, "").slice(0, 3);
}

/**
 * Formats time string to strict HH:mm or HH:mm+1
 */
function normalizeTimeString(val: string): string {
  if (!val) return "00:00";
  const cleaned = val.trim();
  const match = cleaned.match(/(\d{1,2})[:.](\d{2})(\s*\+\s*1)?/);
  if (match && match[1] && match[2]) {
    const hh = match[1].padStart(2, "0");
    const mm = match[2];
    const nextDay = match[3] ? "+1" : "";
    return `${hh}:${mm}${nextDay}`;
  }
  return cleaned;
}

/**
 * Formats date string to YYYY-MM-DD
 */
function normalizeDateString(val: string, fallbackYear?: string): string {
  if (!val) return "";
  const cleaned = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  }

  // DD Mon YYYY (e.g. 06 Sep 2026, 06 September 2026)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", mei: "05",
    jun: "06", jul: "07", aug: "08", ags: "08", agu: "08", sep: "09",
    oct: "10", okt: "10", nov: "11", dec: "12", des: "12",
  };
  const textDate = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s*(\d{4})?/i);
  if (textDate && textDate[1] && textDate[2]) {
    const day = textDate[1].padStart(2, "0");
    const monStr = textDate[2].slice(0, 3).toLowerCase();
    const mon = monthMap[monStr] || "01";
    const year = textDate[3] || fallbackYear || new Date().getFullYear().toString();
    return `${year}-${mon}-${day}`;
  }

  return cleaned;
}

/**
 * Extract multi-segment flight details from an image or PDF buffer using Gemini Vision AI
 */
export async function extractFlightTicketOcr(
  fileBuffer: Buffer,
  mimeType: string,
  referenceDepartureDate?: string
): Promise<FlightOcrResult> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      pnrMain: "",
      segments: [],
      confidence: 0,
      error: "Kunci API Gemini tidak ditemukan pada konfigurasi sistem maupun database.",
    };
  }

  const validMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];
  const effectiveMime = validMimes.includes(mimeType) ? mimeType : "image/jpeg";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const refYear = referenceDepartureDate ? referenceDepartureDate.slice(0, 4) : undefined;

    const prompt = `Anda adalah asisten AI OCR spesialis dokumen penerbangan umrah, E-Ticket maskapai (Saudia Airlines, Garuda Indonesia, Lion Air, Royal Brunei, Qatar Airways, Emirates, Scoot, Flynas, Batik Air), dan GDS PNR Booking Sheets (Sabre, Amadeus, Galileo, Altea).

TUGAS UTAMA:
Analisis berkas (gambar atau PDF) tiket penerbangan ini dengan teliti dan ekstrak seluruh segmen penerbangan (baik rute pergi, transit, maupun kepulangan) ke dalam struktur JSON valid berikut:

{
  "pnrMain": string (Kode booking PNR utama rombongan atau maskapai, contoh: "17J4HP / ROYAL BRUNEI" atau "17J4HP" atau "SV-816"),
  "maskapai": string (Nama maskapai utama, contoh: "Saudia Airlines", "Royal Brunei Airlines", "Garuda Indonesia", "Lion Air"),
  "segments": [
    {
      "tanggal": string (Format tanggal YYYY-MM-DD, contoh: "2026-09-06"),
      "kodeFlight": string (Nomor penerbangan, contoh: "1796", "SV-816", "BI-1001", "GA-980"),
      "pnr": string (Kode booking / PNR segmen ini beserta nama maskapai jika ada, contoh: "17J4HP / ROYAL BRUNEI"),
      "asal": string (Kode bandara 3 huruf IATA asal, contoh: "SUB", "CGK", "BWN", "JED", "MED"),
      "tujuan": string (Kode bandara 3 huruf IATA tujuan, contoh: "BWN", "JED", "MED", "SUB"),
      "jamBerangkat": string (Waktu keberangkatan format HH:mm, contoh: "05:00", "11:15"),
      "jamTiba": string (Waktu tiba format HH:mm atau HH:mm+1 jika tiba esok hari, contoh: "09:15", "09:35+1"),
      "terminal": string (Terminal keberangkatan/kedatangan jika tertera, contoh: "Terminal 3", "T1"),
      "isFeeder": boolean (true jika merupakan penerbangan domestik penghubung seperti SUB-CGK sebelum internasional)
    }
  ],
  "confidence": number (nilai keyakinan antara 0.0 sampai 1.0, contoh: 0.95),
  "rawText": string (ringkasan 200 karakter rute penerbangan utama)
}

ATURAN PENTING:
1. Urutkan segmen sesuai urutan kronologis penerbangan (Penerbangan Pergi Segmen 1 -> Segmen 2 jika transit -> Penerbangan Pulang Segmen 1 -> Segmen 2).
2. Format tanggal WAJIB YYYY-MM-DD. Jika tiket hanya menuliskan tanggal dan bulan (misal 06 SEP), gunakan tahun referensi ${refYear || "tahun saat ini"}.
3. Format bandara gunakan KODE IATA 3 HURUF BESAR (SUB = Surabaya, CGK = Jakarta, BWN = Brunei, JED = Jeddah, MED = Madinah, KUL = Kuala Lumpur, SIN = Singapore, DOH = Doha, DXB = Dubai).
4. HANYA kembalikan teks JSON valid tanpa format markdown backtick atau teks pembuka lainnya.`;

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-pro-latest",
      "gemini-1.5-flash",
    ];

    let result: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType: effectiveMime,
            },
          },
        ]);
        if (result) break;
      } catch (mErr: any) {
        lastError = mErr;
        console.warn(`[flight-ocr] Model ${modelName} failed (${mErr?.message}), trying next candidate...`);
      }
    }

    if (!result) {
      throw lastError || new Error("Semua model AI candidate gagal memproses berkas tiket.");
    }

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        pnrMain: "",
        segments: [],
        confidence: 0,
        rawText: text.slice(0, 300),
        error: "AI tidak dapat menemukan struktur data penerbangan yang valid pada dokumen ini.",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];

    const segments: FlightSegment[] = rawSegments.map((s: any) => ({
      tanggal: normalizeDateString(s.tanggal, refYear),
      kodeFlight: String(s.kodeFlight || "").trim().toUpperCase(),
      pnr: String(s.pnr || parsed.pnrMain || "").trim().toUpperCase(),
      asal: normalizeAirportCode(s.asal || ""),
      tujuan: normalizeAirportCode(s.tujuan || ""),
      jamBerangkat: normalizeTimeString(s.jamBerangkat || ""),
      jamTiba: normalizeTimeString(s.jamTiba || ""),
      terminal: s.terminal ? String(s.terminal).trim() : undefined,
      isFeeder: Boolean(s.isFeeder),
    }));

    return {
      success: true,
      pnrMain: String(parsed.pnrMain || "").trim().toUpperCase(),
      maskapai: parsed.maskapai || undefined,
      segments,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
      rawText: parsed.rawText || text.slice(0, 200),
    };
  } catch (err: any) {
    console.error("[flight-ocr] Extraction failed:", err);
    return {
      success: false,
      pnrMain: "",
      segments: [],
      confidence: 0,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses OCR tiket pesawat.",
    };
  }
}
