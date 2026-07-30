// ============================================================
// M-12: PIPELINE ORCHESTRATOR — Generate Package Intelligence v2
// ============================================================
//
// Wires all modules (M-01 to M-11) into the 6-step Fusion Engine.
//
// Pipeline: Collect → Normalize → Merge → Conflict Detect
//           → Validate → Draft Package
//
// Key responsibilities:
// - Orchestrate full extraction pipeline
// - Handle multi-date split (R-02: 1 flyer N dates = N drafts)
// - Enforce validation-before-draft (R-13)
// - Create drafts in DRAFT status ONLY (R-01)
//
// Traceability:
// - Constitution Principle 8 — Fusion Engine
// - Business Events EVT-01 to EVT-14
// - R-01 (Draft-Only), R-02 (Multi-Date), R-13 (Validation Gate)
// ============================================================

import type {
  PipelineInput,
  PipelineOutput,
  PackageExtractionResultV2,
  PackageDraftV2,
  ExtractionField,
} from './types';
import { createMissingField, createExtractedField } from './types';
import { SessionManager } from './session-manager';
import { splitCaptionIntoSections } from './caption-section-splitter';
import {
  parseDates, parseDuration, parsePrice, parseUpgradePrices,
  parseAirline, parseHotel, parsePackageType, parseDepartureCity,
  parseInclude, parseExclude, parseEquipmentStatus,
  parsePricingMode, parsePromoText,
} from './caption-section-parsers';
import { analyzeFlyer, type FlyerAnalysisResult } from './flyer-visual-analyzer';
import { parseItinerary, resolveLandingFromItinerary } from './itinerary-analyzer';
import {
  resolveAirlineName, resolveCityName, classifyPackageType,
  normalizeHotelName, resolveLandingRoute,
} from './business-object-resolvers';
import { matchAgainstMasterData } from './master-data-matcher';
import { validateExtraction, detectConflicts } from './business-validator';
import { assembleEvidence } from './evidence-assembler';
import { buildFormConfig } from './form-config-builder';

// ── Image Handling ───────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { processDocument, validateImageMetadata } from '../../ocr.service';

const TEMP_DIR = '/tmp/package-ai/';

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function saveTempImage(buffer: Buffer, prefix: string): string {
  ensureTempDir();
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
  const filePath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ── Merge Logic ──────────────────────────────────────────────

/**
 * Merge two ExtractionField values with priority logic.
 * Higher confidence wins. If equal, earlier source (flyer > caption) wins.
 */
function mergeField<T>(
  primary: ExtractionField<T>,
  secondary: ExtractionField<T>
): ExtractionField<T> {
  // If primary is MISSING, use secondary
  if (primary.fieldStatus === 'MISSING' && secondary.fieldStatus !== 'MISSING') {
    return secondary;
  }
  // If secondary is MISSING, use primary
  if (secondary.fieldStatus === 'MISSING') {
    return primary;
  }
  // Both have values — prefer higher confidence
  if (secondary.confidence > primary.confidence) {
    return {
      ...secondary,
      confidenceFactors: {
        ...secondary.confidenceFactors,
        sourceAgreement: primary.rawValue === secondary.rawValue ? 1.0 : 0.50,
      },
    };
  }
  return {
    ...primary,
    confidenceFactors: {
      ...primary.confidenceFactors,
      sourceAgreement: primary.rawValue === secondary.rawValue ? 1.0 : 0.50,
    },
  };
}

// ── Draft ID Generation ──────────────────────────────────────

function generateDraftId(): string {
  return `gpi_draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Execute the full Generate Package Intelligence pipeline.
 *
 * 6-Step Fusion Engine:
 * 1. COLLECT    — Upload flyer, caption, itinerary; run OCR
 * 2. NORMALIZE  — Parse caption sections, normalize dates/prices
 * 3. MERGE      — Combine caption + flyer + itinerary data
 * 4. CONFLICT   — Detect disagreements between sources
 * 5. VALIDATE   — Run business validation (V-01 to V-12)
 * 6. DRAFT      — Create N drafts for N dates (R-02)
 *
 * @param input Pipeline input (flyer, caption, optional itinerary)
 * @returns Complete pipeline output
 */
export async function executePipeline(input: PipelineInput): Promise<PipelineOutput> {

  // ═══════════════════════════════════════════════════════════
  // STEP 1: COLLECT (EVT-01, EVT-02, EVT-03)
  // ═══════════════════════════════════════════════════════════

  // Validate flyer image
  const imageValidation = validateImageMetadata(input.flyerImage);
  if (!imageValidation.valid) {
    throw new Error(`V-01: Validasi gambar gagal — ${imageValidation.issues.join('; ')}`);
  }

  // Save flyer to temp
  const flyerPath = saveTempImage(input.flyerImage, 'flyer');

  // Create session
  const session = SessionManager.createSession({
    flyerPath,
    captionText: input.caption,
    itineraryPath: input.itineraryImage ? saveTempImage(input.itineraryImage, 'itinerary') : undefined,
  });

  // Run OCR on flyer
  const ocrResult = await processDocument(input.flyerImage, 'paspor', 0);
  const rawOcrText = ocrResult.rawText || '';

  // Run OCR on itinerary if provided
  let rawItineraryOcrText = '';
  if (input.itineraryImage) {
    try {
      const itinOcr = await processDocument(input.itineraryImage, 'paspor', 0);
      rawItineraryOcrText = itinOcr.rawText || '';
    } catch {
      console.warn('[Pipeline] Itinerary OCR failed — continuing without it');
    }
  }

  // Update session with OCR results
  SessionManager.updateSession(session.id, {
    rawOcrText,
    rawItineraryOcrText: rawItineraryOcrText || null,
  });

  // ═══════════════════════════════════════════════════════════
  // STEP 2: NORMALIZE (Parse all sources)
  // ═══════════════════════════════════════════════════════════

  // 2a: Parse caption sections (M-03 + M-04)
  const fullText = [input.caption, rawOcrText].filter(Boolean).join('\n\n');
  splitCaptionIntoSections(fullText);

  const captionDates = parseDates(fullText);
  const captionDuration = parseDuration(fullText);
  const captionPrice = parsePrice(fullText);
  const captionUpgrades = parseUpgradePrices(fullText);
  const captionAirline = parseAirline(fullText);
  const captionHotelMekkah = parseHotel(fullText, 'mekkah');
  const captionHotelMadinah = parseHotel(fullText, 'madinah');
  const captionPackageType = parsePackageType(fullText);
  const captionCity = parseDepartureCity(fullText);
  const captionInclude = parseInclude(fullText);
  const captionExclude = parseExclude(fullText);
  const captionEquipment = parseEquipmentStatus(fullText);
  const captionPricingMode = parsePricingMode(fullText);
  const captionPromo = parsePromoText(fullText);

  // 2b: Analyze flyer image (M-05)
  let flyerResult: FlyerAnalysisResult;
  try {
    flyerResult = await analyzeFlyer(flyerPath, rawOcrText, input.caption);
  } catch (error) {
    console.error('[Pipeline] Flyer analysis failed:', error);
    // Create empty result — pipeline continues with caption data
    flyerResult = {
      title: createMissingField('OPTIONAL'),
      packageType: createMissingField('MANDATORY'),
      durationDays: createMissingField('MANDATORY'),
      departureCity: createMissingField('MANDATORY'),
      airline: createMissingField('MANDATORY'),
      hotelMekkah: createMissingField('RECOMMENDED'),
      hotelMadinah: createMissingField('RECOMMENDED'),
      landingRoute: createMissingField('RECOMMENDED'),
      departureDates: createMissingField('MANDATORY'),
      pricingMode: createExtractedField('SINGLE' as const, 'flyer_ocr', 0.50, 'MANDATORY'),
      price: createMissingField('MANDATORY'),
      clusters: [],
      upgradeDouble: createMissingField('OPTIONAL'),
      upgradeTriple: createMissingField('OPTIONAL'),
      isAdaPerlengkapan: createMissingField('OPTIONAL'),
      promoText: createMissingField('OPTIONAL'),
      description: createMissingField('OPTIONAL'),
    };
  }

  // 2c: Analyze itinerary (M-06)
  const itineraryField = rawItineraryOcrText
    ? parseItinerary(rawItineraryOcrText)
    : createMissingField<import('./types').ItineraryDay[]>('OPTIONAL');

  const itineraryDays = itineraryField.rawValue ?? [];
  const landingFromItinerary = resolveLandingFromItinerary(itineraryDays);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: MERGE (Combine all sources)
  // ═══════════════════════════════════════════════════════════

  const merged: PackageExtractionResultV2 = {
    startingPoint: mergeField(captionCity, flyerResult.departureCity),
    packageType: mergeField(captionPackageType, flyerResult.packageType),
    durationDays: mergeField(captionDuration, flyerResult.durationDays),
    programName: createMissingField('OPTIONAL'),

    departureDates: mergeField(captionDates, flyerResult.departureDates),

    airline: mergeField(captionAirline, flyerResult.airline),
    landingCity: mergeField(landingFromItinerary, createMissingField('RECOMMENDED')),
    landingRoute: mergeField(
      flyerResult.landingRoute,
      createMissingField('RECOMMENDED')
    ),

    pricingMode: mergeField(captionPricingMode, flyerResult.pricingMode),
    price: mergeField(captionPrice, flyerResult.price),
    clusters: flyerResult.clusters,

    hotelMekkah: mergeField(captionHotelMekkah, flyerResult.hotelMekkah),
    hotelMadinah: mergeField(captionHotelMadinah, flyerResult.hotelMadinah),

    perlengkapan: createMissingField('OPTIONAL'),
    include: captionInclude,
    exclude: captionExclude,

    itineraryDraft: itineraryField,

    promoText: mergeField(captionPromo, flyerResult.promoText),
    description: flyerResult.description,
    notes: createMissingField('OPTIONAL'),

    upgradeDouble: mergeField(captionUpgrades.upgradeDouble, flyerResult.upgradeDouble),
    upgradeTriple: mergeField(captionUpgrades.upgradeTriple, flyerResult.upgradeTriple),
    isAdaPerlengkapan: mergeField(captionEquipment, flyerResult.isAdaPerlengkapan),
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 3.5: RESOLVE (M-07 Business Object Resolvers)
  // ═══════════════════════════════════════════════════════════

  merged.airline = resolveAirlineName(merged.airline);
  merged.startingPoint = resolveCityName(merged.startingPoint);
  merged.packageType = classifyPackageType(merged.packageType);
  merged.hotelMekkah = normalizeHotelName(merged.hotelMekkah);
  merged.hotelMadinah = normalizeHotelName(merged.hotelMadinah);
  merged.landingRoute = resolveLandingRoute(merged.landingRoute);

  // ═══════════════════════════════════════════════════════════
  // STEP 3.6: MATCH (M-08 Master Data Matcher)
  // ═══════════════════════════════════════════════════════════

  const matched = await matchAgainstMasterData(merged);

  // ═══════════════════════════════════════════════════════════
  // STEP 4: CONFLICT DETECT (R-05)
  // ═══════════════════════════════════════════════════════════

  const conflicts = [
    detectConflicts(captionAirline, flyerResult.airline, 'airline'),
    detectConflicts(captionCity, flyerResult.departureCity, 'startingPoint'),
    detectConflicts(captionDuration, flyerResult.durationDays, 'durationDays'),
    detectConflicts(captionPrice, flyerResult.price, 'price'),
    detectConflicts(captionHotelMekkah, flyerResult.hotelMekkah, 'hotelMekkah'),
    detectConflicts(captionHotelMadinah, flyerResult.hotelMadinah, 'hotelMadinah'),
    detectConflicts(captionDates, flyerResult.departureDates, 'departureDates'),
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  // Mark conflicting fields
  for (const conflict of conflicts) {
    const field = (matched as unknown as Record<string, unknown>)[conflict.fieldName];
    if (field && typeof field === 'object' && 'fieldStatus' in field) {
      (field as ExtractionField<unknown>).fieldStatus = 'CONFLICT';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 5: VALIDATE (V-01 to V-12, R-13)
  // ═══════════════════════════════════════════════════════════

  const validationReport = validateExtraction(matched, conflicts);

  // ═══════════════════════════════════════════════════════════
  // STEP 6: DRAFT PACKAGE (R-01, R-02)
  // ═══════════════════════════════════════════════════════════

  // Assemble evidence (M-10)
  const evidencePackage = assembleEvidence(session.id, matched, validationReport);

  // Build form config (M-11)
  const formConfig = buildFormConfig(session.id, matched, evidencePackage, validationReport);

  // Update session with results
  SessionManager.updateSession(session.id, {
    extractionResult: matched,
    validationReport,
    evidencePackage,
    formConfig,
  });

  // R-02: Multi-Date — Create N drafts for N departure dates
  const drafts: PackageDraftV2[] = [];
  const dates = matched.departureDates.rawValue;
  const dateList = Array.isArray(dates) && dates.length > 0 ? dates : [''];

  for (const date of dateList) {
    const draft: PackageDraftV2 = {
      id: generateDraftId(),
      sessionId: session.id,
      departureDate: date,
      extractionResult: matched,
      status: 'DRAFT', // R-01: Draft-Only
      flyerPath,
      reviewedBy: null,
      reviewedAt: null,
      publishedPackageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    drafts.push(draft);
  }

  // Return complete pipeline output
  const updatedSession = SessionManager.getSessionOrThrow(session.id);

  return {
    session: updatedSession,
    drafts,
    formConfig,
    validationReport,
    evidencePackage,
  };
}
