// ============================================================
// PACKAGE BUILDER — Build a draft Keberangkatan package from
// AI extraction results. Generates operational identifiers,
// calculates durations, and sets draft state.
// ============================================================

import type { Keberangkatan } from "@/shared/types";
import type { PackageExtractionResult } from "./types";
import { DEFAULT_FLIGHT_NUMBERS } from "./types";
import { resolveAirline, resolveCity } from "./alias-resolver";

// ── Kode Paket Generation ────────────────────────────────────

/**
 * Package type prefix for kode generation.
 */
const KODE_PREFIX: Record<PackageExtractionResult["packageType"], string> = {
  umroh_reguler: "UMR",
  umroh_plus: "UMP",
  haji_khusus: "HJK",
  wisata_halal: "WSH",
};

/**
 * Month abbreviation (3 chars, uppercase) for kode paket.
 */
const MONTH_ABBRS = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGS", "SEP", "OKT", "NOV", "DES",
];

/**
 * Generate a package code from extraction results.
 * Format: {TYPE}-{CITY}-{MONTH}{YY}
 * Example: "UMR-JKT-JUL26"
 */
function generateKodePaket(result: PackageExtractionResult): string {
  const prefix = KODE_PREFIX[result.packageType] || "PKG";

  // Departure city code (first 3 chars uppercase)
  let cityCode = "XX";
  if (result.departureCity) {
    const resolved = resolveCity(result.departureCity).toUpperCase();
    // Try to get a 3-letter code
    const knownCodes: Record<string, string> = {
      JAKARTA: "JKT",
      SURABAYA: "SBY",
      MEDAN: "MDN",
      MAKASSAR: "MKS",
      YOGYAKARTA: "YOG",
      DENPASAR: "DPS",
      BALI: "DPS",
      BANDUNG: "BDG",
      SOLO: "SOC",
      "BANDA ACEH": "BTJ",
      ACEH: "BTJ",
      PALEMBANG: "PLM",
      PEKANBARU: "PKU",
      PONTIANAK: "PTK",
      BANJARMASIN: "BDJ",
      MANADO: "MND",
      LOMBOK: "LOB",
      BALIKPAPAN: "BPN",
    };
    cityCode = knownCodes[resolved] ?? resolved.slice(0, 3);
  }

  // Date code (month + last 2 digits of year)
  let dateCode = "XX";
  if (result.departureDates.length > 0) {
    const firstDate = result.departureDates[0] as string | undefined;
    if (firstDate) {
      const parts = firstDate.split("-");
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1]!, 10) - 1;
        const yearShort = parts[0]!.slice(-2);
        const monthAbbr = MONTH_ABBRS[monthNum];
        dateCode = `${monthAbbr ?? "XX"}${yearShort}`;
      }
    }
  }

  return `${prefix}-${cityCode}-${dateCode}`;
}

/**
 * Generate a default flight number based on airline.
 */
function generateFlightNumber(airline: string): string {
  const resolved = resolveAirline(airline);
  const prefix = DEFAULT_FLIGHT_NUMBERS[resolved] ?? "";
  // Append a generic flight suffix for draft packages
  return `${prefix}DRAFT`;
}

/**
 * Calculate return date from departure date and duration.
 * Duration is in days; return is on the last day.
 */
function calculateTanggalPulang(
  tanggalBerangkat: string,
  durationDays: number
): string {
  const departure = new Date(tanggalBerangkat + "T00:00:00+07:00");
  departure.setDate(departure.getDate() + durationDays - 1);
  return departure.toISOString().split("T")[0] ?? tanggalBerangkat;
}

/**
 * Extract kuota (capacity) from the extraction result.
 * Checks the promo text or description for capacity hints like:
 * - "20 PENDAFTAR PERTAMA" → kuota = 20
 * - "KUOTA 30" → kuota = 30
 * - "TERBATAS 50" → kuota = 50
 * Falls back to a sensible default based on package type.
 */
function extractKuota(result: PackageExtractionResult): number {
  const searchText = [
    result.promoText || "",
    result.description || "",
    result.rawCaption,
  ].join(" ").toUpperCase();

  // Pattern 1: "UNTUK X PENDAFTAR PERTAMA" / "20 PENDAFTAR PERTAMA"
  const pendaftarMatch = searchText.match(/(\d+)\s*PENDAFTAR\s*(?:PERTAMA|TERBATAS)?/i);
  if (pendaftarMatch) {
    const kuotaStr = pendaftarMatch[1];
    if (kuotaStr) {
      const kuota = parseInt(kuotaStr, 10);
      if (kuota >= 5 && kuota <= 500) return kuota;
    }
  }

  // Pattern 2: "KUOTA: X" / "KUOTA X"
  const kuotaMatch = searchText.match(/KUOTA\s*[:=]?\s*(\d+)/i);
  if (kuotaMatch) {
    const kuotaStr = kuotaMatch[1];
    if (kuotaStr) {
      const kuota = parseInt(kuotaStr, 10);
      if (kuota >= 5 && kuota <= 500) return kuota;
    }
  }

  // Pattern 3: "TERBATAS X ORANG" / "TERBATAS X"
  const terbatasMatch = searchText.match(/TERBATAS\s*(\d+)\s*(?:ORANG|PAX|JAMAAH)?/i);
  if (terbatasMatch) {
    const kuotaStr = terbatasMatch[1];
    if (kuotaStr) {
      const kuota = parseInt(kuotaStr, 10);
      if (kuota >= 5 && kuota <= 500) return kuota;
    }
  }

  // Defaults by package type
  const defaultKuota: Record<PackageExtractionResult["packageType"], number> = {
    umroh_reguler: 45,
    umroh_plus: 30,
    haji_khusus: 20,
    wisata_halal: 30,
  };

  return defaultKuota[result.packageType] || 45;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Build a draft Keberangkatan object from the AI extraction result.
 * The returned object is ready to be saved to the database or
 * stored as a draft for review.
 *
 * @param result - The AI extraction result from flyer + caption
 * @returns A partial Keberangkatan suitable for draft storage
 */
export function buildPackageDraft(
  result: PackageExtractionResult
): Omit<Keberangkatan, "id" | "createdAt" | "updatedAt" | "jamaahIds"> {
  const kode = generateKodePaket(result);
  const kuota = extractKuota(result);

  // Generate departure date — use first date if available, otherwise today
  const todayStr = new Date().toISOString().split("T")[0] ?? "";
  const tanggalBerangkat = result.departureDates[0] ?? todayStr;

  const duration = result.durationDays || 12; // Default 12 days for umroh
  const tanggalPulang = calculateTanggalPulang(tanggalBerangkat, duration);

  return {
    kode,
    paketUmrohId: "", // Will be assigned later
    tanggalBerangkat,
    tanggalPulang,
    nomorPenerbangan: generateFlightNumber(result.airline),
    status: "preparing",
    maxSeat: kuota,
    terisi: 0,
    targetMaterialisasi: undefined,
    maskapaiId: undefined,
    hotelMekkahId: undefined,
    hotelMadinahId: undefined,
    startingPointId: undefined,
    packageTypeId: undefined,
  };
}
