// ============================================================
// M-03: CAPTION SECTION SPLITTER — Generate Package Intelligence v2
// ============================================================
//
// Splits raw caption text into logical sections for downstream
// per-section parsers (M-04).
//
// This module implements the first stage of text processing:
//   Raw Caption → Identified Sections → Per-Section Parsing
//
// Traceability:
// - Constitution Principle 8 — Fusion Engine Step 1: Source Collection
// - Constitution Data Extraction Contract A-J
// - Business Events EVT-02 (Upload Caption)
// ============================================================

import type { CaptionSection, CaptionSectionType } from './types';

// ── Section Detection Patterns ───────────────────────────────

interface SectionPattern {
  type: CaptionSectionType;
  patterns: RegExp[];
}

/**
 * Patterns used to identify section types from caption lines.
 * Order matters — more specific patterns first.
 */
const SECTION_PATTERNS: SectionPattern[] = [
  {
    type: 'exclude',
    patterns: [
      /^(?:TIDAK\s+TERMASUK|BELUM\s+TERMASUK|EXCLUDE|NOT\s+INCLUDE|DILUAR\s+PAKET)/i,
    ],
  },
  {
    type: 'include',
    patterns: [
      /^(?:TERMASUK|INCLUDE|SUDAH\s+TERMASUK|FASILITAS|INCLUSIVE)/i,
    ],
  },
  {
    type: 'hotel',
    patterns: [
      /^(?:HOTEL\s+(?:MEKKAH|MAKKAH|MADINAH|MADINA)|HOTEL\s*[:=]|AKOMODASI)/i,
      /(?:HOTEL\s+DI\s+(?:MEKKAH|MAKKAH|MADINAH|MADINA))/i,
    ],
  },
  {
    type: 'transportation',
    patterns: [
      /^(?:MASKAPAI|AIRLINE|PENERBANGAN|FLIGHT|BY\s+(?:SAUDIA|GARUDA|EMIRATES|QATAR|TURKISH|LION|BATIK))/i,
      /(?:MASKAPAI\s*[:=])/i,
    ],
  },
  {
    type: 'pricing',
    patterns: [
      /^(?:HARGA|PRICE|BIAYA|TARIF|INVESTASI|SILVER|GOLD|PLATINUM|BRONZE)/i,
      /(?:RP\.?\s*\d|SEKAMAR\s+(?:BERDUA|BERTIGA|BER\s*\d)|UPGRADE\s+(?:DOUBLE|TRIPLE|KAMAR))/i,
    ],
  },
  {
    type: 'departure',
    patterns: [
      /^(?:JADWAL|TANGGAL|BERANGKAT|KEBERANGKATAN|DEPARTURE|SCHEDULE)/i,
      /^(?:START\s+|STARTING\s+)/i,
    ],
  },
  {
    type: 'itinerary',
    patterns: [
      /^(?:HARI\s+(?:KE\s*)?-?\d|DAY\s+\d|ITINERARY|PERJALANAN)/i,
      /^(?:HARI\s+PERTAMA|HARI\s+KEDUA|HARI\s+KETIGA)/i,
    ],
  },
  {
    type: 'equipment',
    patterns: [
      /^(?:PERLENGKAPAN|EQUIPMENT|FREE\s+PERLENGKAPAN|TERMASUK\s+PERLENGKAPAN)/i,
    ],
  },
  {
    type: 'promo',
    patterns: [
      /^(?:PROMO|DISKON|EARLY\s+BIRD|SPESIAL|BONUS|CASHBACK|POTONGAN)/i,
    ],
  },
  {
    type: 'identity',
    patterns: [
      /^(?:PAKET\s+(?:UMROH?|UMRAH|HAJI|WISATA)|PROGRAM\s+(?:UMROH?|UMRAH|HAJI))/i,
      /(?:UMROH?\s+(?:REGULER|PLUS|STANDAR)|HAJI\s+KHUSUS|WISATA\s+HALAL)/i,
      /(?:\d{1,2}\s*HARI)/i,
    ],
  },
];

// ── Line Classification ──────────────────────────────────────

/**
 * Classify a single line of caption text into a section type.
 * Returns 'unknown' if no pattern matches.
 */
function classifyLine(line: string): CaptionSectionType {
  const trimmed = line.trim();
  if (!trimmed) return 'unknown';

  for (const { type, patterns } of SECTION_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return type;
      }
    }
  }

  return 'unknown';
}

/**
 * Check if a line is a continuation of the previous section
 * (e.g., list items starting with -, •, *, or numbered items).
 */
function isContinuationLine(line: string): boolean {
  const trimmed = line.trim();
  // Bullet points, dashes, numbered lists, or plain indented content
  return /^[-•*✓✔▸►→]\s/.test(trimmed) ||
    /^\d+[.)]\s/.test(trimmed) ||
    /^\s{2,}\S/.test(line); // indented content
}

// ── Public API ───────────────────────────────────────────────

/**
 * Split a raw caption text into logical sections.
 *
 * Strategy:
 * 1. Split caption into lines
 * 2. Classify each line by section type
 * 3. Group consecutive lines of the same type
 * 4. Merge continuation lines (bullets, indented) into previous section
 * 5. Handle 'unknown' lines by merging into adjacent sections
 *
 * @param caption Raw caption text from social media / admin input
 * @returns Array of identified caption sections
 */
export function splitCaptionIntoSections(caption: string): CaptionSection[] {
  const trimmed = caption.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n');
  const sections: CaptionSection[] = [];
  let currentSection: CaptionSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmedLine = line.trim();

    // Skip completely empty lines
    if (!trimmedLine) {
      // Empty line can signal section boundary
      // but we don't close the current section yet
      continue;
    }

    // Check if this line is a continuation of the current section
    if (currentSection && isContinuationLine(line)) {
      currentSection.content += '\n' + trimmedLine;
      currentSection.endLine = i;
      continue;
    }

    // Classify the line
    const lineType = classifyLine(trimmedLine);

    if (lineType === 'unknown') {
      // If we have a current section, merge into it
      if (currentSection) {
        currentSection.content += '\n' + trimmedLine;
        currentSection.endLine = i;
      } else {
        // Start a new unknown section
        currentSection = {
          type: 'unknown',
          content: trimmedLine,
          startLine: i,
          endLine: i,
        };
      }
      continue;
    }

    // New section type detected
    if (currentSection && currentSection.type === lineType) {
      // Same type — extend current section
      currentSection.content += '\n' + trimmedLine;
      currentSection.endLine = i;
    } else {
      // Different type — save current and start new
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        type: lineType,
        content: trimmedLine,
        startLine: i,
        endLine: i,
      };
    }
  }

  // Push the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Get sections of a specific type from the split result.
 * Useful for downstream parsers that process specific section types.
 */
export function getSectionsByType(
  sections: CaptionSection[],
  type: CaptionSectionType
): CaptionSection[] {
  return sections.filter(s => s.type === type);
}

/**
 * Merge all sections back into a single text for full-text parsing.
 * Used when section-level parsing fails and fallback to full-text is needed.
 */
export function mergeSectionsToText(sections: CaptionSection[]): string {
  return sections.map(s => s.content).join('\n');
}

/**
 * Get the first section of a given type, or null if not found.
 */
export function getFirstSection(
  sections: CaptionSection[],
  type: CaptionSectionType
): CaptionSection | null {
  return sections.find(s => s.type === type) ?? null;
}
