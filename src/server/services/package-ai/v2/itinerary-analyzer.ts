// ============================================================
// M-06: ITINERARY ANALYZER — Generate Package Intelligence v2
// ============================================================
//
// Extracts structured itinerary from itinerary images/text.
// Produces day-by-day structure with city, activities, hotel.
// Also resolves landing city from itinerary (Landing Resolver).
//
// Traceability:
// - Data Extraction Contract I (Itinerary)
// - Landing Resolver (EEOS-ENG-007) — LR-01 to LR-04
// - AI Governance: Extract, Normalize, Flag
// ============================================================

import type { ExtractionField, ItineraryDay } from './types';
import { createExtractedField, createMissingField } from './types';

// ── Itinerary Parsing ────────────────────────────────────────

/**
 * Day header patterns for Indonesian itinerary text.
 */
const DAY_PATTERNS = [
  /^HARI\s+KE[\s-]*(\d+)/i,
  /^HARI\s+(\d+)/i,
  /^DAY\s+(\d+)/i,
  /^HARI\s+(PERTAMA|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM|KETUJUH|KEDELAPAN|KESEMBILAN|KESEPULUH)/i,
  /^H-?(\d+)/i,
];

/**
 * Map ordinal words to numbers.
 */
const ORDINAL_MAP: Record<string, number> = {
  PERTAMA: 1, KEDUA: 2, KETIGA: 3, KEEMPAT: 4, KELIMA: 5,
  KEENAM: 6, KETUJUH: 7, KEDELAPAN: 8, KESEMBILAN: 9, KESEPULUH: 10,
};

/**
 * Known city keywords in itinerary text.
 */
const CITY_KEYWORDS: Record<string, string> = {
  JEDDAH: 'Jeddah', JED: 'Jeddah', JEDDA: 'Jeddah',
  MADINAH: 'Madinah', MADINA: 'Madinah', MEDINAH: 'Madinah', MED: 'Madinah',
  MEKKAH: 'Mekkah', MAKKAH: 'Mekkah', MEKAH: 'Mekkah', MEK: 'Mekkah',
  ISTANBUL: 'Istanbul', DUBAI: 'Dubai', DOHA: 'Doha', CAIRO: 'Cairo',
  TAIF: 'Taif', AMMAN: 'Amman', JORDAN: 'Jordan',
  RIYADH: 'Riyadh', RUH: 'Riyadh',
};

/**
 * Extract day number from a text line.
 */
function extractDayNumber(line: string): number | null {
  for (const pattern of DAY_PATTERNS) {
    const match = line.trim().match(pattern);
    if (match?.[1]) {
      const ordinal = ORDINAL_MAP[match[1].toUpperCase()];
      if (ordinal) return ordinal;
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= 60) return num;
    }
  }
  return null;
}

/**
 * Detect city name from a text line.
 */
function detectCity(line: string): string | null {
  const upper = line.toUpperCase();
  for (const [keyword, canonical] of Object.entries(CITY_KEYWORDS)) {
    if (upper.includes(keyword)) return canonical;
  }
  return null;
}

/**
 * Detect hotel name from itinerary line.
 */
function detectHotel(line: string): string | null {
  const hotelMatch = line.match(/(?:HOTEL|CHECK[\s-]?IN|MENGINAP\s+DI)\s*[:=]?\s*(.+?)(?:$|\()/i);
  if (hotelMatch?.[1]) return hotelMatch[1].trim();
  return null;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Parse itinerary text into structured ItineraryDay array.
 *
 * Strategy:
 * 1. Split text into lines
 * 2. Identify day headers (HARI KE-1, DAY 1, etc.)
 * 3. Group subsequent lines under each day
 * 4. Extract city, activities, hotel per day
 *
 * @param text Raw itinerary text (from OCR or manual input)
 * @returns ExtractionField containing structured itinerary
 */
export function parseItinerary(text: string): ExtractionField<ItineraryDay[]> {
  if (!text || text.trim().length === 0) {
    return createMissingField<ItineraryDay[]>('OPTIONAL');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const days: ItineraryDay[] = [];
  let currentDay: ItineraryDay | null = null;

  for (const line of lines) {
    const dayNum = extractDayNumber(line);

    if (dayNum !== null) {
      // Save previous day
      if (currentDay) days.push(currentDay);

      // Start new day
      currentDay = {
        day: dayNum,
        city: detectCity(line) ?? '',
        activities: [],
        hotel: null,
      };

      // Activity might be on the same line as day header
      const afterHeader = line.replace(DAY_PATTERNS[0]!, '').replace(DAY_PATTERNS[1]!, '').trim();
      if (afterHeader.length > 3) {
        currentDay.activities.push(afterHeader);
        // Try to detect city from rest of line
        const cityInLine = detectCity(afterHeader);
        if (cityInLine && !currentDay.city) currentDay.city = cityInLine;
      }
    } else if (currentDay) {
      // Content line under current day
      const hotel = detectHotel(line);
      if (hotel) {
        currentDay.hotel = hotel;
      } else {
        currentDay.activities.push(line);
      }

      // Try to detect city if not yet found
      if (!currentDay.city) {
        const city = detectCity(line);
        if (city) currentDay.city = city;
      }
    }
  }

  // Push last day
  if (currentDay) days.push(currentDay);

  if (days.length === 0) {
    return createMissingField<ItineraryDay[]>('OPTIONAL');
  }

  // Confidence based on how many days were parsed
  const confidence = days.length >= 3 ? 0.80 : days.length >= 1 ? 0.60 : 0;

  return createExtractedField<ItineraryDay[]>(days, 'itinerary_ocr', confidence, 'OPTIONAL', {
    ocrQuality: 0.70,
    patternMatch: confidence,
    sourceAgreement: 0.80,
    contextConsistency: confidence,
  });
}

/**
 * Resolve landing city from itinerary.
 * Landing = first non-departure city in the itinerary (day 1 or 2).
 *
 * Ref: Landing Resolver EEOS-ENG-007
 * - LR-01: If itinerary available → take day 1 city
 * - LR-03: If not found → default Jeddah (for Umroh)
 * - LR-04: Landing must be in Master Cities
 */
export function resolveLandingFromItinerary(
  itinerary: ItineraryDay[],
  packageType?: string
): ExtractionField {
  // LR-01: Itinerary available → take city from first day
  if (itinerary.length > 0) {
    for (const day of itinerary) {
      if (day.city && day.city.length > 1) {
        // Exclude Indonesian cities (those are starting points, not landing)
        const landingCities = ['Jeddah', 'Madinah', 'Mekkah', 'Riyadh', 'Istanbul', 'Dubai', 'Doha', 'Cairo', 'Taif'];
        if (landingCities.includes(day.city)) {
          return createExtractedField(day.city, 'itinerary_ocr', 0.85, 'RECOMMENDED', {
            patternMatch: 0.90,
            contextConsistency: 0.85,
          });
        }
      }
    }
  }

  // LR-03: Default landing city based on package type
  const defaultLanding = getDefaultLanding(packageType);
  const field = createExtractedField(defaultLanding, 'itinerary_ocr', 0.40, 'RECOMMENDED', {
    patternMatch: 0.30,
    contextConsistency: 0.50,
  });
  field.fieldStatus = 'NEED_REVIEW';
  return field;
}

/**
 * Get default landing city per package type.
 * Ref: Landing Resolver — Default Landing table
 */
function getDefaultLanding(packageType?: string): string {
  switch (packageType) {
    case 'umroh_reguler':
    case 'umroh_plus':
      return 'Jeddah';
    case 'haji_khusus':
      return 'Jeddah'; // Could also be Madinah — NEED_REVIEW
    default:
      return 'Jeddah';
  }
}


/**
 * Resolve Route In-Out strictly from itinerary travel chronology (BR-ROUTE-01).
 * Never infer based on city frequency. Follows travel order (e.g. Jakarta -> Landing -> First Destination -> Out).
 */
export function resolveRouteFromItineraryChronology(
  itinerary: ItineraryDay[]
): ExtractionField {
  if (itinerary.length === 0) {
    return createMissingField('RECOMMENDED');
  }

  // Filter non-Indonesian cities in travel order
  const nonIndoCities = itinerary
    .map(d => d.city)
    .filter(c => c && !['Jakarta', 'Surabaya', 'Medan', 'Makassar', 'Solo', 'Yogyakarta', 'Bali', 'Bandung'].includes(c));

  if (nonIndoCities.length === 0) {
    return createMissingField('RECOMMENDED');
  }

  const landing = nonIndoCities[0];
  const firstDest = nonIndoCities.find(c => c !== landing) || landing;

  let routeCode = 'JED.D-J';
  if (landing === 'Jeddah') {
    if (firstDest === 'Madinah') {
      routeCode = 'JED.D-J';
    } else if (firstDest === 'Mekkah') {
      routeCode = 'JED.C-M';
    }
  } else if (landing === 'Madinah') {
    routeCode = 'MED-J';
  }

  return createExtractedField(routeCode, 'itinerary_ocr', 0.85, 'RECOMMENDED', {
    patternMatch: 0.90,
    contextConsistency: 0.90,
  });
}

