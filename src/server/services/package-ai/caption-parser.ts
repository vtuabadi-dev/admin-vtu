// ============================================================
// CAPTION PARSER — Parse Indonesian caption text into structured
// package data. Captions follow travel agency format:
//
// "PAKET UMROH REGULER 12 HARI
//  BERANGKAT JAKARTA
//  MASKAPAI SAUDIA
//  HOTEL MEKKAH: SWISSOTEL (BINTANG 5)
//  HOTEL MADINAH: DAR AL TAQWA (BINTANG 4)
//  JADWAL: 15 JULI, 22 JULI, 5 AGUSTUS 2026
//  PROMO: DISKON 2JT UNTUK 20 PENDAFTAR PERTAMA"
// ============================================================

import type { PackageExtractionResult } from "./types";
import { resolveAirline, resolveCity, resolveHotel } from "./alias-resolver";

// ── Internal label map for title generation ──────────────────

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  umroh_reguler: "Umroh Reguler",
  umroh_plus: "Umroh Plus",
  haji_khusus: "Haji Khusus",
  wisata_halal: "Wisata Halal",
};

// ── Indonesian Month Mapping ─────────────────────────────────

const MONTH_MAP_IND: Record<string, number> = {
  JANUARI: 0,
  FEBRUARI: 1,
  MARET: 2,
  APRIL: 3,
  MEI: 4,
  JUNI: 5,
  JULI: 6,
  AGUSTUS: 7,
  SEPTEMBER: 8,
  OKTOBER: 9,
  NOVEMBER: 10,
  DESEMBER: 11,
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  JUN: 5,
  JUL: 6,
  AGS: 7,
  AGT: 7,
  SEP: 8,
  SEPT: 8,
  OKT: 9,
  NOV: 10,
  DES: 11,
};

// ── Package Type Detection ───────────────────────────────────

const PACKAGE_TYPE_PATTERNS: {
  pattern: RegExp;
  type: PackageExtractionResult["packageType"];
}[] = [
  { pattern: /UMROH?\s*(?:REGULER|STANDAR|STANDARD)/i, type: "umroh_reguler" },
  { pattern: /UMROH?\s*PLUS/i, type: "umroh_plus" },
  { pattern: /HAJI\s*KHUSUS/i, type: "haji_khusus" },
  { pattern: /WISATA\s*HALAL/i, type: "wisata_halal" },
  { pattern: /UMROH?(?:\s+\d+\s*HARI)?$/i, type: "umroh_reguler" },
];

// ── Public API ───────────────────────────────────────────────

/**
 * Extract and parse all dates from caption text.
 * Handles Indonesian date formats: "15 JULI 2026", "22 JULI", "5 AGUSTUS 2026"
 * Also handles comma-separated or "DAN"-separated lists.
 */
export function extractDates(caption: string): string[] {
  const dates: string[] = [];
  const currentYear = new Date().getFullYear();

  const datePattern = /(\d{1,2})\s+(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JAN|FEB|MAR|APR|MEI|JUN|JUL|AGS|AGT|SEP|SEPT|OKT|NOV|DES)\s*(\d{4})?/gi;

  let match: RegExpExecArray | null;
  while ((match = datePattern.exec(caption)) !== null) {
    const dayStr = match[1];
    const monthNameStr = match[2];
    const yearStr = match[3];

    if (!dayStr || !monthNameStr) continue;
    const day = parseInt(dayStr, 10);
    if (isNaN(day) || day < 1 || day > 31) continue;
    const monthName = monthNameStr.toUpperCase();
    const month = MONTH_MAP_IND[monthName];
    const year = yearStr ? parseInt(yearStr, 10) : currentYear;

    if (month !== undefined && !isNaN(year)) {
      const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!dates.includes(isoDate)) {
        dates.push(isoDate);
      }
    }
  }

  return dates.sort();
}

/**
 * Extract duration from caption — finds "X HARI" pattern.
 * Looks for patterns like "12 HARI", "9 HARI", "14 HARI"
 * near package type mentions or standalone.
 */
export function extractDuration(caption: string): number | undefined {
  const patterns = [
    // "PAKET UMROH REGULER 12 HARI"
    /(?:PAKET\s+)?\w+(?:\s+\w+)?\s+(\d{1,2})\s*HARI/i,
    // "DURASI: 12 HARI"
    /(?:DURASI|LAMA|LAMA\s+PERJALANAN)\s*[:=]?\s*(\d{1,2})\s*HARI/i,
    // "12 HARI / 11 MALAM"
    /(\d{1,2})\s*HARI\s*\/\s*\d{1,2}\s*MALAM/i,
    // standalone "X HARI"
    /(\d{1,2})\s*HARI/i,
  ];

  for (const pattern of patterns) {
    const match = caption.match(pattern);
    if (match?.[1]) {
      const days = parseInt(match[1], 10);
      if (days >= 3 && days <= 45) {
        return days;
      }
    }
  }

  return undefined;
}

/**
 * Extract hotel name for a specific city (mekkah or madinah).
 * Patterns:
 *   "HOTEL MEKKAH: SWISSOTEL (BINTANG 5)"
 *   "HOTEL MADINAH: DAR AL TAQWA (BINTANG 4)"
 */
export function extractHotel(
  caption: string,
  city: "mekkah" | "madinah"
): string | undefined {
  const cityUpper = city.toUpperCase();
  const patterns = [
    // "HOTEL MEKKAH: Swissotel (Bintang 5)"
    new RegExp(`HOTEL\\s*${cityUpper}\\s*[:=]?\\s*(.+?)(?:$|\\n|\\(BINTANG|\\s*-\\s*)`, "i"),
    // "MEKKAH: Swissotel"
    new RegExp(`${cityUpper}\\s*[:=]\\s*(.+?)(?:$|\\n|\\(BINTANG)`, "i"),
    // "HOTEL DI MEKKAH: Swissotel"
    new RegExp(`HOTEL\\s*(?:DI\\s+)?${cityUpper}\\s*[:=]\\s*(.+?)(?:$|\\n|\\(BINTANG)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = caption.match(pattern);
    if (match?.[1]) {
      return resolveHotel(match[1].trim());
    }
  }

  return undefined;
}

// ── Internal Helpers ─────────────────────────────────────────

/**
 * Detect package type from caption text.
 */
function detectPackageType(caption: string): PackageExtractionResult["packageType"] {
  const upper = caption.toUpperCase();

  for (const { pattern, type } of PACKAGE_TYPE_PATTERNS) {
    if (pattern.test(upper)) {
      return type;
    }
  }

  // Default based on keywords
  if (upper.includes("HAJI")) return "haji_khusus";
  if (upper.includes("WISATA")) return "wisata_halal";
  return "umroh_reguler";
}

/**
 * Extract promo text from caption.
 */
function extractPromo(caption: string): string | undefined {
  const patterns = [
    /PROMO\s*[:=]?\s*(.+?)(?:$|\n)/i,
    /DISKON\s*(.+?)(?:$|\n)/i,
    /EARLY\s*BIRD\s*(.+?)(?:$|\n)/i,
    /SPESIAL\s*(.+?)(?:$|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = caption.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract upgrade information (room or hotel upgrade).
 */
function extractUpgrade(caption: string): {
  roomUpgrade?: string;
  hotelUpgrade?: string;
} {
  const result: { roomUpgrade?: string; hotelUpgrade?: string } = {};

  // Room upgrade: "UPGRADE KAMAR: Double" / "ROOM: Triple"
  const roomPatterns = [
    /(?:UPGRADE\s+)?KAMAR\s*[:=]?\s*(SINGLE|DOUBLE|TRIPLE|QUAD|STANDAR|STANDARD)/i,
    /ROOM\s*[:=]?\s*(SINGLE|DOUBLE|TRIPLE|QUAD|STANDARD)/i,
    /UPGRADE\s*(?:KAMAR|ROOM)\s*[:=]?\s*(.+?)(?:$|\n)/i,
  ];

  for (const pattern of roomPatterns) {
    const match = caption.match(pattern);
    if (match?.[1]) {
      result.roomUpgrade = match[1].trim();
      break;
    }
  }

  // Hotel upgrade: "UPGRADE HOTEL: Premium" / "HOTEL: VIP"
  const hotelPatterns = [
    /(?:UPGRADE\s+)?HOTEL\s*[:=]?\s*(STANDAR|STANDARD|PREMIUM|VIP|EXECUTIVE)/i,
    /UPGRADE\s*(?:HOTEL|HOTEL\s+UPGRADE)\s*[:=]?\s*(.+?)(?:$|\n)/i,
  ];

  for (const pattern of hotelPatterns) {
    const match = caption.match(pattern);
    if (match?.[1]) {
      result.hotelUpgrade = match[1].trim();
      break;
    }
  }

  return result;
}

/**
 * Extract description from any remaining text that isn't structured.
 */
function extractDescription(caption: string): string | undefined {
  const lines = caption.split("\n").map((l) => l.trim()).filter(Boolean);
  const knownPrefixes = [
    /^PAKET\s+/i, /^BERANGKAT\s+/i, /^MASKAPAI\s+/i,
    /^HOTEL\s+/i, /^JADWAL\s+/i, /^PROMO\s+/i,
    /^DISKON\s+/i, /^DURASI\s+/i, /^HARGA\s+/i,
    /^UPGRADE\s+/i, /^ROOM\s+/i, /^KAMAR\s+/i,
    /^FASILITAS\s+/i, /^HARI\s+/i, /^\d+\s*HARI/i,
    /^INCLUSIVE/i, /^EXCLUSIVE/i, /^TERMASUK/i,
    /^TIDAK\s+TERMASUK/i,
  ];

  const descriptive = lines.filter((line) => {
    return !knownPrefixes.some((prefix) => prefix.test(line));
  });

  return descriptive.length > 0 ? descriptive.join("; ") : undefined;
}

// ── Main Parser ──────────────────────────────────────────────

/**
 * Parse a full caption text into structured extraction fields.
 * Returns a partial PackageExtractionResult with all fields
 * that can be extracted from text alone.
 */
export function parseCaption(caption: string): Partial<PackageExtractionResult> {
  const trimmed = caption.trim();
  if (!trimmed) return {};

  const packageType = detectPackageType(trimmed);
  const duration = extractDuration(trimmed);
  const dates = extractDates(trimmed);
  const promo = extractPromo(trimmed);
  const upgrades = extractUpgrade(trimmed);
  const description = extractDescription(trimmed);

  // Title: first meaningful line or package type + duration
  const firstLine = trimmed.split("\n")[0]?.trim() ?? "";
  const title = firstLine || `Paket ${PACKAGE_TYPE_LABELS[packageType] ?? packageType}${duration ? ` ${duration} Hari` : ""}`;

  // Departure city: "BERANGKAT JAKARTA" or "BERANGKAT DARI JAKARTA"
  let departureCity = "";
  const cityMatch = trimmed.match(/BERANGKAT\s+(?:DARI\s+)?(.+?)(?:$|\n)/i);
  if (cityMatch?.[1]) {
    departureCity = resolveCity(cityMatch[1].trim());
  }

  // Airline: "MASKAPAI SAUDIA" or "MASKAPAI: SAUDIA"
  let airline = "";
  const airlineMatch = trimmed.match(/MASKAPAI\s*[:=]?\s*(.+?)(?:$|\n)/i);
  if (airlineMatch?.[1]) {
    airline = resolveAirline(airlineMatch[1].trim());
  }

  // Hotels
  const hotelMekkah = extractHotel(trimmed, "mekkah");
  const hotelMadinah = extractHotel(trimmed, "madinah");

  return {
    title,
    packageType,
    departureCity,
    airline,
    hotelMekkah,
    hotelMadinah,
    roomUpgrade: upgrades.roomUpgrade,
    hotelUpgrade: upgrades.hotelUpgrade,
    durationDays: duration,
    departureDates: dates,
    promoText: promo,
    description,
    rawCaption: trimmed,
    rawOcrText: "",
    confidence: 0,
  };
}
