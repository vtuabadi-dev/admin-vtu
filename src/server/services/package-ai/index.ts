// ============================================================
// PACKAGE AI IMPORT — Main Orchestrator
// Coordinates OCR processing, caption parsing, draft management,
// and publication of AI-extracted package data.
//
// IMPORTANT: All extracted packages enter DRAFT REVIEW state.
// NEVER auto-publish. Human review is required.
// ============================================================

import * as fs from "fs";
import * as path from "path";
import { validateImageMetadata } from "@/server/services/ocr.service";
import { keberangkatanRepo } from "@/server/repositories";
import { parseCaption } from "./caption-parser";
import { buildPackageDraft } from "./package-builder";
import type { PackageExtractionResult, PackageDraft, PackageDraftStatus } from "./types";

// ── In-Memory Draft Storage ──────────────────────────────────
// Drafts are stored in-memory until promoted to Keberangkatan.
// In a production environment, replace with database storage.

const draftStore = new Map<string, PackageDraft>();

// Temp directory for uploaded flyer images
const TEMP_DIR = "/tmp/package-ai/";

/**
 * Ensure the temp directory exists.
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Sanitize a filename: remove special characters, limit length,
 * preserve extension.
 */
function sanitizeFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);
  const sanitized = base
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return `${sanitized || "flyer"}_${Date.now()}${ext}`;
}

/**
 * Generate a unique draft ID.
 */
function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Core Processing ──────────────────────────────────────────

/**
 * Process a package flyer image combined with its caption text.
 *
 * Steps:
 * 1. Validate the image file
 * 2. Run OCR to extract raw text from the flyer
 * 3. Parse the caption text for structured fields
 * 4. Merge OCR and caption results together
 * 5. If OCR has better data for certain fields, use it
 *
 * @param imagePath - Absolute path to the flyer image (JPEG only)
 * @param caption - Caption text provided alongside the image
 * @returns Merged extraction result with confidence score
 */
export async function processPackageFlyer(
  imagePath: string,
  caption: string
): Promise<PackageExtractionResult> {
  // Read and validate the image
  const imageBuffer = fs.readFileSync(imagePath);
  const validation = validateImageMetadata(imageBuffer);

  if (!validation.valid) {
    throw new Error(
      `Image validation failed: ${validation.issues.join("; ")}`
    );
  }

  const startMs = Date.now();

  // ── STEP 1: REGEX & LOCAL STRING PARSER FIRST (0 API TOKENS) ──
  const localParsed = parseCaption(caption || "");
  const hasDates = Array.isArray(localParsed.departureDates) && localParsed.departureDates.length > 0;
  const hasDuration = (localParsed.durationDays || 0) > 0;
  const hasAirline = !!localParsed.airline;
  const hasCity = !!localParsed.departureCity;
  const hasPrice = !!localParsed.hargaBase;

  // If local parser extracted dates, duration, airline, city & price, NO NEED TO CALL GEMINI API!
  if (hasDates && hasDuration && hasAirline && hasCity && hasPrice) {
    console.log(`[processPackageFlyer] ⚡ 100% Parsed locally via Regex/Parser in ${Date.now() - startMs}ms! Skipping Gemini API call to conserve token quota.`);
    return {
      ...localParsed,
      title: localParsed.title || "Untitled Package",
      packageType: localParsed.packageType || "umroh_reguler",
      departureCity: localParsed.departureCity || "",
      airline: localParsed.airline || "",
      hotelMekkah: localParsed.hotelMekkah || "",
      hotelMadinah: localParsed.hotelMadinah || "",
      durationDays: localParsed.durationDays || 9,
      departureDates: localParsed.departureDates || [],
      rawCaption: caption,
      rawOcrText: "",
      confidence: 0.95,
    };
  }

  // ── STEP 2: SMART GEMINI AI COMPLETION (Only for missing fields) ──
  let geminiData: Partial<PackageExtractionResult> & { rawText?: string } = {};
  let isGeminiSuccess = false;

  try {
    const { extractWithGemini } = await import("./gemini-extractor");
    geminiData = await extractWithGemini(imagePath, "", caption);
    isGeminiSuccess = true;
    console.log(`[processPackageFlyer] ✅ Gemini AI completion finished in ${Date.now() - startMs}ms`);
  } catch (error) {
    console.warn("[processPackageFlyer] Gemini extraction failed/cooldown, falling back to local parsed data:", error);
  }

  // Combine local parsed data with Gemini AI completion
  const mergedDates = Array.from(new Set([...(localParsed.departureDates || []), ...(geminiData.departureDates || [])])).sort();

  return {
    title: geminiData.title || localParsed.title || "Untitled Package",
    packageType: (geminiData.packageType as any) || localParsed.packageType || "umroh_reguler",
    departureCity: geminiData.departureCity || localParsed.departureCity || "",
    landingRoute: geminiData.landingRoute || (localParsed as any).landingRoute,
    airline: geminiData.airline || localParsed.airline || "",
    hotelMekkah: geminiData.hotelMekkah || localParsed.hotelMekkah || "",
    hotelMadinah: geminiData.hotelMadinah || localParsed.hotelMadinah || "",
    roomUpgrade: geminiData.roomUpgrade || localParsed.roomUpgrade,
    hotelUpgrade: geminiData.hotelUpgrade || localParsed.hotelUpgrade,
    upgradeDouble: geminiData.upgradeDouble || localParsed.upgradeDouble,
    upgradeTriple: geminiData.upgradeTriple || localParsed.upgradeTriple,
    isAdaPerlengkapan: (geminiData.isAdaPerlengkapan as any) || localParsed.isAdaPerlengkapan,
    hargaBase: geminiData.hargaBase || localParsed.hargaBase,
    clusters: geminiData.clusters || localParsed.clusters,
    durationDays: geminiData.durationDays || localParsed.durationDays || 0,
    departureDates: mergedDates,
    promoText: geminiData.promoText || localParsed.promoText,
    description: geminiData.description || localParsed.description,
    rawCaption: caption,
    rawOcrText: "",
    confidence: isGeminiSuccess ? 1 : 0.8,
  };
}

// ── Draft Management ─────────────────────────────────────────

/**
 * Create a package draft from an extraction result and store it.
 * The package ALWAYS enters DRAFT state — it will not be published
 * until explicitly approved by a reviewer.
 *
 * @param result - The AI extraction result
 * @param flyerPath - Path to the uploaded flyer image
 * @returns The created PackageDraft
 */
export async function createPackageDraft(
  result: PackageExtractionResult,
  flyerPath: string
): Promise<PackageDraft> {
  const draft: PackageDraft = {
    id: generateDraftId(),
    extractionResult: result,
    status: "DRAFT",
    flyerPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  draftStore.set(draft.id, draft);
  return draft;
}

/**
 * Approve a package draft and publish it as a Keberangkatan.
 * This promotes the draft from REVIEW/READY to PUBLISHED status
 * and creates the actual Keberangkatan record in the database.
 *
 * @param draftId - ID of the draft to approve
 * @param reviewerId - User ID of the approving reviewer
 * @returns The published Keberangkatan record
 * @throws If draft not found or not in approvable state
 */
export async function approvePackageDraft(
  draftId: string,
  reviewerId: string
): Promise<import("@/shared/types").Keberangkatan> {
  const draft = draftStore.get(draftId);
  if (!draft) {
    throw new Error(`Draft ${draftId} tidak ditemukan`);
  }

  if (draft.status === "PUBLISHED") {
    throw new Error(`Draft ${draftId} sudah dipublikasikan`);
  }

  if (draft.status === "ARCHIVED") {
    throw new Error(`Draft ${draftId} sudah diarsipkan, tidak dapat dipublikasikan`);
  }

  if (draft.status === "DRAFT") {
    throw new Error(
      `Draft ${draftId} masih dalam status DRAFT. Ubah ke REVIEW atau READY terlebih dahulu.`
    );
  }

  // Build the Keberangkatan from extraction result
  const packageData = buildPackageDraft(draft.extractionResult);

  // Create the actual Keberangkatan record
  const published = await keberangkatanRepo.create(packageData);

  // Update draft status
  draft.status = "PUBLISHED";
  draft.reviewedBy = reviewerId;
  draft.reviewedAt = new Date().toISOString();
  draft.publishedPackageId = published.id;
  draft.updatedAt = new Date().toISOString();

  draftStore.set(draft.id, draft);

  return published;
}

/**
 * Update a draft's status (transition between DRAFT/REVIEW/READY).
 *
 * @param draftId - ID of the draft
 * @param status - New status
 * @param reviewerId - Optional reviewer User ID (required for REVIEW/READY)
 * @returns The updated draft
 * @throws If transition is invalid
 */
export function updateDraftStatus(
  draftId: string,
  status: PackageDraftStatus,
  reviewerId?: string
): PackageDraft {
  const draft = draftStore.get(draftId);
  if (!draft) {
    throw new Error(`Draft ${draftId} tidak ditemukan`);
  }

  const validTransitions: Record<PackageDraftStatus, PackageDraftStatus[]> = {
    DRAFT: ["REVIEW"],
    REVIEW: ["READY", "DRAFT"],
    READY: ["PUBLISHED", "REVIEW"],
    PUBLISHED: [],
    ARCHIVED: [],
  };

  const allowed = validTransitions[draft.status];
  if (!allowed.includes(status)) {
    throw new Error(
      `Transisi status tidak valid: ${draft.status} -> ${status}. ` +
      `Transisi yang diizinkan: ${allowed.join(", ") || "(none)"}`
    );
  }

  if ((status === "REVIEW" || status === "READY") && !reviewerId) {
    throw new Error(
      `reviewerId diperlukan untuk transisi ke ${status}`
    );
  }

  if (status === "REVIEW" || status === "READY") {
    draft.reviewedBy = reviewerId;
    draft.reviewedAt = new Date().toISOString();
  }

  draft.status = status;
  draft.updatedAt = new Date().toISOString();
  draftStore.set(draft.id, draft);

  return { ...draft };
}

/**
 * Discard a draft and clean up its associated temp files.
 *
 * @param draftId - ID of the draft to discard
 * @returns true if the draft was found and removed, false otherwise
 */
export function discardDraft(draftId: string): boolean {
  const draft = draftStore.get(draftId);
  if (!draft) return false;

  // Clean up temp flyer file
  try {
    if (fs.existsSync(draft.flyerPath) && draft.flyerPath.startsWith(TEMP_DIR)) {
      fs.unlinkSync(draft.flyerPath);
    }
  } catch {
    // Ignore cleanup errors — file may already be removed
  }

  draftStore.delete(draftId);
  return true;
}

/**
 * Update a draft's extraction result (manual edits before publishing).
 *
 * @param draftId - ID of the draft to update
 * @param updates - Partial extraction result fields to update
 * @returns The updated draft
 * @throws If draft not found
 */
export function updateDraftExtraction(
  draftId: string,
  updates: Partial<PackageExtractionResult>
): PackageDraft {
  const draft = draftStore.get(draftId);
  if (!draft) {
    throw new Error(`Draft ${draftId} tidak ditemukan`);
  }

  draft.extractionResult = {
    ...draft.extractionResult,
    ...updates,
  };
  draft.updatedAt = new Date().toISOString();
  draftStore.set(draft.id, draft);

  return { ...draft };
}

/**
 * Get a single draft by ID.
 */
export function getDraftById(draftId: string): PackageDraft | undefined {
  const draft = draftStore.get(draftId);
  return draft ? { ...draft } : undefined;
}

/**
 * List all drafts, with optional status filter.
 */
export function listDrafts(status?: PackageDraftStatus): PackageDraft[] {
  const all = Array.from(draftStore.values());
  const filtered = status ? all.filter((d) => d.status === status) : all;
  return filtered.map((d) => ({ ...d }));
}

/**
 * Save a flyer image to temp storage.
 * Validates MIME type (JPEG only) and file content before saving.
 *
 * @param buffer - Raw image buffer
 * @param originalName - Original filename for extension detection
 * @returns The saved file path
 * @throws If file is not valid JPEG
 */
export function saveFlyerImage(
  buffer: Buffer,
  originalName: string
): string {
  // Validate magic bytes for JPEG
  const isJpeg = buffer.length >= 3 &&
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF;

  if (!isJpeg) {
    throw new Error(
      "File harus dalam format JPEG (magic bytes mismatch). " +
      "Hanya file JPG/JPEG yang diperbolehkan untuk flyer."
    );
  }

  // Validate with existing OCR image validation
  const validation = validateImageMetadata(buffer);
  if (!validation.valid) {
    throw new Error(
      `Validasi gambar gagal: ${validation.issues.join("; ")}`
    );
  }

  ensureTempDir();
  const sanitized = sanitizeFileName(originalName);
  const filePath = path.join(TEMP_DIR, sanitized);

  fs.writeFileSync(filePath, buffer);
  return filePath;
}
