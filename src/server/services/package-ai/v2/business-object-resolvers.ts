// ============================================================
// M-07: BUSINESS OBJECT RESOLVERS — Generate Package Intelligence v2
// ============================================================
//
// Resolves raw extracted values into canonical business objects.
// Consumes outputs from M-04, M-05, M-06 and applies Business
// Engine rules.
//
// Sub-Resolvers:
// - PackageTypeClassifier (EEOS-ENG-006)
// - LandingResolver (EEOS-ENG-007)
// - AirlineResolver (EEOS-ENG-002 / Alias Resolver)
// - CityResolver (EEOS-ENG-002 / Alias Resolver)
//
// Key rule: AI resolves to SUGGESTION — human confirms (R-RM-05).
// ============================================================

import type { ExtractionField, PackageType } from './types';

// ── Airline Alias Registry (EEOS-ENG-002) ────────────────────

/**
 * International carrier priority list.
 * Per Constitution: prioritize international carriers over domestic feeder.
 * Ref: Alias Resolver AR-01 to AR-06
 */
const INTERNATIONAL_CARRIERS: Record<string, string> = {
  SAUDIA: 'Saudia Airlines', 'SAUDIA AIRLINES': 'Saudia Airlines',
  'SAUDI ARABIAN': 'Saudia Airlines', 'SAUDI ARABIAN AIRLINES': 'Saudia Airlines',
  SV: 'Saudia Airlines',
  GARUDA: 'Garuda Indonesia', 'GARUDA INDONESIA': 'Garuda Indonesia', GA: 'Garuda Indonesia',
  EMIRATES: 'Emirates', EK: 'Emirates',
  QATAR: 'Qatar Airways', 'QATAR AIRWAYS': 'Qatar Airways', QR: 'Qatar Airways',
  TURKISH: 'Turkish Airlines', 'TURKISH AIRLINES': 'Turkish Airlines', TK: 'Turkish Airlines',
  'OMAN AIR': 'Oman Air', OMAN: 'Oman Air',
  ETIHAD: 'Etihad Airways',
  'ROYAL BRUNEI': 'Royal Brunei',
  FLYNAS: 'Flynas',
  SCOOT: 'Scoot',
};

const ALL_AIRLINE_ALIASES: Record<string, string> = {
  ...INTERNATIONAL_CARRIERS,
  LION: 'Lion Air', 'LION AIR': 'Lion Air', JT: 'Lion Air',
  BATIK: 'Batik Air', 'BATIK AIR': 'Batik Air', ID: 'Batik Air',
  CITILINK: 'Citilink', QG: 'Citilink',
  AIRASIA: 'AirAsia', 'AIR ASIA': 'AirAsia', AK: 'AirAsia', QZ: 'AirAsia',
  SUPER: 'Super Air Jet', 'SUPER AIR JET': 'Super Air Jet', IU: 'Super Air Jet',
  PELITA: 'Pelita Air', 'PELITA AIR': 'Pelita Air', IP: 'Pelita Air',
};

/**
 * Resolve airline name from raw text to canonical form.
 * Prioritizes international carriers (Umrah carriers).
 * Case-insensitive matching per AR-05.
 */
export function resolveAirlineName(field: ExtractionField): ExtractionField {
  if (!field.rawValue || field.fieldStatus === 'MISSING') return field;

  const cleaned = String(field.rawValue).trim().toUpperCase();

  // Priority 1: International carriers
  for (const [alias, canonical] of Object.entries(INTERNATIONAL_CARRIERS)) {
    if (cleaned.includes(alias)) {
      return {
        ...field,
        rawValue: canonical,
        suggestedMapping: canonical,
        confidence: Math.max(field.confidence, 0.90),
        confidenceFactors: {
          ...field.confidenceFactors,
          patternMatch: 0.95,
        },
      };
    }
  }

  // Priority 2: All airlines
  for (const [alias, canonical] of Object.entries(ALL_AIRLINE_ALIASES)) {
    if (cleaned.includes(alias)) {
      return {
        ...field,
        rawValue: canonical,
        suggestedMapping: canonical,
        confidence: Math.max(field.confidence, 0.85),
        confidenceFactors: {
          ...field.confidenceFactors,
          patternMatch: 0.90,
        },
      };
    }
  }

  // AR-04: No match → NEED_MAPPING
  return {
    ...field,
    fieldStatus: 'NEED_MAPPING',
    confidence: Math.min(field.confidence, 0.30),
  };
}

// ── City Alias Registry (EEOS-ENG-002) ───────────────────────

const CITY_ALIASES: Record<string, string> = {
  JAKARTA: 'Jakarta', JKT: 'Jakarta', CGK: 'Jakarta', 'JAKARTA (CGK)': 'Jakarta',
  SURABAYA: 'Surabaya', SUB: 'Surabaya', JUANDA: 'Surabaya', 'SURABAYA (SUB)': 'Surabaya',
  MEDAN: 'Medan', KNO: 'Medan', MES: 'Medan', 'MEDAN (KNO)': 'Medan',
  MAKASSAR: 'Makassar', UPG: 'Makassar',
  YOGYAKARTA: 'Yogyakarta', YOGYA: 'Yogyakarta', JOGJA: 'Yogyakarta', JOG: 'Yogyakarta', YIA: 'Yogyakarta',
  BALI: 'Bali', DENPASAR: 'Denpasar', DPS: 'Denpasar',
  BANDUNG: 'Bandung', BDO: 'Bandung',
  SOLO: 'Solo', SURAKARTA: 'Solo', SOC: 'Solo', 'SOLO (SOC)': 'Solo',
  PALEMBANG: 'Palembang', PLM: 'Palembang',
  BALIKPAPAN: 'Balikpapan', BPN: 'Balikpapan',
  LOMBOK: 'Lombok', LOP: 'Lombok',
  ACEH: 'Aceh', 'BANDA ACEH': 'Banda Aceh', BTJ: 'Banda Aceh',
  PEKANBARU: 'Pekanbaru', PKU: 'Pekanbaru',
  PONTIANAK: 'Pontianak', PNK: 'Pontianak',
  BANJARMASIN: 'Banjarmasin', BDJ: 'Banjarmasin',
  MANADO: 'Manado', MDC: 'Manado',
  SEMARANG: 'Semarang', SRG: 'Semarang',
};

/**
 * Resolve city name from raw text to canonical form.
 * Case-insensitive matching per AR-05.
 */
export function resolveCityName(field: ExtractionField): ExtractionField {
  if (!field.rawValue || field.fieldStatus === 'MISSING') return field;

  const cleaned = String(field.rawValue).trim().toUpperCase();

  // Exact match first (AR-02)
  if (CITY_ALIASES[cleaned]) {
    return {
      ...field,
      rawValue: CITY_ALIASES[cleaned]!,
      suggestedMapping: CITY_ALIASES[cleaned]!,
      confidence: Math.max(field.confidence, 0.95),
      confidenceFactors: {
        ...field.confidenceFactors,
        patternMatch: 1.0,
      },
    };
  }

  // Partial match (AR-03)
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (cleaned.includes(alias)) {
      return {
        ...field,
        rawValue: canonical,
        suggestedMapping: canonical,
        confidence: Math.max(field.confidence, 0.85),
        confidenceFactors: {
          ...field.confidenceFactors,
          patternMatch: 0.85,
        },
      };
    }
  }

  // AR-04: No match
  return {
    ...field,
    fieldStatus: 'NEED_MAPPING',
    confidence: Math.min(field.confidence, 0.30),
  };
}

// ── Package Type Classifier (EEOS-ENG-006) ───────────────────

/**
 * Classify/validate package type from extraction field.
 * Applies PT-01 to PT-04 rules.
 */
export function classifyPackageType(field: ExtractionField<PackageType>): ExtractionField<PackageType> {
  if (!field.rawValue || field.fieldStatus === 'MISSING') {
    // PT-01: Default = umroh_reguler
    return {
      ...field,
      rawValue: 'umroh_reguler',
      fieldStatus: 'NEED_REVIEW',
      confidence: 0.30,
      confidenceFactors: {
        ...field.confidenceFactors,
        patternMatch: 0.30,
      },
    };
  }

  // Already classified — validate range
  const validTypes: PackageType[] = ['umroh_reguler', 'umroh_plus', 'haji_khusus', 'wisata_halal'];
  if (validTypes.includes(field.rawValue)) {
    return field; // Already valid
  }

  // Invalid value → default with NEED_REVIEW (PT-04)
  return {
    ...field,
    rawValue: 'umroh_reguler',
    fieldStatus: 'NEED_REVIEW',
    confidence: 0.30,
  };
}

// ── Hotel Name Normalizer ────────────────────────────────────

const HOTEL_CLEANUP_PATTERNS = [
  { pattern: /\s*\([^)]*(?:BINTANG|BINTG|BIN|\*)\s*\d*\s*\)\s*/gi, replacement: '' },
  { pattern: /^HOTEL\s+/i, replacement: '' },
  { pattern: /\s{2,}/g, replacement: ' ' },
];

/**
 * Normalize hotel name by stripping star ratings and standardizing format.
 */
export function normalizeHotelName(field: ExtractionField): ExtractionField {
  if (!field.rawValue || field.fieldStatus === 'MISSING') return field;

  let normalized = String(field.rawValue).trim();
  for (const { pattern, replacement } of HOTEL_CLEANUP_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }
  normalized = normalized.trim();

  return {
    ...field,
    rawValue: normalized,
    suggestedMapping: normalized,
  };
}

// ── Landing Route Resolver ───────────────────────────────────

/**
 * Resolve landing route from extracted text.
 * Route format: JED.C-M, JED.D-J, MED-J, etc.
 */
export function resolveLandingRoute(field: ExtractionField): ExtractionField {
  if (!field.rawValue || field.fieldStatus === 'MISSING') return field;

  const val = String(field.rawValue).trim().toUpperCase();

  // Known valid route patterns
  const validRoutes = [
    'JED.D-J', 'JED.C-M', 'JED.C-J', 'MED-J',
    'UD.D-J', 'UD.D-M', 'TD.D-J', 'TD.C-J', 'TD.C-M',
  ];

  // Exact match
  if (validRoutes.includes(val)) {
    return {
      ...field,
      rawValue: val,
      suggestedMapping: val,
      confidence: Math.max(field.confidence, 0.90),
    };
  }

  // Partial match
  for (const route of validRoutes) {
    if (val.includes(route) || route.includes(val)) {
      return {
        ...field,
        rawValue: route,
        suggestedMapping: route,
        confidence: 0.70,
        fieldStatus: 'NEED_REVIEW',
      };
    }
  }

  // No match
  return {
    ...field,
    fieldStatus: 'NEED_MAPPING',
    confidence: Math.min(field.confidence, 0.30),
  };
}
