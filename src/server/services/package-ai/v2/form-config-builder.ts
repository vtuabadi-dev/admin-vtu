// ============================================================
// M-11: FORM CONFIGURATION BUILDER — Generate Package Intelligence v2
// ============================================================
//
// Builds UI form configuration for Human Review interface.
// Produces FormConfig with:
// - Field grouping by category (Mandatory/Recommended/Optional)
// - Confidence visual indicators (🟢🟡🟠🔴)
// - Review priority ordering (HR-01 to HR-09)
//
// Traceability:
// - Human Review Constitution v1.0 (HR-01 to HR-09)
// - Confidence Framework — Visual Guide
// ============================================================

import type {
  PackageExtractionResultV2,
  EvidencePackage,
  ValidationReport,
  FormConfig,
  FormSection,
  FormFieldConfig,
  ReviewPriorityItem,
  ExtractionField,
} from './types';
import { getConfidenceIndicator } from './types';

// ── Field Metadata ───────────────────────────────────────────

interface FieldMeta {
  key: string;
  label: string;
  type: FormFieldConfig['type'];
  sectionId: string;
}

const FIELD_METADATA: FieldMeta[] = [
  // Mandatory Section — Identity & Transport
  { key: 'packageType', label: 'Jenis Paket', type: 'select', sectionId: 'identity' },
  { key: 'durationDays', label: 'Durasi (Hari)', type: 'number', sectionId: 'identity' },
  { key: 'startingPoint', label: 'Kota Keberangkatan', type: 'select', sectionId: 'identity' },
  { key: 'airline', label: 'Maskapai', type: 'select', sectionId: 'transport' },
  { key: 'departureDates', label: 'Tanggal Keberangkatan', type: 'array', sectionId: 'departure' },
  { key: 'pricingMode', label: 'Mode Harga', type: 'select', sectionId: 'pricing' },
  { key: 'price', label: 'Harga Paket', type: 'number', sectionId: 'pricing' },

  // Recommended Section
  { key: 'hotelMekkah', label: 'Hotel Mekkah', type: 'select', sectionId: 'hotel' },
  { key: 'hotelMadinah', label: 'Hotel Madinah', type: 'select', sectionId: 'hotel' },
  { key: 'landingCity', label: 'Kota Landing', type: 'select', sectionId: 'transport' },
  { key: 'landingRoute', label: 'Rute In-Out', type: 'select', sectionId: 'transport' },
  { key: 'include', label: 'Termasuk', type: 'array', sectionId: 'facilities' },

  // Optional Section
  { key: 'exclude', label: 'Tidak Termasuk', type: 'array', sectionId: 'facilities' },
  { key: 'promoText', label: 'Teks Promo', type: 'text', sectionId: 'marketing' },
  { key: 'description', label: 'Deskripsi', type: 'text', sectionId: 'marketing' },
  { key: 'notes', label: 'Catatan', type: 'text', sectionId: 'marketing' },
  { key: 'perlengkapan', label: 'Perlengkapan', type: 'array', sectionId: 'facilities' },
  { key: 'itineraryDraft', label: 'Draft Itinerary', type: 'array', sectionId: 'itinerary' },
  { key: 'upgradeDouble', label: 'Upgrade Double', type: 'number', sectionId: 'pricing' },
  { key: 'upgradeTriple', label: 'Upgrade Triple', type: 'number', sectionId: 'pricing' },
  { key: 'isAdaPerlengkapan', label: 'Perlengkapan Termasuk?', type: 'select', sectionId: 'facilities' },
  { key: 'programName', label: 'Nama Program', type: 'text', sectionId: 'identity' },
];

// ── Section Definitions ──────────────────────────────────────

const SECTION_DEFINITIONS: { id: string; title: string; order: number }[] = [
  { id: 'identity', title: 'Identitas Paket', order: 1 },
  { id: 'departure', title: 'Keberangkatan', order: 2 },
  { id: 'transport', title: 'Transportasi', order: 3 },
  { id: 'pricing', title: 'Harga', order: 4 },
  { id: 'hotel', title: 'Hotel', order: 5 },
  { id: 'facilities', title: 'Fasilitas', order: 6 },
  { id: 'itinerary', title: 'Itinerary', order: 7 },
  { id: 'marketing', title: 'Marketing', order: 8 },
];

// ── Review Priority Logic (HR-01 to HR-09) ───────────────────

/**
 * Determine review priority for a field.
 * Ref: Human Review Constitution — Mandatory Review Scope
 */
function getReviewPriority(
  field: ExtractionField<unknown>,
  fieldName: string
): ReviewPriorityItem | null {
  // HR-01: confidence < 0.5
  if (field.confidence < 0.5 && field.fieldStatus !== 'MISSING') {
    return {
      fieldName,
      priority: 'HIGH',
      reason: 'HR-01: Confidence rendah — AI tidak yakin',
    };
  }

  // HR-02: CONFLICT
  if (field.fieldStatus === 'CONFLICT') {
    return {
      fieldName,
      priority: 'HIGH',
      reason: 'HR-02: Dua source memberikan data berbeda',
    };
  }

  // HR-03: NEED_MAPPING
  if (field.fieldStatus === 'NEED_MAPPING') {
    return {
      fieldName,
      priority: 'HIGH',
      reason: 'HR-03: AI tidak bisa memetakan ke Master Data',
    };
  }

  // HR-05: Harga paket — always HIGH priority
  if (fieldName === 'price' || fieldName === 'upgradeDouble' || fieldName === 'upgradeTriple') {
    if (field.fieldStatus !== 'MISSING') {
      return {
        fieldName,
        priority: 'HIGH',
        reason: 'HR-05: Harga paket — AI sering salah membaca',
      };
    }
  }

  // HR-06: Departure dates — always HIGH priority
  if (fieldName === 'departureDates' && field.fieldStatus !== 'MISSING') {
    return {
      fieldName,
      priority: 'HIGH',
      reason: 'HR-06: Multi-date — setiap tanggal harus benar',
    };
  }

  // HR-07: Recommended fields — quick check
  if (field.category === 'RECOMMENDED' && field.fieldStatus !== 'MISSING') {
    return {
      fieldName,
      priority: 'MEDIUM',
      reason: 'HR-07: Recommended field — quick check',
    };
  }

  // HR-09: High confidence — quick visual check
  if (field.confidence > 0.9 && field.fieldStatus !== 'MISSING') {
    return {
      fieldName,
      priority: 'LOW',
      reason: 'HR-09: Confidence tinggi — quick visual check',
    };
  }

  return null;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Build form configuration for Human Review UI.
 *
 * Strategy:
 * 1. Group fields by section
 * 2. Calculate confidence indicators for each field
 * 3. Determine review priority (HR-01 to HR-09)
 * 4. Sort sections and fields by priority
 *
 * @param sessionId Pipeline session ID
 * @param extraction The extraction result
 * @param evidence Evidence package with per-field provenance
 * @param validationReport Validation results
 */
export function buildFormConfig(
  sessionId: string,
  extraction: PackageExtractionResultV2,
  _evidence: EvidencePackage,
  validationReport: ValidationReport
): FormConfig {
  const sections: FormSection[] = [];
  const reviewPriority: ReviewPriorityItem[] = [];

  // Build validation message lookup
  const validationMessages = new Map<string, string>();
  for (const v of validationReport.fieldValidations) {
    if (v.status === 'FAIL' || v.status === 'WARNING') {
      validationMessages.set(v.fieldName, `${v.rule}: ${v.message}`);
    }
  }

  // Group fields by section
  const sectionFieldsMap = new Map<string, FormFieldConfig[]>();

  for (const meta of FIELD_METADATA) {
    const value = (extraction as unknown as Record<string, unknown>)[meta.key];
    if (!value || typeof value !== 'object' || !('fieldStatus' in value)) continue;

    const field = value as ExtractionField<unknown>;

    // Determine review requirements
    const requiresReview = field.fieldStatus === 'CONFLICT' ||
      field.fieldStatus === 'NEED_MAPPING' ||
      field.fieldStatus === 'NEED_REVIEW' ||
      (field.confidence < 0.5 && field.fieldStatus !== 'MISSING') ||
      field.category === 'MANDATORY';

    const quickReview = field.category === 'RECOMMENDED' ||
      field.category === 'OPTIONAL' ||
      field.confidence > 0.9;

    const formField: FormFieldConfig = {
      fieldName: meta.key,
      label: meta.label,
      type: meta.type,
      value: field.rawValue,
      rawValue: field.rawValue,
      confidence: field.confidence,
      confidenceIndicator: getConfidenceIndicator(field.confidence),
      fieldStatus: field.fieldStatus,
      requiresReview,
      quickReview: quickReview && !requiresReview,
      validationMessage: validationMessages.get(meta.key),
    };

    // Add to section
    const existing = sectionFieldsMap.get(meta.sectionId) ?? [];
    existing.push(formField);
    sectionFieldsMap.set(meta.sectionId, existing);

    // Determine review priority
    const priority = getReviewPriority(field, meta.key);
    if (priority) reviewPriority.push(priority);
  }

  // Build sorted sections
  for (const def of SECTION_DEFINITIONS) {
    const fields = sectionFieldsMap.get(def.id);
    if (!fields || fields.length === 0) continue;

    // Determine section category from first mandatory field, or default
    const hasMandatory = fields.some(f => f.requiresReview);
    const category = hasMandatory ? 'MANDATORY' as const : 'RECOMMENDED' as const;

    sections.push({
      id: def.id,
      title: def.title,
      category,
      fields,
    });
  }

  // Sort review priority: HIGH first, then MEDIUM, then LOW
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  reviewPriority.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    sessionId,
    sections,
    reviewPriority,
  };
}
