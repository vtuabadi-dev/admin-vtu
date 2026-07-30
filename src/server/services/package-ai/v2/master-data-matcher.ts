// ============================================================
// M-08: MASTER DATA MATCHER — Generate Package Intelligence v2
// ============================================================
//
// Matches resolved business objects to Master Data entries.
// Queries Master Airlines, Hotels, Cities, PackageTypes,
// and applies Alias Registry (AR-01 to AR-06).
//
// Key rules:
// - R-RM-02: mappedValue set by Human ONLY
// - R-RM-03: No match → NEED_MAPPING
// - R-RM-04: Match confirmed → MAPPED
// - R-RM-05: AI sets suggestedMapping (not mappedValue)
//
// Traceability:
// - Raw+Mapped Value Contract v1.0
// - Alias Resolver (EEOS-ENG-002)
// ============================================================

import type { ExtractionField, PackageExtractionResultV2 } from './types';
import { masterDataService } from '../../master-data.service';

// ── Types ────────────────────────────────────────────────────

interface MasterMatchResult {
  id: string;
  name: string;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
}

// ── Matching Logic ───────────────────────────────────────────

/**
 * Match a raw value against a list of Master Data entries.
 * Implements Alias Resolver resolution strategy:
 * - Exact match → confidence 1.0
 * - Alias match → confidence 0.90
 * - Fuzzy match → confidence 0.50-0.70
 * - No match → confidence 0.0
 */
function findBestMatch(
  rawValue: string,
  masterEntries: { id: string; name: string; aliases?: string[] }[]
): MasterMatchResult {
  const cleaned = rawValue.trim().toUpperCase();

  if (!cleaned) {
    return { id: '', name: '', confidence: 0, matchType: 'none' };
  }

  // 1. Exact match (AR-02)
  for (const entry of masterEntries) {
    if (entry.name.toUpperCase() === cleaned) {
      return { id: entry.id, name: entry.name, confidence: 1.0, matchType: 'exact' };
    }
  }

  // 2. Alias match (AR-02 via registry)
  for (const entry of masterEntries) {
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (alias.toUpperCase() === cleaned) {
          return { id: entry.id, name: entry.name, confidence: 0.90, matchType: 'alias' };
        }
      }
    }
  }

  // 3. Partial / contains match (AR-03)
  for (const entry of masterEntries) {
    if (entry.name.toUpperCase().includes(cleaned) || cleaned.includes(entry.name.toUpperCase())) {
      return { id: entry.id, name: entry.name, confidence: 0.65, matchType: 'fuzzy' };
    }
  }

  // 4. No match (AR-04)
  return { id: '', name: '', confidence: 0, matchType: 'none' };
}

/**
 * Apply match result to an ExtractionField.
 * - On match: suggestedMapping = Master ID (R-RM-05). fieldStatus stays EXTRACTED.
 * - On no match: fieldStatus = NEED_MAPPING (R-RM-03).
 *
 * IMPORTANT: mappedValue is NEVER set here. Only Human may set it (R-RM-02).
 */
function applyMatchToField<T>(
  field: ExtractionField<T>,
  match: MasterMatchResult
): ExtractionField<T> {
  if (match.matchType === 'none') {
    return {
      ...field,
      fieldStatus: 'NEED_MAPPING',
      suggestedMapping: null,
      // R-RM-03: No match → NEED_MAPPING
    };
  }

  return {
    ...field,
    suggestedMapping: match.id,
    // R-RM-05: AI sets suggestion, human confirms
    confidence: Math.max(field.confidence, match.confidence),
    confidenceFactors: {
      ...field.confidenceFactors,
      patternMatch: match.confidence,
    },
    // Keep EXTRACTED status — only human moves to MAPPED (R-RM-04)
    fieldStatus: field.fieldStatus === 'MISSING' ? 'MISSING' : 'EXTRACTED',
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Match all fields in a PackageExtractionResultV2 against Master Data.
 *
 * Queries:
 * - Master Airlines → airline field
 * - Master Hotels → hotelMekkah, hotelMadinah
 * - Master Cities → departureCity, landingCity
 * - Master Package Types → packageType
 *
 * Returns an updated extraction result with suggestedMapping populated
 * for matched fields, and NEED_MAPPING status for unmatched fields.
 */
export async function matchAgainstMasterData(
  extraction: PackageExtractionResultV2
): Promise<PackageExtractionResultV2> {
  // Fetch active Master Data
  let airlines: { id: string; name: string; aliases?: string[] }[] = [];
  let cities: { id: string; name: string; aliases?: string[] }[] = [];
  let hotels: { id: string; name: string; cityId?: string; aliases?: string[] }[] = [];

  try {
    const [airlineRes, cityRes, hotelRes] = await Promise.all([
      masterDataService.getAirlines({ isActive: true, limit: 200 }),
      masterDataService.getCities({ isActive: true, limit: 200 }),
      masterDataService.getHotels({ isActive: true, limit: 500 }),
    ]);

    airlines = airlineRes.data.map(a => ({
      id: a.id,
      name: a.name,
      aliases: [], // TODO: Load from Alias Registry table when available
    }));
    cities = cityRes.data.map(c => ({
      id: c.id,
      name: c.name,
      aliases: c.code ? [c.code] : [],
    }));
    hotels = hotelRes.data.map(h => ({
      id: h.id,
      name: h.name,
      cityId: h.cityId,
      aliases: [],
    }));
  } catch (error) {
    console.error('[MasterDataMatcher] Failed to fetch Master Data:', error);
    // R-07 mitigation: graceful degradation — all fields get NEED_MAPPING
    return markAllNeedMapping(extraction);
  }

  // Match airline
  const airlineMatch = findBestMatch(
    String(extraction.airline.rawValue ?? ''),
    airlines
  );
  const matchedAirline = applyMatchToField(extraction.airline, airlineMatch);

  // Match departure city
  const cityMatch = findBestMatch(
    String(extraction.startingPoint.rawValue ?? ''),
    cities
  );
  const matchedCity = applyMatchToField(extraction.startingPoint, cityMatch);

  // Match landing city
  const landingMatch = findBestMatch(
    String(extraction.landingCity.rawValue ?? ''),
    cities
  );
  const matchedLanding = applyMatchToField(extraction.landingCity, landingMatch);

  // Match hotels
  const hotelMekkahMatch = findBestMatch(
    String(extraction.hotelMekkah.rawValue ?? ''),
    hotels
  );
  const matchedHotelMekkah = applyMatchToField(extraction.hotelMekkah, hotelMekkahMatch);

  const hotelMadinahMatch = findBestMatch(
    String(extraction.hotelMadinah.rawValue ?? ''),
    hotels
  );
  const matchedHotelMadinah = applyMatchToField(extraction.hotelMadinah, hotelMadinahMatch);

  return {
    ...extraction,
    airline: matchedAirline,
    startingPoint: matchedCity,
    landingCity: matchedLanding,
    hotelMekkah: matchedHotelMekkah,
    hotelMadinah: matchedHotelMadinah,
  };
}

/**
 * Mark all matchable fields as NEED_MAPPING.
 * Used when Master Data fetch fails (graceful degradation).
 */
function markAllNeedMapping(
  extraction: PackageExtractionResultV2
): PackageExtractionResultV2 {
  const markNeedMapping = <T>(field: ExtractionField<T>): ExtractionField<T> => ({
    ...field,
    fieldStatus: field.fieldStatus === 'MISSING' ? 'MISSING' : 'NEED_MAPPING',
    suggestedMapping: null,
  });

  return {
    ...extraction,
    airline: markNeedMapping(extraction.airline),
    startingPoint: markNeedMapping(extraction.startingPoint),
    landingCity: markNeedMapping(extraction.landingCity),
    hotelMekkah: markNeedMapping(extraction.hotelMekkah),
    hotelMadinah: markNeedMapping(extraction.hotelMadinah),
  };
}
