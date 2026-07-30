// ============================================================
// M-05: FLYER VISUAL ANALYZER — Generate Package Intelligence v2
// ============================================================
//
// Refactored Gemini-based flyer visual analyzer.
// Extracts structured data from flyer images via Gemini AI
// with per-field confidence and source provenance.
//
// Key changes from v1 gemini-extractor.ts:
// - Returns ExtractionField<T> per field (not flat strings)
// - Per-field confidence scoring (not global confidence=1)
// - Source provenance = 'flyer_ocr' for all fields
// - Follows AI Governance: Extract, Normalize, Flag (not Decide)
//
// Traceability:
// - AI Governance Constitution v1.0 — AI BOLEH: Extract, Normalize, Flag
// - Confidence Framework v1.0 — Per-field confidence
// - Constitution Principle 9 — Business Truth
// - Constitution Principle 10 — Source Provenance
// ============================================================

import type {
  ExtractionField,
  PackageType,
  PricingMode,
  ClusterExtraction,
} from './types';
import { createExtractedField, createMissingField } from './types';

// ── Types ────────────────────────────────────────────────────

/**
 * Raw Gemini API response structure.
 * This is the JSON object returned by Gemini's structured output.
 */
interface GeminiRawResponse {
  title?: string;
  packageType?: string;
  durationDays?: number;
  departureCity?: string;
  airline?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
  landingRoute?: string;
  isAdaPerlengkapan?: string;
  hargaBase?: string;
  upgradeDouble?: string;
  upgradeTriple?: string;
  roomUpgrade?: string;
  hotelUpgrade?: string;
  promoText?: string;
  description?: string;
  clusters?: {
    clusterName?: string;
    hotelMekkah?: string;
    hotelMadinah?: string;
    hargaBase?: string;
    upgradeDouble?: string;
    upgradeTriple?: string;
  }[];
  departureDates?: string[];
}

/**
 * Structured output from the Flyer Visual Analyzer.
 * All fields use ExtractionField contract.
 */
export interface FlyerAnalysisResult {
  title: ExtractionField;
  packageType: ExtractionField<PackageType>;
  durationDays: ExtractionField<number>;
  departureCity: ExtractionField;
  airline: ExtractionField;
  hotelMekkah: ExtractionField;
  hotelMadinah: ExtractionField;
  landingRoute: ExtractionField;
  departureDates: ExtractionField<string[]>;
  pricingMode: ExtractionField<PricingMode>;
  price: ExtractionField<number>;
  clusters: ClusterExtraction[];
  upgradeDouble: ExtractionField<number>;
  upgradeTriple: ExtractionField<number>;
  isAdaPerlengkapan: ExtractionField<'ya' | 'tidak'>;
  promoText: ExtractionField;
  description: ExtractionField;
}

// ── Confidence Calculation ───────────────────────────────────

/**
 * Calculate per-field confidence for a Gemini-extracted value.
 * Gemini responses are generally high confidence for clear visual data,
 * but we must NOT set confidence = 1.0 (Confidence Framework Anti-Pattern).
 *
 * Base confidence for Gemini visual extraction = 0.85
 * Adjusted by field presence and value quality.
 */
function geminiFieldConfidence(value: unknown, fieldType: string): number {
  if (value === null || value === undefined || value === '') return 0;

  const BASE_CONFIDENCE = 0.85;

  // Adjust by field type
  switch (fieldType) {
    case 'title':
    case 'packageType':
    case 'durationDays':
      return BASE_CONFIDENCE + 0.05; // Highly structured — easy for AI
    case 'departureDates':
      if (Array.isArray(value) && value.length > 0) return BASE_CONFIDENCE;
      return 0.60; // Empty array is suspicious
    case 'airline':
    case 'departureCity':
      return BASE_CONFIDENCE;
    case 'hotelMekkah':
    case 'hotelMadinah':
      return BASE_CONFIDENCE - 0.05; // Hotel names vary more
    case 'price':
    case 'upgradeDouble':
    case 'upgradeTriple':
      return BASE_CONFIDENCE - 0.10; // Numbers need extra validation
    case 'landingRoute':
      return BASE_CONFIDENCE - 0.05; // Route codes need context
    default:
      return BASE_CONFIDENCE;
  }
}

// ── Field Transformation Helpers ─────────────────────────────

function toExtractedOrMissing(
  value: string | undefined | null,
  category: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL',
  fieldType: string
): ExtractionField {
  if (!value || value.trim() === '') {
    return createMissingField(category);
  }
  const confidence = geminiFieldConfidence(value, fieldType);
  return createExtractedField(value.trim(), 'flyer_ocr', confidence, category, {
    ocrQuality: confidence,
    patternMatch: confidence,
    sourceAgreement: confidence,
    contextConsistency: confidence,
  });
}

function parseNominalString(text: string | undefined | null): number | null {
  if (!text) return null;
  // Remove non-numeric except dots and commas
  const cleaned = text.replace(/[^0-9.,]/g, '');
  // Handle "38.900.000" format (Indonesian)
  const noThousandsSep = cleaned.replace(/\.(?=\d{3})/g, '');
  const val = parseInt(noThousandsSep.replace(/\D/g, ''), 10);
  return val > 0 ? val : null;
}

// ── Gemini API Call ──────────────────────────────────────────

/**
 * Analyze a flyer image using Gemini AI.
 *
 * This function delegates to the existing Gemini API call in
 * gemini-extractor.ts, but transforms the output to per-field
 * ExtractionField format with proper confidence.
 *
 * AI Governance boundaries applied:
 * - AI BOLEH: Extract, Normalize, Flag
 * - AI TIDAK BOLEH: Decide, Approve, Modify Master Data
 *
 * @param imagePath Path to the flyer image
 * @param rawOcrText OCR text already extracted from flyer
 * @param caption Caption text for additional context
 * @param masterDataContext Optional Master Data for guided extraction
 */
export async function analyzeFlyer(
  imagePath: string,
  rawOcrText: string,
  caption: string,
  _masterDataContext?: {
    airlineOptions: string;
    cityOptions: string;
    typeOptions: string;
    routeOptions: string;
    mekkahHotels: string;
    madinahHotels: string;
  }
): Promise<FlyerAnalysisResult> {
  // Import and call existing Gemini extractor
  let geminiRaw: GeminiRawResponse;
  try {
    const { extractWithGemini } = await import('../gemini-extractor');
    geminiRaw = (await extractWithGemini(imagePath, rawOcrText, caption)) as GeminiRawResponse;
  } catch (error) {
    console.error('[FlyerVisualAnalyzer] Gemini extraction failed:', error);
    // Return all-MISSING result on failure
    return createEmptyFlyerResult();
  }

  // Transform raw Gemini response to ExtractionField format
  return transformGeminiResponse(geminiRaw);
}

/**
 * Transform raw Gemini API response to structured ExtractionField format.
 */
function transformGeminiResponse(raw: GeminiRawResponse): FlyerAnalysisResult {
  // Package Type mapping
  const typeMap: Record<string, PackageType> = {
    'umroh reguler': 'umroh_reguler',
    'umroh plus': 'umroh_plus',
    'haji khusus': 'haji_khusus',
    'wisata halal': 'wisata_halal',
    'umroh_reguler': 'umroh_reguler',
    'umroh_plus': 'umroh_plus',
    'haji_khusus': 'haji_khusus',
    'wisata_halal': 'wisata_halal',
  };

  const packageType = typeMap[raw.packageType?.toLowerCase() ?? ''] ?? 'umroh_reguler';

  // Pricing
  const basePrice = parseNominalString(raw.hargaBase);
  const hasCluster = raw.clusters && raw.clusters.length > 0;

  // Clusters
  const clusters: ClusterExtraction[] = (raw.clusters ?? []).map(c => ({
    clusterName: c.clusterName ?? 'Unknown Cluster',
    hotelMekkah: c.hotelMekkah
      ? createExtractedField(c.hotelMekkah, 'flyer_ocr', 0.75, 'RECOMMENDED')
      : null,
    hotelMadinah: c.hotelMadinah
      ? createExtractedField(c.hotelMadinah, 'flyer_ocr', 0.75, 'RECOMMENDED')
      : null,
    hargaBase: c.hargaBase
      ? (() => {
          const price = parseNominalString(c.hargaBase);
          return price
            ? createExtractedField<number>(price, 'flyer_ocr', 0.75, 'MANDATORY')
            : null;
        })()
      : null,
    upgradeDouble: c.upgradeDouble
      ? (() => {
          const price = parseNominalString(c.upgradeDouble);
          return price
            ? createExtractedField<number>(price, 'flyer_ocr', 0.70, 'OPTIONAL')
            : null;
        })()
      : null,
    upgradeTriple: c.upgradeTriple
      ? (() => {
          const price = parseNominalString(c.upgradeTriple);
          return price
            ? createExtractedField<number>(price, 'flyer_ocr', 0.70, 'OPTIONAL')
            : null;
        })()
      : null,
  }));

  return {
    title: toExtractedOrMissing(raw.title, 'OPTIONAL', 'title'),

    packageType: raw.packageType
      ? createExtractedField<PackageType>(packageType, 'flyer_ocr',
          geminiFieldConfidence(raw.packageType, 'packageType'), 'MANDATORY')
      : createMissingField<PackageType>('MANDATORY'),

    durationDays: raw.durationDays && raw.durationDays > 0
      ? createExtractedField<number>(raw.durationDays, 'flyer_ocr',
          geminiFieldConfidence(raw.durationDays, 'durationDays'), 'MANDATORY')
      : createMissingField<number>('MANDATORY'),

    departureCity: toExtractedOrMissing(raw.departureCity, 'MANDATORY', 'departureCity'),
    airline: toExtractedOrMissing(raw.airline, 'MANDATORY', 'airline'),
    hotelMekkah: toExtractedOrMissing(raw.hotelMekkah, 'RECOMMENDED', 'hotelMekkah'),
    hotelMadinah: toExtractedOrMissing(raw.hotelMadinah, 'RECOMMENDED', 'hotelMadinah'),
    landingRoute: toExtractedOrMissing(raw.landingRoute, 'RECOMMENDED', 'landingRoute'),

    departureDates: raw.departureDates && raw.departureDates.length > 0
      ? createExtractedField<string[]>(raw.departureDates, 'flyer_ocr',
          geminiFieldConfidence(raw.departureDates, 'departureDates'), 'MANDATORY')
      : createMissingField<string[]>('MANDATORY'),

    pricingMode: createExtractedField<PricingMode>(
      hasCluster ? 'TIER' : 'SINGLE',
      'flyer_ocr',
      0.85,
      'MANDATORY'
    ),

    price: basePrice
      ? createExtractedField<number>(basePrice, 'flyer_ocr',
          geminiFieldConfidence(raw.hargaBase, 'price'), 'MANDATORY')
      : createMissingField<number>('MANDATORY'),

    clusters,

    upgradeDouble: (() => {
      const price = parseNominalString(raw.upgradeDouble);
      return price
        ? createExtractedField<number>(price, 'flyer_ocr', 0.75, 'OPTIONAL')
        : createMissingField<number>('OPTIONAL');
    })(),

    upgradeTriple: (() => {
      const price = parseNominalString(raw.upgradeTriple);
      return price
        ? createExtractedField<number>(price, 'flyer_ocr', 0.75, 'OPTIONAL')
        : createMissingField<number>('OPTIONAL');
    })(),

    isAdaPerlengkapan: raw.isAdaPerlengkapan === 'ya' || raw.isAdaPerlengkapan === 'tidak'
      ? createExtractedField<'ya' | 'tidak'>(raw.isAdaPerlengkapan, 'flyer_ocr', 0.80, 'OPTIONAL')
      : createMissingField<'ya' | 'tidak'>('OPTIONAL'),

    promoText: toExtractedOrMissing(raw.promoText, 'OPTIONAL', 'promoText'),
    description: toExtractedOrMissing(raw.description, 'OPTIONAL', 'description'),
  };
}

/**
 * Create an empty flyer result (all fields MISSING).
 * Used as fallback when Gemini fails.
 */
function createEmptyFlyerResult(): FlyerAnalysisResult {
  return {
    title: createMissingField('OPTIONAL'),
    packageType: createMissingField<PackageType>('MANDATORY'),
    durationDays: createMissingField<number>('MANDATORY'),
    departureCity: createMissingField('MANDATORY'),
    airline: createMissingField('MANDATORY'),
    hotelMekkah: createMissingField('RECOMMENDED'),
    hotelMadinah: createMissingField('RECOMMENDED'),
    landingRoute: createMissingField('RECOMMENDED'),
    departureDates: createMissingField<string[]>('MANDATORY'),
    pricingMode: createExtractedField<PricingMode>('SINGLE', 'flyer_ocr', 0.50, 'MANDATORY'),
    price: createMissingField<number>('MANDATORY'),
    clusters: [],
    upgradeDouble: createMissingField<number>('OPTIONAL'),
    upgradeTriple: createMissingField<number>('OPTIONAL'),
    isAdaPerlengkapan: createMissingField<'ya' | 'tidak'>('OPTIONAL'),
    promoText: createMissingField('OPTIONAL'),
    description: createMissingField('OPTIONAL'),
  };
}
