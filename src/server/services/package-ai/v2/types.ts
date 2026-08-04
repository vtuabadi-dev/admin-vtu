// ============================================================
// M-01: TYPE SYSTEM — Generate Package Intelligence v2
// ============================================================
//
// FROZEN INTERFACE CONTRACTS
// All types defined here are frozen per the Engineering Execution Plan.
// No team may modify these interfaces without Orchestrator approval.
//
// Traceability:
// - Package Creation Bot Constitution v1.2 (R-01 to R-18)
// - Raw + Mapped Value Contract v1.0 (R-RM-01 to R-RM-07)
// - AI Governance Constitution v1.0
// - Confidence Framework v1.0
// - Human Review Constitution v1.0
// - Business Engine Documents (EEOS-ENG-001 to EEOS-ENG-007)
//
// EEOS Governance Baseline v1.2 (FROZEN)
// ============================================================

// ── Field Source Provenance (Principle 10: Source Provenance) ─

/**
 * Origin of an extracted field value.
 * Every field MUST record where its data came from.
 * Ref: Constitution Principle 10 — Source Provenance
 */
export type FieldSource =
  | 'flyer_ocr'        // OCR text from flyer image
  | 'caption'          // Text from caption/social media post
  | 'itinerary_ocr'    // OCR text from itinerary image
  | 'master_suggest'   // AI suggestion from Master Data matching
  | 'human_edit';      // Value manually entered/corrected by admin

// ── Field Business Status (Principle 13: Field Status) ───────

/**
 * Business status of an extraction field.
 * 7-state machine governing field lifecycle.
 *
 * State Machine:
 *   MISSING ──► EXTRACTED ──► MAPPED ──► VALIDATED
 *                   │            │
 *                   ├──► CONFLICT ──► VALIDATED (human resolve)
 *                   │
 *                   ├──► NEED_REVIEW ──► VALIDATED (human confirm)
 *                   │
 *                   └──► NEED_MAPPING ──► MAPPED ──► VALIDATED
 *
 * Ref: Constitution Principle 13, Raw+Mapped Value Contract R-RM-03/R-RM-04
 */
export type FieldStatus =
  | 'MISSING'         // Not found in any source
  | 'EXTRACTED'       // Found, not yet verified
  | 'CONFLICT'        // Two sources disagree — human must resolve (R-05)
  | 'MAPPED'          // Mapped to Master Data entry (R-RM-04)
  | 'NEED_REVIEW'     // Confidence < 0.5 — needs human verification
  | 'NEED_MAPPING'    // Raw value present, Master ID not yet assigned (R-RM-03)
  | 'VALIDATED';      // Human has approved this field value

// ── Field Category (Principle 14: Field Category) ────────────

/**
 * Business category determining a field's importance.
 * Mandatory failure blocks draft creation (R-03).
 * Ref: Constitution Principle 14, Completeness Calculator
 */
export type FieldCategory = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';

// ── Confidence Factors (Confidence Framework v1.0) ───────────

/**
 * Breakdown of how confidence score was calculated.
 * Weights per Confidence Framework:
 *   OCR Quality:         30%
 *   Pattern Match:       40%
 *   Source Agreement:    20%
 *   Context Consistency: 10%
 *
 * Anti-pattern: confidence = 1.0 for all fields is PROHIBITED.
 * Ref: Confidence Framework — Confidence Factors table
 */
export interface ConfidenceFactors {
  /** 30% weight — Kejelasan teks (blur, resolusi, kontras) */
  ocrQuality: number;
  /** 40% weight — Seberapa cocok extracted value dengan expected pattern */
  patternMatch: number;
  /** 20% weight — Apakah multiple source memberikan nilai yang sama */
  sourceAgreement: number;
  /** 10% weight — Apakah nilai konsisten dengan field lain */
  contextConsistency: number;
}

// ── Per-Field Extraction Contract (Principles 5, 6, 8, 10, 13)

/**
 * Core contract for every extracted field.
 * Implements Raw + Mapped Value separation per R-RM-01 to R-RM-07.
 *
 * Key rules:
 * - rawValue is NEVER modified after extraction (R-RM-01)
 * - mappedValue is ONLY set by Human (R-RM-02)
 * - suggestedMapping may be set by AI (R-RM-05)
 *
 * @template T The type of the raw value
 */
export interface ExtractionField<T = string> {
  /** Teks asli hasil ekstraksi AI — TIDAK PERNAH diubah (R-RM-01) */
  rawValue: T | null;
  /** Master Data ID — set by Human ONLY (R-RM-02) */
  mappedValue: string | null;
  /** AI suggestion for Master mapping — NOT authoritative (R-RM-05) */
  suggestedMapping: string | null;
  /** Origin of the data */
  source: FieldSource;
  /** Per-field confidence score 0.0 - 1.0 */
  confidence: number;
  /** Detailed confidence breakdown */
  confidenceFactors: ConfidenceFactors;
  /** Current business status in the field lifecycle */
  fieldStatus: FieldStatus;
  /** Business importance category */
  category: FieldCategory;
}

// ── Package Type (Package Type Classifier EEOS-ENG-006) ──────

/**
 * Known package types per Package Type Classifier.
 * Ref: EEOS-ENG-006 — Classification Rules
 */
export type PackageType =
  | 'umroh_reguler'
  | 'umroh_plus'
  | 'haji_khusus'
  | 'wisata_halal';

// ── Pricing Mode (Pricing Mode Constitution) ─────────────────

/**
 * Pricing mode per Pricing Mode Constitution.
 * SINGLE is default and currently supported.
 * TIER is deferred until Invoice Layer supports multi-price (R-PR-03).
 */
export type PricingMode = 'SINGLE' | 'TIER';

// ── Cluster Extraction (Tier Pricing future support) ─────────

/**
 * Per-cluster seat extraction (Silver, Gold, Platinum, Bronze).
 * Each cluster can have its own hotel and pricing.
 */
export interface ClusterExtraction {
  clusterName: string;
  hotelMekkah: ExtractionField | null;
  hotelMadinah: ExtractionField | null;
  hargaBase: ExtractionField<number> | null;
  upgradeDouble: ExtractionField<number> | null;
  upgradeTriple: ExtractionField<number> | null;
}

// ── Itinerary Day Structure (Data Extraction Contract I) ─────

/**
 * Single day in the itinerary.
 * Ref: Constitution Data Extraction Contract I
 */
export interface ItineraryDay {
  day: number;
  city: string;
  activities: string[];
  hotel: string | null;
}

// ── Package Extraction Result v2 (Data Extraction Contract A-J)

/**
 * Complete extraction result from the Fusion Engine pipeline.
 * Every field uses ExtractionField to carry raw/mapped values,
 * confidence, source provenance, and business status.
 *
 * Ref: Constitution Data Extraction Contract sections A through J
 */
export interface PackageExtractionResultV2 {
  // ── A. Package Identity ──────────────────────────────────
  /** Starting point (departure city) — Mandatory */
  startingPoint: ExtractionField;
  /** Package type classification — Mandatory */
  packageType: ExtractionField<PackageType>;
  /** Duration in days — Mandatory */
  durationDays: ExtractionField<number>;
  /** Generated program name — Optional */
  programName: ExtractionField;

  // ── B. Departure ─────────────────────────────────────────
  /** Array of ISO departure dates — Mandatory (R-02: 1 flyer N dates = N drafts) */
  departureDates: ExtractionField<string[]>;

  // ── C. Transportation ────────────────────────────────────
  /** Airline raw text — Mandatory */
  airline: ExtractionField;
  /** Landing city — Recommended */
  landingCity: ExtractionField;
  /** Landing route code (e.g. JED.C-M) — Recommended */
  landingRoute: ExtractionField;

  // ── D. Pricing ───────────────────────────────────────────
  /** Pricing mode: SINGLE or TIER — Mandatory */
  pricingMode: ExtractionField<PricingMode>;
  /** Base price (SINGLE mode) — Mandatory for SINGLE */
  price: ExtractionField<number>;
  /** Per-cluster pricing (TIER mode, future) */
  clusters: ClusterExtraction[];

  // ── E. Hotel ─────────────────────────────────────────────
  /** Hotel in Mekkah — Recommended */
  hotelMekkah: ExtractionField;
  /** Hotel in Madinah — Recommended */
  hotelMadinah: ExtractionField;

  // ── F. Perlengkapan ──────────────────────────────────────
  /** Equipment items — Optional */
  perlengkapan: ExtractionField<string[]>;

  // ── G. Include ───────────────────────────────────────────
  /** Items included in the package — Recommended */
  include: ExtractionField<string[]>;

  // ── H. Exclude ───────────────────────────────────────────
  /** Items excluded from the package — Optional */
  exclude: ExtractionField<string[]>;

  // ── I. Itinerary ─────────────────────────────────────────
  /** Day-by-day itinerary draft — Optional */
  itineraryDraft: ExtractionField<ItineraryDay[]>;

  // ── J. Marketing ─────────────────────────────────────────
  /** Promotional text — Optional */
  promoText: ExtractionField;
  /** Package description — Optional */
  description: ExtractionField;
  /** Additional notes — Optional */
  notes: ExtractionField;

  // ── Room Upgrades (from Caption) ─────────────────────────
  /** Double room upgrade price — Optional */
  upgradeDouble: ExtractionField<number>;
  /** Triple room upgrade price — Optional */
  upgradeTriple: ExtractionField<number>;
  /** Equipment inclusion flag — Optional */
  isAdaPerlengkapan: ExtractionField<'ya' | 'tidak'>;
}

// ── Draft Lifecycle (Business States L122-L148) ──────────────

/**
 * Draft package lifecycle status.
 *
 * State Machine:
 *   DRAFT → REVIEW → READY → PUBLISHED
 *     ↑                ↓
 *     └── REJECT ◄──────┘
 *
 * ARCHIVED is terminal (Admin discard).
 * PUBLISHED is terminal and IMMUTABLE (R-18).
 *
 * Ref: Constitution Business States
 */
export type DraftStatus = 'DRAFT' | 'REVIEW' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

/**
 * Valid state transitions per Constitution.
 * Used by Session Manager (M-02) to enforce workflow.
 */
export const VALID_DRAFT_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['READY', 'DRAFT', 'ARCHIVED'],
  READY: ['PUBLISHED', 'REVIEW'],
  PUBLISHED: [],  // Terminal — immutable (R-18)
  ARCHIVED: [],   // Terminal
};

// ── Pipeline Session (M-02 Session Manager contract) ─────────

/**
 * Complete pipeline session state.
 * Persisted in database (replacing in-memory Map<> from v1).
 * Ref: Constitution Business Events EVT-01 to EVT-14
 */
export interface PipelineSession {
  /** Unique session ID */
  id: string;
  /** Current draft lifecycle status */
  status: DraftStatus;
  /** Path to uploaded flyer image (EVT-01) */
  flyerPath: string | null;
  /** Path to uploaded itinerary image (EVT-03) */
  itineraryPath: string | null;
  /** Raw caption text (EVT-02) */
  captionText: string | null;
  /** Raw OCR text from flyer */
  rawOcrText: string | null;
  /** Raw OCR text from itinerary */
  rawItineraryOcrText: string | null;
  /** Complete extraction result (EVT-05, EVT-06) */
  extractionResult: PackageExtractionResultV2 | null;
  /** Business validation report (EVT-07) */
  validationReport: ValidationReport | null;
  /** Evidence package with full provenance */
  evidencePackage: EvidencePackage | null;
  /** Form configuration for Human Review UI */
  formConfig: FormConfig | null;
  /** User ID of reviewer */
  reviewedBy: string | null;
  /** Timestamp of review */
  reviewedAt: Date | null;
  /** ID of published Keberangkatan (EVT-13) */
  publishedPackageId: string | null;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ── Validation Report (V-01 to V-12, Completeness Calculator) ─

/**
 * Complete validation report from Business Validator (M-09).
 * Ref: Constitution Validation Catalog V-01 to V-12
 */
export interface ValidationReport {
  /** Overall validation result */
  overallStatus: 'PASS' | 'FAIL';
  /** Business completeness score 0-100 (Formula F-03) */
  completenessScore: number;
  /** Aggregate confidence 0.0-1.0 (Formula F-04) */
  aggregateConfidence: number;
  /** Whether all mandatory fields are present */
  mandatoryComplete: boolean;
  /** Per-field validation results */
  fieldValidations: FieldValidation[];
  /** Detected conflicts between sources */
  conflicts: ConflictEntry[];
  /** Blocking issues that prevent draft creation */
  blockers: string[];
  /** Non-blocking warnings */
  warnings: string[];
}

/**
 * Validation result for a single field.
 */
export interface FieldValidation {
  /** Name of the field */
  fieldName: string;
  /** Validation outcome */
  status: 'PASS' | 'FAIL' | 'WARNING';
  /** Reference to validation rule (V-01 to V-12) */
  rule: string;
  /** Human-readable message */
  message: string;
}

/**
 * Detected conflict between two or more sources.
 * AI MUST NOT resolve conflicts — only human may (R-05, R-11).
 * Ref: Constitution Principle 11 — Conflict Detection
 */
export interface ConflictEntry {
  /** Name of the conflicting field */
  fieldName: string;
  /** Values from each source */
  sources: { source: FieldSource; value: unknown }[];
  /** Resolution status */
  resolution: 'PENDING' | 'HUMAN_RESOLVED';
}

// ── Evidence Package (Principle 10, Confidence Framework) ────

/**
 * Complete evidence package with full provenance chain.
 * Assembled by Evidence Assembler (M-10).
 * Ref: Constitution Principle 10 — Source Provenance
 */
export interface EvidencePackage {
  /** Reference to the pipeline session */
  sessionId: string;
  /** Assembly timestamp */
  timestamp: Date;
  /** Per-field evidence with full provenance */
  fields: Record<string, EvidenceField>;
  /** Aggregate confidence across all fields (Formula F-04) */
  aggregateConfidence: number;
  /** Business completeness score (Formula F-03) */
  completenessScore: number;
  /** List of all sources used in this extraction */
  sourceInventory: FieldSource[];
}

/**
 * Evidence for a single field with full provenance.
 */
export interface EvidenceField {
  /** Raw extracted value */
  rawValue: unknown;
  /** Mapped Master Data ID (null until human maps) */
  mappedValue: string | null;
  /** Data source origin */
  source: FieldSource;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** Detailed confidence breakdown */
  confidenceFactors: ConfidenceFactors;
  /** Current business status */
  fieldStatus: FieldStatus;
  /** Field importance category */
  category: FieldCategory;
  /** Validation result for this field */
  validationResult: 'PASS' | 'FAIL' | 'WARNING' | null;
}

// ── Form Configuration (Human Review Constitution) ───────────

/**
 * Complete form configuration for Human Review UI.
 * Built by Form Configuration Builder (M-11).
 * Ref: Human Review Constitution — Review Workflow
 */
export interface FormConfig {
  /** Reference to the pipeline session */
  sessionId: string;
  /** Form sections grouped by field category */
  sections: FormSection[];
  /** Prioritized review items */
  reviewPriority: ReviewPriorityItem[];
}

/**
 * Section within the review form.
 */
export interface FormSection {
  /** Section identifier */
  id: string;
  /** Display title */
  title: string;
  /** Field category for this section */
  category: FieldCategory;
  /** Fields within this section */
  fields: FormFieldConfig[];
}

/**
 * Configuration for a single form field in Human Review UI.
 * Ref: Confidence Framework — Visual Guide
 */
export interface FormFieldConfig {
  /** Field key matching PackageExtractionResultV2 */
  fieldName: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'array';
  /** Current value */
  value: unknown;
  /** Original AI-extracted value (read-only display) */
  rawValue: unknown;
  /** Confidence score for visual indicator */
  confidence: number;
  /**
   * Visual confidence indicator.
   * 🟢 > 0.9  — "AI yakin"
   * 🟡 0.7-0.9 — "AI cukup yakin"
   * 🟠 0.5-0.7 — "Perlu dicek"
   * 🔴 < 0.5  — "Wajib diverifikasi"
   */
  confidenceIndicator: '🟢' | '🟡' | '🟠' | '🔴';
  /** Current business status */
  fieldStatus: FieldStatus;
  /** Whether this field requires mandatory review (HR-01 to HR-06) */
  requiresReview: boolean;
  /** Whether this field is a quick-check item (HR-07 to HR-09) */
  quickReview: boolean;
  /** Master Data options for select fields */
  masterDataOptions?: MasterDataOption[];
  /** Validation message if field has issues */
  validationMessage?: string;
}

/**
 * Master Data option for dropdown/select fields.
 */
export interface MasterDataOption {
  /** Master Data entry ID */
  id: string;
  /** Display label */
  label: string;
}

/**
 * Prioritized review item for Human Review workflow.
 * Ref: Human Review Constitution HR-01 to HR-09
 */
export interface ReviewPriorityItem {
  /** Field name requiring review */
  fieldName: string;
  /** Review priority level */
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Reason for review (HR-xx reference) */
  reason: string;
}

// ── Pipeline Orchestrator Contract (Fusion Engine) ───────────

/**
 * Input to the Pipeline Orchestrator (M-12).
 * Ref: Constitution Business Events EVT-01 to EVT-03
 */
export interface PipelineInput {
  /** Flyer image buffer (JPEG only — V-01) */
  flyerImage: Buffer;
  /** Optional itinerary image buffer */
  itineraryImage?: Buffer;
  /** Caption text (1-5000 chars — V-03) */
  caption: string;
  /** Admin user ID performing the upload */
  userId: string;
}

/**
 * Output from the Pipeline Orchestrator (M-12).
 * Contains N drafts for N departure dates (R-02).
 */
export interface PipelineOutput {
  /** Pipeline session with full state */
  session: PipelineSession;
  /** N draft packages for N dates (R-02: Multi-Date) */
  drafts: PackageDraftV2[];
  /** Form configuration for Human Review */
  formConfig: FormConfig;
  /** Business validation report */
  validationReport: ValidationReport;
  /** Evidence package with provenance chain */
  evidencePackage: EvidencePackage;
}

/**
 * A draft package awaiting review.
 * Each draft corresponds to one departure date (R-02).
 */
export interface PackageDraftV2 {
  /** Unique draft ID */
  id: string;
  /** Reference to parent pipeline session */
  sessionId: string;
  /** The specific departure date for this draft */
  departureDate: string;
  /** Complete extraction result */
  extractionResult: PackageExtractionResultV2;
  /** Current draft lifecycle status */
  status: DraftStatus;
  /** Path to the flyer image */
  flyerPath: string;
  /** Reviewer user ID */
  reviewedBy: string | null;
  /** Review timestamp */
  reviewedAt: string | null;
  /** Published Keberangkatan ID (after EVT-13) */
  publishedPackageId: string | null;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * 6-Step Fusion Engine pipeline stages.
 * Each step must complete before the next begins.
 *
 * Ref: Constitution Principle 8 — Fusion Engine
 *   Collect → Normalize → Merge → Conflict Detection → Validation → Draft Package
 */
export type PipelineStep =
  | 'COLLECT'           // EVT-01/02/03: Gather sources
  | 'NORMALIZE'         // Standardize formats (dates, numbers, text)
  | 'MERGE'             // Combine data from all sources
  | 'CONFLICT_DETECT'   // Find disagreements between sources (R-05)
  | 'VALIDATE'          // Business validation (V-01 to V-12)
  | 'DRAFT_PACKAGE';    // Create N drafts for N dates (R-02)

// ── Caption Section Types (M-03 Caption Section Splitter) ────

/**
 * Identified section within a caption text.
 * Used by Caption Section Splitter (M-03) and parsers (M-04).
 */
export interface CaptionSection {
  /** Section type identifier */
  type: CaptionSectionType;
  /** Raw text content of this section */
  content: string;
  /** Start line index in the original caption */
  startLine: number;
  /** End line index in the original caption */
  endLine: number;
}

/**
 * Types of sections that can be identified in a caption.
 */
export type CaptionSectionType =
  | 'identity'          // Package type, duration, title
  | 'transportation'    // Airline, flight info
  | 'departure'         // Departure dates, starting point
  | 'pricing'           // Prices, upgrade costs
  | 'hotel'             // Hotel names for Mekkah/Madinah
  | 'include'           // Items included in the package
  | 'exclude'           // Items not included
  | 'itinerary'         // Day-by-day schedule
  | 'promo'             // Promotional text
  | 'equipment'         // Perlengkapan (equipment)
  | 'unknown';          // Unclassified content

// ── Utility Types ────────────────────────────────────────────

/**
 * Helper to create a default ExtractionField with MISSING status.
 */
export function createMissingField<T = string>(category: FieldCategory): ExtractionField<T> {
  return {
    rawValue: null,
    mappedValue: null,
    suggestedMapping: null,
    source: 'caption',
    confidence: 0,
    confidenceFactors: {
      ocrQuality: 0,
      patternMatch: 0,
      sourceAgreement: 0,
      contextConsistency: 0,
    },
    fieldStatus: 'MISSING',
    category,
  };
}

/**
 * Helper to create an ExtractionField with EXTRACTED status.
 */
export function createExtractedField<T = string>(
  rawValue: T,
  source: FieldSource,
  confidence: number,
  category: FieldCategory,
  confidenceFactors?: Partial<ConfidenceFactors>,
): ExtractionField<T> {
  return {
    rawValue,
    mappedValue: null,
    suggestedMapping: null,
    source,
    confidence,
    confidenceFactors: {
      ocrQuality: confidenceFactors?.ocrQuality ?? confidence,
      patternMatch: confidenceFactors?.patternMatch ?? confidence,
      sourceAgreement: confidenceFactors?.sourceAgreement ?? confidence,
      contextConsistency: confidenceFactors?.contextConsistency ?? confidence,
    },
    fieldStatus: 'EXTRACTED',
    category,
  };
}

/**
 * Determine the confidence visual indicator per Confidence Framework.
 */
export function getConfidenceIndicator(confidence: number): '🟢' | '🟡' | '🟠' | '🔴' {
  if (confidence >= 0.9) return '🟢';
  if (confidence >= 0.7) return '🟡';
  if (confidence >= 0.5) return '🟠';
  return '🔴';
}

/**
 * Calculate weighted confidence from factors.
 * Weights: OCR 30%, Pattern 40%, Agreement 20%, Context 10%
 */
export function calculateWeightedConfidence(factors: ConfidenceFactors): number {
  return (
    factors.ocrQuality * 0.30 +
    factors.patternMatch * 0.40 +
    factors.sourceAgreement * 0.20 +
    factors.contextConsistency * 0.10
  );
}

// ── Re-export v1 types for backward compatibility ────────────

/**
 * v1 PackageExtractionResult is still used by existing code.
 * New code MUST use PackageExtractionResultV2.
 */
export type { PackageExtractionResult, PackageDraft, PackageDraftStatus, ClusterExtractionItem } from '../types';
