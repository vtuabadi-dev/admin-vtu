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

  // Find default fallback year if any 4-digit year >= 2024 is mentioned in the text
  const yearMatches = caption.match(/\b(202[4-9]|203[0-5])\b/g);
  const fallbackYear = yearMatches && yearMatches.length > 0
    ? parseInt(yearMatches[yearMatches.length - 1]!, 10)
    : currentYear;

  // Split text by pipe '|' symbol (ignoring '|' as requested)
  const segments = caption.split(/\|/);

  for (const rawSeg of segments) {
    const seg = rawSeg.trim();
    if (!seg) continue;

    // Pattern 1: Slash/dash dates like "12/10/2026", "12-10-2026", "2026-10-12"
    const slashPattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = slashPattern.exec(seg)) !== null) {
      if (!sMatch[1] || !sMatch[2] || !sMatch[3]) continue;
      let p1 = parseInt(sMatch[1], 10);
      let p2 = parseInt(sMatch[2], 10);
      let p3 = parseInt(sMatch[3], 10);

      let year = p3;
      if (year < 100) year += 2000;
      let day = p1;
      let month = p2 - 1;

      if (p1 > 1000) {
        year = p1;
        month = p2 - 1;
        day = p3;
      }

      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2024 && year <= 2035) {
        const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (!dates.includes(isoDate)) dates.push(isoDate);
      }
    }

    // Pattern 2: Multi-day dates before month: "12, 18, 25 OKTOBER 2026"
    const multiDayPattern = /((?:\d{1,2}\s*(?:,|\/|&|DAN|DAN\/ATAU)\s*)+\d{1,2})\s+(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JAN|FEB|MAR|APR|MEI|JUN|JUL|AGS|AGT|SEP|SEPT|OKT|NOV|DES)\s*(\d{4})?/gi;
    let mMatch: RegExpExecArray | null;
    while ((mMatch = multiDayPattern.exec(seg)) !== null) {
      const daysStr = mMatch[1];
      const monthNameStr = mMatch[2] ? mMatch[2].toUpperCase() : "";
      const yearStr = mMatch[3];

      if (!daysStr || !monthNameStr) continue;
      const month = MONTH_MAP_IND[monthNameStr];
      const year = yearStr ? parseInt(yearStr, 10) : fallbackYear;

      if (month !== undefined && !isNaN(year)) {
        const dayNumbers = daysStr.split(/[^0-9]+/).map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 1 && d <= 31);
        for (const day of dayNumbers) {
          const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (!dates.includes(isoDate)) dates.push(isoDate);
        }
      }
    }

    // Pattern 3: Standard single date starting with day number (1-31) and month: "12 JULI 2026", "4 AGUSTUS 2026"
    const datePattern = /(\d{1,2})\s+(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JAN|FEB|MAR|APR|MEI|JUN|JUL|AGS|AGT|SEP|SEPT|OKT|NOV|DES)\s*(\d{4})?/gi;
    let match: RegExpExecArray | null;
    while ((match = datePattern.exec(seg)) !== null) {
      const dayStr = match[1];
      const monthNameStr = match[2];
      const yearStr = match[3];

      if (!dayStr || !monthNameStr) continue;
      const day = parseInt(dayStr, 10);
      if (isNaN(day) || day < 1 || day > 31) continue;
      const monthName = monthNameStr.toUpperCase();
      const month = MONTH_MAP_IND[monthName];
      const year = yearStr ? parseInt(yearStr, 10) : fallbackYear;

      if (month !== undefined && !isNaN(year)) {
        const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (!dates.includes(isoDate)) {
          dates.push(isoDate);
        }
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

/**
 * Extract room upgrade prices (Double and Triple) specifically scanning caption text (from bottom lines first).
 * Examples:
 *   "Upgrade Double: 5.000.000, Triple: 3.000.000"
 *   "Sekamar Berdua +5jt, Sekamar Bertiga +3jt"
 *   "Double +5.000.000"
 */
export function extractRoomUpgradePrices(caption: string): { upgradeDouble?: string; upgradeTriple?: string } {
  let upgradeDouble: string | undefined;
  let upgradeTriple: string | undefined;

  const lines = caption.split("\n").map(l => l.trim()).filter(Boolean);
  const bottomToTopLines = [...lines].reverse();

  const parseNumber = (text: string): string | undefined => {
    // Check "5jt" or "5 juta" or "5,5jt"
    const jtMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:jt|juta)/i);
    if (jtMatch?.[1]) {
      const num = parseFloat(jtMatch[1].replace(",", "."));
      if (!isNaN(num)) return Math.round(num * 1000000).toString();
    }
    // Check "5.000.000" or "5000000"
    const numMatch = text.match(/(\d{1,3}(?:\.\d{3})+|\d{6,8})/);
    if (numMatch?.[1]) {
      const numStr = numMatch[1].replace(/\D/g, "");
      if (numStr.length >= 6) return numStr;
    }
    return undefined;
  };

  for (const line of bottomToTopLines) {
    const lineUpper = line.toUpperCase();

    if (!upgradeDouble && (lineUpper.includes("DOUBLE") || lineUpper.includes("BERDUA") || lineUpper.includes("BER 2") || lineUpper.includes("BER-2") || lineUpper.includes("TWIN"))) {
      const price = parseNumber(line);
      if (price) upgradeDouble = price;
    }

    if (!upgradeTriple && (lineUpper.includes("TRIPLE") || lineUpper.includes("BERTIGA") || lineUpper.includes("BER 3") || lineUpper.includes("BER-3"))) {
      const price = parseNumber(line);
      if (price) upgradeTriple = price;
    }

    if (upgradeDouble && upgradeTriple) break;
  }

  // Fallback regex scan across whole caption if line-by-line misses
  if (!upgradeDouble) {
    const dMatch = caption.match(/(?:DOUBLE|SEKAMAR\s*BERDUA|TWIN)\s*[:=+]?\s*(?:RP\.?)?\s*(\d+(?:[\.,]\d+)?\s*(?:JT|JUTA)|\d{1,3}(?:\.\d{3})+|\d{6,8})/i);
    if (dMatch?.[1]) {
      const price = parseNumber(dMatch[1]);
      if (price) upgradeDouble = price;
    }
  }

  if (!upgradeTriple) {
    const tMatch = caption.match(/(?:TRIPLE|SEKAMAR\s*BERTIGA)\s*[:=+]?\s*(?:RP\.?)?\s*(\d+(?:[\.,]\d+)?\s*(?:JT|JUTA)|\d{1,3}(?:\.\d{3})+|\d{6,8})/i);
    if (tMatch?.[1]) {
      const price = parseNumber(tMatch[1]);
      if (price) upgradeTriple = price;
    }
  }

  return { upgradeDouble, upgradeTriple };
}

/**
 * Detect equipment inclusion from caption text.
 * Returns "ya" if caption mentions included equipment ("Perlengkapan umroh", "Free perlengkapan", etc.).
 */
export function extractEquipmentStatus(caption: string): "ya" | "tidak" | undefined {
  const upper = caption.toUpperCase();
  if (upper.includes("PERLENGKAPAN UMROH") || upper.includes("FREE PERLENGKAPAN") || upper.includes("TERMASUK PERLENGKAPAN") || upper.includes("PERLENGKAPAN")) {
    const tidakIndex = upper.indexOf("TIDAK TERMASUK");
    const perlengkapanIndex = upper.indexOf("PERLENGKAPAN");
    if (tidakIndex !== -1 && perlengkapanIndex > tidakIndex) {
      return "tidak";
    }
    return "ya";
  }
  return undefined;
}

/**
 * Extract per-cluster base prices and upgrade prices from caption text.
 * Examples:
 *   "Silver Rp. 38.900.000"
 *   "Gold Rp. 40.900.000"
 *   "Platinum Rp. 44.900.000"
 *   "Platinum"
 *   "Sekamar Berdua : + Rp. 7.500.000/pax"
 *   "Sekamar Bertiga : + Rp. 5.000.000/pax"
 */
export function extractClustersFromCaption(caption: string): import("./types").ClusterExtractionItem[] {
  const clusterMap: Record<string, import("./types").ClusterExtractionItem> = {};
  const lines = caption.split("\n").map(l => l.trim()).filter(Boolean);
  const clusterNames = ["SILVER", "GOLD", "PLATINUM", "BRONZE"];

  const parseNominal = (text: string): string | undefined => {
    const jtMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:jt|juta)/i);
    if (jtMatch?.[1]) {
      const num = parseFloat(jtMatch[1].replace(",", "."));
      if (!isNaN(num)) return Math.round(num * 1000000).toString();
    }
    const numMatch = text.match(/(\d{1,3}(?:\.\d{3})+|\d{6,8})/);
    if (numMatch?.[1]) {
      const numStr = numMatch[1].replace(/\D/g, "");
      if (numStr.length >= 6) return numStr;
    }
    return undefined;
  };

  // 1. Scan for base price lines like "Silver Rp. 38.900.000"
  lines.forEach(line => {
    const lineUpper = line.toUpperCase();
    for (const cName of clusterNames) {
      if (lineUpper.includes(cName)) {
        const price = parseNominal(line);
        if (price) {
          if (!clusterMap[cName]) {
            clusterMap[cName] = { clusterName: `${cName.charAt(0) + cName.slice(1).toLowerCase()} Package` };
          }
          clusterMap[cName]!.hargaBase = price;
        }
      }
    }
  });

  // 2. Scan for per-cluster upgrade sections (e.g. Platinum \n Sekamar Berdua: + Rp 7.500.000)
  let currentCluster: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineUpper = line.toUpperCase();

    const matchedHeading = clusterNames.find(cn => lineUpper === cn || lineUpper === `${cn} PACKAGE`);
    if (matchedHeading) {
      currentCluster = matchedHeading;
      if (!clusterMap[currentCluster]) {
        clusterMap[currentCluster] = { clusterName: `${currentCluster.charAt(0) + currentCluster.slice(1).toLowerCase()} Package` };
      }
      continue;
    }

    if (currentCluster) {
      if (lineUpper.includes("SEKAMAR BERDUA") || lineUpper.includes("DOUBLE") || lineUpper.includes("TWIN")) {
        const price = parseNominal(line);
        if (price) {
          clusterMap[currentCluster]!.upgradeDouble = price;
        }
      } else if (lineUpper.includes("SEKAMAR BERTIGA") || lineUpper.includes("TRIPLE")) {
        const price = parseNominal(line);
        if (price) {
          clusterMap[currentCluster]!.upgradeTriple = price;
        }
      }
    }
  }

  // 3. Scan for slash-separated hotel lines like:
  // "Hotel Makkah : Grand Al Massa / Rayyana Grand Plaza / Safwah Tower 5 malam"
  let foundMekkahHotels: string[] = [];
  let foundMadinahHotels: string[] = [];

  lines.forEach(line => {
    const lineUpper = line.toUpperCase();
    if (lineUpper.includes("HOTEL MAKKAH") || lineUpper.includes("HOTEL MEKKAH")) {
      const parts = line.split(/[:=]/);
      if (parts[1]) {
        const rawHotels = parts[1].replace(/\d+\s*malam/gi, "").trim();
        foundMekkahHotels = rawHotels.split(/[/|]/).map(h => h.trim()).filter(Boolean);
      }
    } else if (lineUpper.includes("HOTEL MADINAH") || lineUpper.includes("HOTEL MEDINA")) {
      const parts = line.split(/[:=]/);
      if (parts[1]) {
        const rawHotels = parts[1].replace(/\d+\s*malam/gi, "").trim();
        foundMadinahHotels = rawHotels.split(/[/|]/).map(h => h.trim()).filter(Boolean);
      }
    }
  });

  const presentClusters = Object.keys(clusterMap);
  const orderedClusters = presentClusters.length > 0 ? presentClusters : ["SILVER", "GOLD", "PLATINUM"];

  orderedClusters.forEach((cName, idx) => {
    if (!clusterMap[cName]) {
      clusterMap[cName] = { clusterName: `${cName.charAt(0) + cName.slice(1).toLowerCase()} Package` };
    }
    if (foundMekkahHotels[idx]) {
      clusterMap[cName]!.hotelMekkah = foundMekkahHotels[idx];
    }
    if (foundMadinahHotels[idx]) {
      clusterMap[cName]!.hotelMadinah = foundMadinahHotels[idx];
    }
  });

  return Object.values(clusterMap);
}

// ── Main Parser ──────────────────────────────────────────────

/**
 * Parse a full caption text into structured extraction fields.
 * Returns a partial PackageExtractionResult with all fields
 * that can be extracted from text alone.
 */
export function parseCaption(caption: string): Partial<PackageExtractionResult> {
  const trimmed = caption.replace(/^\[MODUS KLASTER SEAT:.*\]\s*/gi, "").trim();
  if (!trimmed) return {};

  const packageType = detectPackageType(trimmed);
  const duration = extractDuration(trimmed);
  const dates = extractDates(trimmed);
  const promo = extractPromo(trimmed);
  const upgrades = extractUpgrade(trimmed);
  const upgradePrices = extractRoomUpgradePrices(trimmed);
  const description = extractDescription(trimmed);
  const equipmentStatus = extractEquipmentStatus(trimmed);
  const captionClusters = extractClustersFromCaption(trimmed);

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
    upgradeDouble: upgradePrices.upgradeDouble,
    upgradeTriple: upgradePrices.upgradeTriple,
    isAdaPerlengkapan: equipmentStatus,
    clusters: captionClusters.length > 0 ? captionClusters : undefined,
    durationDays: duration,
    departureDates: dates,
    promoText: promo,
    description,
    rawCaption: trimmed,
    rawOcrText: "",
    confidence: 0,
  };
}
