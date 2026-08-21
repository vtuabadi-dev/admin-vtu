// ============================================================
// M-04: CAPTION SECTION PARSERS — Generate Package Intelligence v2
// ============================================================
//
// Per-section parsers that extract structured ExtractionField
// values from caption text sections identified by M-03.
//
// Each parser:
// - Accepts raw text (section or full caption)
// - Returns ExtractionField<T> with proper confidence, source,
//   and fieldStatus
// - Never invents data (Principle 9: Business Truth)
// - Reports MISSING when data not found
//
// Traceability:
// - Constitution Data Extraction Contract A-J
// - Business Engines: Date Normalizer (EEOS-ENG-004),
//   Duration Calculator (EEOS-ENG-005)
// - Confidence Framework v1.0
// ============================================================

import type { ExtractionField, PackageType, PricingMode } from './types';
import { createMissingField, createExtractedField } from './types';

// ── Indonesian Month Map (Date Normalizer DN-01, DN-02) ──────

const MONTH_MAP: Record<string, number> = {
  JANUARI: 1, FEBRUARI: 2, MARET: 3, APRIL: 4, MEI: 5, JUNI: 6,
  JULI: 7, AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12,
  JAN: 1, FEB: 2, MAR: 3, APR: 4, JUN: 6, JUL: 7,
  AGS: 8, AGT: 8, SEP: 9, SEPT: 9, OKT: 10, NOV: 11, DES: 12,
};

const MONTH_NAMES = Object.keys(MONTH_MAP).join('|');

// ── Date Parser (Date Normalizer EEOS-ENG-004) ───────────────

/**
 * Extract departure dates from text.
 * Handles Indonesian date formats (DN-01 to DN-06).
 *
 * Returns ExtractionField<string[]> containing ISO dates.
 * Ref: Date Normalizer, Data Extraction Contract B
 */
export function parseDates(text: string): ExtractionField<string[]> {
  const dates: string[] = [];
  const currentYear = new Date().getFullYear();

  // Find fallback 4-digit year in text
  const yearMatches = text.match(/\b(202[4-9]|203[0-5])\b/g);
  const fallbackYear = yearMatches && yearMatches.length > 0
    ? parseInt(yearMatches[yearMatches.length - 1]!, 10)
    : currentYear;

  // Split text by pipe '|' symbol to treat '|' as date entry separator
  const segments = text.split(/\|/);

  for (const rawSeg of segments) {
    const seg = rawSeg.trim();
    if (!seg) continue;

    // Pattern 1: Slash/dash dates "12/10/2026", "2026-10-12"
    const slashPattern = /(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = slashPattern.exec(seg)) !== null) {
      if (!sMatch[1] || !sMatch[2] || !sMatch[3]) continue;
      let p1 = parseInt(sMatch[1], 10);
      const p2 = parseInt(sMatch[2], 10);
      let p3 = parseInt(sMatch[3], 10);

      let year: number, month: number, day: number;
      if (p1 > 1000) { year = p1; month = p2; day = p3; }  // YYYY-MM-DD
      else { day = p1; month = p2; year = p3 < 100 ? p3 + 2000 : p3; }  // DD/MM/YYYY (DN-04)

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2024 && year <= 2035) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!dates.includes(iso)) dates.push(iso);
      }
    }

    // Pattern 2: Multi-day "12, 18, 25 OKTOBER 2026"
    const multiDayRe = new RegExp(
      `((?:\\d{1,2}\\s*(?:[,/&]|DAN|DAN/ATAU)\\s*)+\\d{1,2})\\s+(${MONTH_NAMES})\\s*(\\d{4})?`,
      'gi'
    );
    let mMatch: RegExpExecArray | null;
    while ((mMatch = multiDayRe.exec(seg)) !== null) {
      const daysStr = mMatch[1];
      const monthName = mMatch[2]?.toUpperCase() ?? '';
      const yearStr = mMatch[3];
      if (!daysStr || !monthName) continue;

      const month = MONTH_MAP[monthName];
      const year = yearStr ? parseInt(yearStr, 10) : fallbackYear;

      if (month && !isNaN(year)) {
        const dayNumbers = daysStr.split(/[^0-9]+/).map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 1 && d <= 31);
        for (const day of dayNumbers) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!dates.includes(iso)) dates.push(iso);
        }
      }
    }

    // Pattern 3: Single date "15 JULI 2026"
    const singleDateRe = new RegExp(
      `(\\d{1,2})\\s+(${MONTH_NAMES})\\s*(\\d{4})?`,
      'gi'
    );
    let dMatch: RegExpExecArray | null;
    while ((dMatch = singleDateRe.exec(seg)) !== null) {
      const dayStr = dMatch[1];
      const monthName = dMatch[2]?.toUpperCase() ?? '';
      const yearStr = dMatch[3];
      if (!dayStr || !monthName) continue;

      const day = parseInt(dayStr, 10);
      if (isNaN(day) || day < 1 || day > 31) continue;

      const month = MONTH_MAP[monthName];
      const year = yearStr ? parseInt(yearStr, 10) : fallbackYear;

      if (month && !isNaN(year)) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!dates.includes(iso)) dates.push(iso);
      }
    }
  }

  const sorted = dates.sort();

  if (sorted.length === 0) {
    return createMissingField<string[]>('MANDATORY');
  }

  // Confidence based on count and format clarity
  const confidence = sorted.length >= 1 ? 0.85 : 0.5;
  return createExtractedField<string[]>(sorted, 'caption', confidence, 'MANDATORY', {
    patternMatch: confidence,
    sourceAgreement: 1.0,
  });
}

// ── Duration Parser (Duration Calculator EEOS-ENG-005) ───────

/**
 * Extract duration in days from text.
 * Handles patterns: "X HARI", "DURASI: X HARI", "X Hari / Y Malam"
 * Valid range: 3-45 days.
 *
 * Ref: Duration Calculator, Data Extraction Contract A
 */
export function parseDuration(text: string): ExtractionField<number> {
  const patterns = [
    /(?:PAKET\s+)?\w+(?:\s+\w+)?\s+(\d{1,2})\s*HARI/i,
    /(?:DURASI|LAMA|LAMA\s+PERJALANAN)\s*[:=]?\s*(\d{1,2})\s*HARI/i,
    /(\d{1,2})\s*HARI\s*\/\s*\d{1,2}\s*MALAM/i,
    /(\d{1,2})\s*HARI/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const days = parseInt(match[1], 10);
      if (days >= 3 && days <= 45) {
        return createExtractedField<number>(days, 'caption', 0.90, 'MANDATORY', {
          patternMatch: 0.95,
        });
      }
      // Out of valid range — still extract but lower confidence
      if (days > 0) {
        return createExtractedField<number>(days, 'caption', 0.40, 'MANDATORY', {
          patternMatch: 0.40,
          contextConsistency: 0.20,
        });
      }
    }
  }

  return createMissingField<number>('MANDATORY');
}

// ── Price Parser ─────────────────────────────────────────────

/**
 * Parse a price number from text.
 * Handles: "45.5 Jt", "45.500.000", "Rp 45.500.000", "45500000"
 */
function parseNominal(text: string): number | null {
  // "5jt" or "45.5 juta"
  const jtMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i);
  if (jtMatch?.[1]) {
    const num = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(num)) return Math.round(num * 1_000_000);
  }
  // "45.500.000" or "45500000"
  const numMatch = text.match(/(\d{1,3}(?:\.\d{3})+|\d{6,10})/);
  if (numMatch?.[1]) {
    const numStr = numMatch[1].replace(/\D/g, '');
    const val = parseInt(numStr, 10);
    if (val > 0) return val;
  }
  return null;
}

/**
 * Extract base price from text.
 * Ref: Data Extraction Contract D
 */
export function parsePrice(text: string): ExtractionField<number> {
  // Look for explicit price markers
  const pricePatterns = [
    /(?:HARGA|PRICE|BIAYA|TARIF|INVESTASI)\s*[:=]?\s*(?:RP\.?\s*)?(.+?)(?:$|\n)/im,
    /(?:RP\.?\s*)(\d[\d.,]+(?:\s*(?:JT|JUTA))?)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const price = parseNominal(match[1]);
      if (price && price > 0) {
        return createExtractedField<number>(price, 'caption', 0.80, 'MANDATORY', {
          patternMatch: 0.85,
        });
      }
    }
  }

  // Fallback: try to find any large number that looks like a price
  const allNumbers = text.match(/\d{1,3}(?:\.\d{3}){1,3}|\d{7,10}/g);
  if (allNumbers) {
    for (const numStr of allNumbers) {
      const val = parseInt(numStr.replace(/\D/g, ''), 10);
      if (val >= 10_000_000 && val <= 500_000_000) {
        return createExtractedField<number>(val, 'caption', 0.50, 'MANDATORY', {
          patternMatch: 0.50,
          contextConsistency: 0.40,
        });
      }
    }
  }

  return createMissingField<number>('MANDATORY');
}

/**
 * Extract room upgrade prices (Double and Triple).
 * Ref: Data Extraction Contract D, Constitution Principle 7
 */
export function parseUpgradePrices(text: string): {
  upgradeDouble: ExtractionField<number>;
  upgradeTriple: ExtractionField<number>;
} {
  let upgradeDouble: ExtractionField<number> = createMissingField<number>('OPTIONAL');
  let upgradeTriple: ExtractionField<number> = createMissingField<number>('OPTIONAL');

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const reversed = [...lines].reverse();

  for (const line of reversed) {
    const upper = line.toUpperCase();

    if (upgradeDouble.fieldStatus === 'MISSING' &&
        (upper.includes('DOUBLE') || upper.includes('BERDUA') || upper.includes('BER 2') || upper.includes('BER-2') || upper.includes('TWIN'))) {
      const price = parseNominal(line);
      if (price) {
        upgradeDouble = createExtractedField<number>(price, 'caption', 0.80, 'OPTIONAL', {
          patternMatch: 0.85,
        });
      }
    }

    if (upgradeTriple.fieldStatus === 'MISSING' &&
        (upper.includes('TRIPLE') || upper.includes('BERTIGA') || upper.includes('BER 3') || upper.includes('BER-3'))) {
      const price = parseNominal(line);
      if (price) {
        upgradeTriple = createExtractedField<number>(price, 'caption', 0.80, 'OPTIONAL', {
          patternMatch: 0.85,
        });
      }
    }

    if (upgradeDouble.fieldStatus !== 'MISSING' && upgradeTriple.fieldStatus !== 'MISSING') break;
  }

  return { upgradeDouble, upgradeTriple };
}

// ── Airline Parser ───────────────────────────────────────────

/**
 * Extract airline name from text.
 * Ref: Data Extraction Contract C, R-15 (Airline Master Only)
 */
export function parseAirline(text: string): ExtractionField {
  const patterns = [
    /MASKAPAI\s*[:=]?\s*(.+?)(?:$|\n)/i,
    /(?:BY|FLIGHT|PENERBANGAN)\s+(.+?)(?:$|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const airlineName = match[1].trim();
      if (airlineName.length > 1) {
        return createExtractedField(airlineName, 'caption', 0.80, 'MANDATORY', {
          patternMatch: 0.85,
        });
      }
    }
  }

  // Fallback: known airline keywords in text
  const knownAirlines = [
    'SAUDIA', 'GARUDA', 'EMIRATES', 'QATAR', 'TURKISH',
    'OMAN AIR', 'ETIHAD', 'ROYAL BRUNEI', 'FLYNAS',
    'LION', 'BATIK', 'SCOOT',
  ];

  const upper = text.toUpperCase();
  for (const airline of knownAirlines) {
    if (upper.includes(airline)) {
      return createExtractedField(airline, 'caption', 0.70, 'MANDATORY', {
        patternMatch: 0.70,
        contextConsistency: 0.60,
      });
    }
  }

  return createMissingField('MANDATORY');
}

// ── Hotel Parser ─────────────────────────────────────────────

/**
 * Extract hotel name for a specific city.
 * Ref: Data Extraction Contract E, R-16 (Hotel Master Only)
 */
export function parseHotel(
  text: string,
  city: 'mekkah' | 'madinah'
): ExtractionField {
  const cityVariants = city === 'mekkah'
    ? ['MEKKAH', 'MAKKAH', 'MEKAH']
    : ['MADINAH', 'MADINA', 'MEDINAH'];

  for (const variant of cityVariants) {
    const patterns = [
      new RegExp(`HOTEL\\s*${variant}\\s*[:=]?\\s*(.+?)(?:$|\\n|\\(BINTANG)`, 'i'),
      new RegExp(`${variant}\\s*[:=]\\s*(.+?)(?:$|\\n|\\(BINTANG)`, 'i'),
      new RegExp(`HOTEL\\s*(?:DI\\s+)?${variant}\\s*[:=]\\s*(.+?)(?:$|\\n|\\(BINTANG)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const hotelName = match[1].trim()
          .replace(/\s*\([^)]*(?:BINTANG|BINTG|\*)\s*\d*\s*\)\s*/gi, '')
          .replace(/^HOTEL\s+/i, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (hotelName.length > 1) {
          return createExtractedField(hotelName, 'caption', 0.75, 'RECOMMENDED', {
            patternMatch: 0.80,
          });
        }
      }
    }
  }

  return createMissingField('RECOMMENDED');
}

// ── Package Type Parser (EEOS-ENG-006) ───────────────────────

/**
 * Classify package type from text.
 * Ref: Package Type Classifier EEOS-ENG-006
 */
export function parsePackageType(text: string): ExtractionField<PackageType> {
  const upper = text.toUpperCase();

  const typePatterns: { pattern: RegExp; type: PackageType; confidence: number }[] = [
    { pattern: /UMROH?\s*(?:REGULER|STANDAR|STANDARD)/i, type: 'umroh_reguler', confidence: 0.95 },
    { pattern: /UMROH?\s*PLUS/i, type: 'umroh_plus', confidence: 0.90 },
    { pattern: /PLUS\s*(?:TURKIYE|TURKI|TURKIE|TURKEY|DUBAI|EROPA|EUROPE|AQSHA|AL\s*AQSA)/i, type: 'umroh_plus', confidence: 0.90 },
    { pattern: /HAJI\s*KHUSUS/i, type: 'haji_khusus', confidence: 0.95 },
    { pattern: /WISATA\s*HALAL|MUSLIM\s*TOUR/i, type: 'wisata_halal', confidence: 0.90 },
  ];

  for (const { pattern, type, confidence } of typePatterns) {
    if (pattern.test(upper)) {
      return createExtractedField<PackageType>(type, 'caption', confidence, 'MANDATORY', {
        patternMatch: confidence,
      });
    }
  }

  // Default: umroh_reguler with low confidence (PT-01, PT-04)
  if (upper.includes('UMROH') || upper.includes('UMRAH')) {
    return createExtractedField<PackageType>('umroh_reguler', 'caption', 0.50, 'MANDATORY', {
      patternMatch: 0.50,
    });
  }

  // Fallback with NEED_REVIEW
  const field = createExtractedField<PackageType>('umroh_reguler', 'caption', 0.30, 'MANDATORY', {
    patternMatch: 0.30,
  });
  field.fieldStatus = 'NEED_REVIEW';
  return field;
}

// ── Starting Point / Departure City Parser ───────────────────

/**
 * Extract departure city (starting point) from text.
 * Ref: Data Extraction Contract A
 */
export function parseDepartureCity(text: string): ExtractionField {
  const patterns = [
    /BERANGKAT\s+(?:DARI\s+)?(.+?)(?:$|\n)/i,
    /START(?:ING)?\s+(.+?)(?:$|\n)/i,
    /KOTA\s+KEBERANGKATAN\s*[:=]?\s*(.+?)(?:$|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const city = match[1].trim();
      if (city.length > 1) {
        return createExtractedField(city, 'caption', 0.85, 'MANDATORY', {
          patternMatch: 0.90,
        });
      }
    }
  }

  return createMissingField('MANDATORY');
}

// ── Include/Exclude Parser ───────────────────────────────────

/**
 * Extract included items list from text.
 * Ref: Data Extraction Contract G
 */
export function parseInclude(text: string): ExtractionField<string[]> {
  const match = text.match(/(?:TERMASUK|INCLUDE|SUDAH\s+TERMASUK|FASILITAS|INCLUSIVE)\s*[:=]?\s*([\s\S]*)/i);
  if (match?.[1]) {
    const items = match[1]
      .split(/[\n,;]/)
      .map(item => item.replace(/^[-•*✓✔▸►→\d.)]+\s*/, '').trim())
      .filter(item => item.length > 1);

    if (items.length > 0) {
      return createExtractedField<string[]>(items, 'caption', 0.80, 'RECOMMENDED', {
        patternMatch: 0.85,
      });
    }
  }

  return createMissingField<string[]>('RECOMMENDED');
}

/**
 * Extract excluded items list from text.
 * Ref: Data Extraction Contract H
 */
export function parseExclude(text: string): ExtractionField<string[]> {
  const match = text.match(/(?:TIDAK\s+TERMASUK|BELUM\s+TERMASUK|EXCLUDE|NOT\s+INCLUDE|DILUAR\s+PAKET)\s*[:=]?\s*([\s\S]*)/i);
  if (match?.[1]) {
    const items = match[1]
      .split(/[\n,;]/)
      .map(item => item.replace(/^[-•*✓✔▸►→\d.)]+\s*/, '').trim())
      .filter(item => item.length > 1);

    if (items.length > 0) {
      return createExtractedField<string[]>(items, 'caption', 0.80, 'OPTIONAL', {
        patternMatch: 0.85,
      });
    }
  }

  return createMissingField<string[]>('OPTIONAL');
}

// ── Equipment Status Parser ──────────────────────────────────

/**
 * Detect equipment inclusion from text.
 * Ref: Data Extraction Contract F
 */
export function parseEquipmentStatus(text: string): ExtractionField<'ya' | 'tidak'> {
  const upper = text.toUpperCase();

  if (upper.includes('PERLENGKAPAN')) {
    const tidakIdx = upper.indexOf('TIDAK TERMASUK');
    const perlengkapanIdx = upper.indexOf('PERLENGKAPAN');

    if (tidakIdx !== -1 && perlengkapanIdx > tidakIdx) {
      return createExtractedField<'ya' | 'tidak'>('tidak', 'caption', 0.85, 'OPTIONAL', {
        patternMatch: 0.90,
      });
    }

    if (upper.includes('FREE PERLENGKAPAN') || upper.includes('TERMASUK PERLENGKAPAN') || upper.includes('PERLENGKAPAN UMROH')) {
      return createExtractedField<'ya' | 'tidak'>('ya', 'caption', 0.85, 'OPTIONAL', {
        patternMatch: 0.90,
      });
    }
  }

  return createMissingField<'ya' | 'tidak'>('OPTIONAL');
}

// ── Pricing Mode Detector ────────────────────────────────────

/**
 * Detect pricing mode from text.
 * Ref: Pricing Mode Constitution R-PR-01, R-PR-02
 */
export function parsePricingMode(text: string): ExtractionField<PricingMode> {
  const upper = text.toUpperCase();
  const clusterKeywords = ['SILVER', 'GOLD', 'PLATINUM', 'BRONZE', 'PROMO'];

  const hasCluster = clusterKeywords.some(kw => upper.includes(kw));

  if (hasCluster) {
    // R-PR-04: TIER detected, but flag for manual setup
    return createExtractedField<PricingMode>('TIER', 'caption', 0.80, 'MANDATORY', {
      patternMatch: 0.85,
    });
  }

  // Default: SINGLE (R-PR-01)
  return createExtractedField<PricingMode>('SINGLE', 'caption', 0.90, 'MANDATORY', {
    patternMatch: 0.90,
    contextConsistency: 0.95,
  });
}

// ── Promo Text Parser ────────────────────────────────────────

/**
 * Extract promotional text from caption.
 * Ref: Data Extraction Contract J
 */
export function parsePromoText(text: string): ExtractionField {
  const patterns = [
    /PROMO\s*[:=]?\s*(.+?)(?:$|\n)/i,
    /DISKON\s*(.+?)(?:$|\n)/i,
    /EARLY\s*BIRD\s*(.+?)(?:$|\n)/i,
    /SPESIAL\s*(.+?)(?:$|\n)/i,
    /BONUS\s*[:=]?\s*(.+?)(?:$|\n)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return createExtractedField(match[1].trim(), 'caption', 0.80, 'OPTIONAL', {
        patternMatch: 0.85,
      });
    }
  }

  return createMissingField('OPTIONAL');
}
