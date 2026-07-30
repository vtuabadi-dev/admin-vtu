// ============================================================
// M-09: BUSINESS VALIDATOR — Generate Package Intelligence v2
// ============================================================
//
// Validates a PackageExtractionResultV2 against business rules.
// Produces a ValidationReport with:
// - Per-field validation (V-01 to V-12)
// - Completeness score (Formula F-03, CC-01 to CC-05)
// - Conflict detection (R-05)
// - Mandatory gate (R-03)
//
// Traceability:
// - Constitution Validation Catalog V-01 to V-12
// - Completeness Calculator (EEOS-ENG-003, CC-01 to CC-05)
// - Business Rules R-03, R-05, R-13
// ============================================================

import type {
  PackageExtractionResultV2,
  ValidationReport,
  FieldValidation,
  ConflictEntry,
  ExtractionField,
} from './types';

// ── Mandatory Fields (Completeness Calculator) ───────────────

/** Mandatory fields — 50% weight in completeness (CC-01) */
const MANDATORY_FIELDS: (keyof PackageExtractionResultV2)[] = [
  'departureDates',
  'price',
  'airline',
  'durationDays',
  'packageType',
];

/** Recommended fields — 30% weight */
const RECOMMENDED_FIELDS: (keyof PackageExtractionResultV2)[] = [
  'hotelMekkah',
  'hotelMadinah',
  'landingCity',
  'include',
];

/** Optional fields — 20% weight */
const OPTIONAL_FIELDS: (keyof PackageExtractionResultV2)[] = [
  'exclude',
  'promoText',
  'description',
  'notes',
  'perlengkapan',
  'itineraryDraft',
];

// ── Field Status Check ───────────────────────────────────────

/**
 * Check if an ExtractionField has usable data.
 */
function fieldHasValue(field: ExtractionField<unknown>): boolean {
  if (field.fieldStatus === 'MISSING') return false;
  if (field.rawValue === null || field.rawValue === undefined) return false;
  if (typeof field.rawValue === 'string' && field.rawValue.trim() === '') return false;
  if (Array.isArray(field.rawValue) && field.rawValue.length === 0) return false;
  return true;
}

/**
 * Get an ExtractionField from the extraction result by key.
 */
function getField(extraction: PackageExtractionResultV2, key: string): ExtractionField<unknown> | null {
  const value = (extraction as unknown as Record<string, unknown>)[key];
  if (value && typeof value === 'object' && 'fieldStatus' in value) {
    return value as ExtractionField<unknown>;
  }
  return null;
}

// ── Completeness Calculator (Formula F-03) ───────────────────

/**
 * Calculate business completeness score per Formula F-03.
 *
 * Formula:
 *   Score = (MandatoryComplete% × 0.50) +
 *           (RecommendedComplete% × 0.30) +
 *           (OptionalComplete% × 0.20)
 *
 * Ref: Completeness Calculator EEOS-ENG-003
 */
function calculateCompleteness(extraction: PackageExtractionResultV2): number {
  const mandatoryCount = MANDATORY_FIELDS.length;
  const recommendedCount = RECOMMENDED_FIELDS.length;
  const optionalCount = OPTIONAL_FIELDS.length;

  let mandatoryComplete = 0;
  for (const key of MANDATORY_FIELDS) {
    const field = getField(extraction, key);
    if (field && fieldHasValue(field)) mandatoryComplete++;
  }

  let recommendedComplete = 0;
  for (const key of RECOMMENDED_FIELDS) {
    const field = getField(extraction, key);
    if (field && fieldHasValue(field)) recommendedComplete++;
  }

  let optionalComplete = 0;
  for (const key of OPTIONAL_FIELDS) {
    const field = getField(extraction, key);
    if (field && fieldHasValue(field)) optionalComplete++;
  }

  const mandatoryPct = mandatoryCount > 0 ? mandatoryComplete / mandatoryCount : 0;
  const recommendedPct = recommendedCount > 0 ? recommendedComplete / recommendedCount : 0;
  const optionalPct = optionalCount > 0 ? optionalComplete / optionalCount : 0;

  const score = (mandatoryPct * 0.50 + recommendedPct * 0.30 + optionalPct * 0.20) * 100;
  return Math.round(score * 10) / 10;
}

// ── Aggregate Confidence (Formula F-04) ──────────────────────

/**
 * Calculate aggregate confidence across all fields.
 * Formula F-04: Average of all field confidences.
 */
function calculateAggregateConfidence(extraction: PackageExtractionResultV2): number {
  const allFields = [...MANDATORY_FIELDS, ...RECOMMENDED_FIELDS, ...OPTIONAL_FIELDS];
  let totalConfidence = 0;
  let count = 0;

  for (const key of allFields) {
    const field = getField(extraction, key);
    if (field) {
      totalConfidence += field.confidence;
      count++;
    }
  }

  return count > 0 ? Math.round((totalConfidence / count) * 100) / 100 : 0;
}

// ── Validation Rules (V-01 to V-12) ─────────────────────────

/**
 * Run all validation rules against the extraction result.
 */
function runFieldValidations(extraction: PackageExtractionResultV2): FieldValidation[] {
  const validations: FieldValidation[] = [];

  // V-04: Mandatory fields must be present
  for (const key of MANDATORY_FIELDS) {
    const field = getField(extraction, key);
    if (!field || !fieldHasValue(field)) {
      validations.push({
        fieldName: key,
        status: 'FAIL',
        rule: 'V-04',
        message: `Mandatory field '${key}' is MISSING`,
      });
    } else {
      validations.push({
        fieldName: key,
        status: 'PASS',
        rule: 'V-04',
        message: `Mandatory field '${key}' is present`,
      });
    }
  }

  // V-05: Duration must be 3-45 days
  const durationField = extraction.durationDays;
  if (fieldHasValue(durationField)) {
    const val = durationField.rawValue;
    if (typeof val === 'number' && (val < 3 || val > 45)) {
      validations.push({
        fieldName: 'durationDays',
        status: 'WARNING',
        rule: 'V-05',
        message: `Duration ${val} hari di luar range normal (3-45)`,
      });
    }
  }

  // V-06: Departure dates must be in the future
  const datesField = extraction.departureDates;
  if (fieldHasValue(datesField) && Array.isArray(datesField.rawValue)) {
    const today = new Date().toISOString().split('T')[0]!;
    for (const date of datesField.rawValue) {
      if (date < today) {
        validations.push({
          fieldName: 'departureDates',
          status: 'WARNING',
          rule: 'V-06',
          message: `Tanggal ${date} sudah lewat (past date)`,
        });
      }
    }
  }

  // V-07: Price must be reasonable (10M - 500M IDR)
  const priceField = extraction.price;
  if (fieldHasValue(priceField)) {
    const val = priceField.rawValue;
    if (typeof val === 'number' && (val < 10_000_000 || val > 500_000_000)) {
      validations.push({
        fieldName: 'price',
        status: 'WARNING',
        rule: 'V-07',
        message: `Harga ${val} di luar range normal (10jt - 500jt)`,
      });
    }
  }

  // V-11: Low confidence fields
  const allFields = [...MANDATORY_FIELDS, ...RECOMMENDED_FIELDS, ...OPTIONAL_FIELDS];
  for (const key of allFields) {
    const field = getField(extraction, key);
    if (field && fieldHasValue(field) && field.confidence < 0.5) {
      validations.push({
        fieldName: key,
        status: 'WARNING',
        rule: 'V-11',
        message: `Field '${key}' confidence rendah (${field.confidence}). Perlu verifikasi.`,
      });
    }
  }

  return validations;
}

// ── Conflict Detection (R-05) ────────────────────────────────

/**
 * Detect conflicts between two extraction sources for the same field.
 * A conflict exists when two sources provide different non-empty values.
 *
 * Ref: Constitution Principle 11, R-05
 */
export function detectConflicts(
  captionField: ExtractionField<unknown> | null,
  flyerField: ExtractionField<unknown> | null,
  fieldName: string
): ConflictEntry | null {
  if (!captionField || !flyerField) return null;
  if (!fieldHasValue(captionField) || !fieldHasValue(flyerField)) return null;

  const captionVal = String(captionField.rawValue).trim().toUpperCase();
  const flyerVal = String(flyerField.rawValue).trim().toUpperCase();

  if (captionVal !== flyerVal) {
    return {
      fieldName,
      sources: [
        { source: captionField.source, value: captionField.rawValue },
        { source: flyerField.source, value: flyerField.rawValue },
      ],
      resolution: 'PENDING',
    };
  }

  return null;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Validate a PackageExtractionResultV2.
 * Returns a complete ValidationReport.
 *
 * Blocking rules (CC-01, CC-02):
 * - Mandatory < 100% → overallStatus = FAIL
 * - Completeness < 60% → overallStatus = FAIL
 */
export function validateExtraction(
  extraction: PackageExtractionResultV2,
  conflicts?: ConflictEntry[]
): ValidationReport {
  const fieldValidations = runFieldValidations(extraction);
  const completenessScore = calculateCompleteness(extraction);
  const aggregateConfidence = calculateAggregateConfidence(extraction);

  // Check mandatory completeness
  const mandatoryFails = fieldValidations.filter(v =>
    v.rule === 'V-04' && v.status === 'FAIL'
  );
  const mandatoryComplete = mandatoryFails.length === 0;

  // Build blockers
  const blockers: string[] = [];
  const warnings: string[] = [];

  // CC-01: Mandatory < 100%
  if (!mandatoryComplete) {
    blockers.push(
      `CC-01: Mandatory fields incomplete. Missing: ${mandatoryFails.map(f => f.fieldName).join(', ')}`
    );
  }

  // CC-02: Completeness < 60%
  if (completenessScore < 60) {
    blockers.push(
      `CC-02: Business completeness ${completenessScore}% < 60% minimum`
    );
  }

  // Collect warnings from field validations
  for (const v of fieldValidations) {
    if (v.status === 'WARNING') {
      warnings.push(`${v.rule}: ${v.message}`);
    }
  }

  // Overall status: FAIL if any blockers exist
  const overallStatus = blockers.length > 0 ? 'FAIL' : 'PASS';

  return {
    overallStatus,
    completenessScore,
    aggregateConfidence,
    mandatoryComplete,
    fieldValidations,
    conflicts: conflicts ?? [],
    blockers,
    warnings,
  };
}
