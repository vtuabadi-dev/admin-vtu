// ============================================================
// Generate Package Intelligence v2 — Barrel Export
// ============================================================
//
// Single entry point for all v2 modules.
// Import from '@/server/services/package-ai/v2' for all v2 types
// and services.
// ============================================================

// M-01: Type System
export type {
  FieldSource,
  FieldStatus,
  FieldCategory,
  ConfidenceFactors,
  ExtractionField,
  PackageType,
  PricingMode,
  ClusterExtraction,
  ItineraryDay,
  PackageExtractionResultV2,
  DraftStatus,
  PipelineSession,
  ValidationReport,
  FieldValidation,
  ConflictEntry,
  EvidencePackage,
  EvidenceField,
  FormConfig,
  FormSection,
  FormFieldConfig,
  MasterDataOption,
  ReviewPriorityItem,
  PipelineInput,
  PipelineOutput,
  PackageDraftV2,
  PipelineStep,
  CaptionSection,
  CaptionSectionType,
} from './types';

export {
  VALID_DRAFT_TRANSITIONS,
  createMissingField,
  createExtractedField,
  getConfidenceIndicator,
  calculateWeightedConfidence,
} from './types';

// M-02: Session Manager
export { SessionManager } from './session-manager';

// M-03: Caption Section Splitter
export { splitCaptionIntoSections, getSectionsByType, mergeSectionsToText, getFirstSection } from './caption-section-splitter';

// M-04: Caption Section Parsers
export {
  parseDates, parseDuration, parsePrice, parseUpgradePrices,
  parseAirline, parseHotel, parsePackageType, parseDepartureCity,
  parseInclude, parseExclude, parseEquipmentStatus,
  parsePricingMode, parsePromoText,
} from './caption-section-parsers';

// M-05: Flyer Visual Analyzer
export { analyzeFlyer } from './flyer-visual-analyzer';
export type { FlyerAnalysisResult } from './flyer-visual-analyzer';

// M-06: Itinerary Analyzer
export { parseItinerary, resolveLandingFromItinerary } from './itinerary-analyzer';

// M-07: Business Object Resolvers
export {
  resolveAirlineName, resolveCityName, classifyPackageType,
  normalizeHotelName, resolveLandingRoute,
} from './business-object-resolvers';

// M-08: Master Data Matcher
export { matchAgainstMasterData } from './master-data-matcher';

// M-09: Business Validator
export { validateExtraction, detectConflicts } from './business-validator';

// M-10: Evidence Assembler
export { assembleEvidence } from './evidence-assembler';

// M-11: Form Configuration Builder
export { buildFormConfig } from './form-config-builder';

// M-12: Pipeline Orchestrator
export { executePipeline } from './pipeline-orchestrator';

