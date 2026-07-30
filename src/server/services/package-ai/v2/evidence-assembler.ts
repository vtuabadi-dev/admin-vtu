// ============================================================
// M-10: EVIDENCE ASSEMBLER — Generate Package Intelligence v2
// ============================================================
//
// Assembles per-field evidence (rawValue, mappedValue, source,
// confidence, fieldStatus) into a complete EvidencePackage.
//
// Traceability:
// - Constitution Principle 10 — Source Provenance
// - Confidence Framework v1.0 — Per-field confidence
// - Raw+Mapped Value Contract v1.0
// ============================================================

import type {
  PackageExtractionResultV2,
  ValidationReport,
  EvidencePackage,
  EvidenceField,
  ExtractionField,
  FieldSource,
} from './types';

// ── Field List ───────────────────────────────────────────────

const ALL_FIELD_KEYS: (keyof PackageExtractionResultV2)[] = [
  'startingPoint', 'packageType', 'durationDays', 'programName',
  'departureDates',
  'airline', 'landingCity', 'landingRoute',
  'pricingMode', 'price',
  'hotelMekkah', 'hotelMadinah',
  'perlengkapan', 'include', 'exclude',
  'itineraryDraft',
  'promoText', 'description', 'notes',
  'upgradeDouble', 'upgradeTriple', 'isAdaPerlengkapan',
];

// ── Evidence Field Builder ───────────────────────────────────

/**
 * Convert an ExtractionField to an EvidenceField.
 */
function toEvidenceField(
  field: ExtractionField<unknown>,
  validationResult?: 'PASS' | 'FAIL' | 'WARNING' | null
): EvidenceField {
  return {
    rawValue: field.rawValue,
    mappedValue: field.mappedValue,
    source: field.source,
    confidence: field.confidence,
    confidenceFactors: { ...field.confidenceFactors },
    fieldStatus: field.fieldStatus,
    category: field.category,
    validationResult: validationResult ?? null,
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Assemble evidence package from extraction result and validation report.
 *
 * Provides:
 * - Per-field evidence with full provenance chain
 * - Aggregate confidence (Formula F-04)
 * - Completeness score (from validation report)
 * - Source inventory (all sources used)
 *
 * Ref: Constitution Principle 10, Confidence Framework
 */
export function assembleEvidence(
  sessionId: string,
  extraction: PackageExtractionResultV2,
  validationReport: ValidationReport
): EvidencePackage {
  const fields: Record<string, EvidenceField> = {};
  const sourceSet = new Set<FieldSource>();

  // Build validation lookup
  const validationLookup = new Map<string, 'PASS' | 'FAIL' | 'WARNING'>();
  for (const v of validationReport.fieldValidations) {
    // Take worst status if multiple validations for same field
    const existing = validationLookup.get(v.fieldName);
    if (!existing || v.status === 'FAIL' || (v.status === 'WARNING' && existing !== 'FAIL')) {
      validationLookup.set(v.fieldName, v.status);
    }
  }

  // Process each field
  for (const key of ALL_FIELD_KEYS) {
    const value = (extraction as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object' && 'fieldStatus' in value) {
      const field = value as ExtractionField<unknown>;
      const validationResult = validationLookup.get(key) ?? null;

      fields[key] = toEvidenceField(field, validationResult);
      sourceSet.add(field.source);
    }
  }

  return {
    sessionId,
    timestamp: new Date(),
    fields,
    aggregateConfidence: validationReport.aggregateConfidence,
    completenessScore: validationReport.completenessScore,
    sourceInventory: Array.from(sourceSet),
  };
}
