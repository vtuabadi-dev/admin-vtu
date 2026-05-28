// ============================================================
// PACKAGE AI IMPORT SYSTEM — Type Definitions
// Intelligence engine that extracts package data from flyer
// images and caption text.
// ============================================================

/**
 * Result of extracting package data from a flyer image + caption.
 * Fields are populated by OCR and caption parsing, then merged.
 */
export interface PackageExtractionResult {
  title: string;
  packageType: "umroh_reguler" | "umroh_plus" | "haji_khusus" | "wisata_halal";
  departureCity: string;
  airline: string;
  hotelMekkah: string;
  hotelMadinah: string;
  roomUpgrade?: string;
  hotelUpgrade?: string;
  durationDays: number;
  departureDates: string[];
  promoText?: string;
  description?: string;
  rawCaption: string;
  rawOcrText: string;
  confidence: number;
}

/**
 * Draft lifecycle status for AI-imported packages.
 * Packages ALWAYS enter DRAFT state first — never auto-published.
 */
export type PackageDraftStatus = "DRAFT" | "REVIEW" | "READY" | "PUBLISHED" | "ARCHIVED";

/**
 * A draft package awaiting review and approval before publication.
 * Stored in-memory until promoted to a Keberangkatan record.
 */
export interface PackageDraft {
  id: string;
  extractionResult: PackageExtractionResult;
  status: PackageDraftStatus;
  flyerPath: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedPackageId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Supported package types with their display labels.
 */
export const PACKAGE_TYPE_LABELS: Record<PackageExtractionResult["packageType"], string> = {
  umroh_reguler: "Umroh Reguler",
  umroh_plus: "Umroh Plus",
  haji_khusus: "Haji Khusus",
  wisata_halal: "Wisata Halal",
};

/**
 * Default flight numbers per airline (used when caption omits it).
 */
export const DEFAULT_FLIGHT_NUMBERS: Record<string, string> = {
  "Saudia Airlines": "SV-",
  "Garuda Indonesia": "GA-",
  "Lion Air": "JT-",
  "Emirates": "EK-",
  "Qatar Airways": "QR-",
  "Turkish Airlines": "TK-",
};

/**
 * Hotel upgrade level aliases.
 */
export const HOTEL_UPGRADE_ALIASES: Record<string, string> = {
  standard: "Standard",
  premium: "Premium",
  vip: "VIP",
  executive: "Executive",
};

/**
 * Room upgrade type aliases.
 */
export const ROOM_UPGRADE_ALIASES: Record<string, string> = {
  double: "Double",
  triple: "Triple",
  quad: "Quad",
  single: "Single",
};
