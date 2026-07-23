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
import { processDocument, validateImageMetadata } from "@/server/services/ocr.service";
import { keberangkatanRepo } from "@/server/repositories";
import { parseCaption } from "./caption-parser";
import { buildPackageDraft } from "./package-builder";
import { resolveAirline, resolveCity } from "./alias-resolver";
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

  // Run OCR on the flyer directly from buffer (already read above)
  const ocrResult = await processDocument(imageBuffer, "paspor", 0);

  let geminiData: Partial<PackageExtractionResult> = {};
  let isGeminiSuccess = false;

  try {
    const { extractWithGemini } = await import("./gemini-extractor");
    geminiData = await extractWithGemini(imagePath, ocrResult.rawText || "", caption);
    isGeminiSuccess = true;
  } catch (error) {
    console.error("[processPackageFlyer] Gemini extraction failed, falling back to Regex:", error);
  }

  if (isGeminiSuccess) {
    return {
      title: geminiData.title || "Untitled Package",
      packageType: (geminiData.packageType as any) || "umroh_reguler",
      departureCity: geminiData.departureCity || "",
      landingRoute: geminiData.landingRoute,
      airline: geminiData.airline || "",
      hotelMekkah: geminiData.hotelMekkah || "",
      hotelMadinah: geminiData.hotelMadinah || "",
      roomUpgrade: geminiData.roomUpgrade,
      hotelUpgrade: geminiData.hotelUpgrade,
      durationDays: geminiData.durationDays || 0,
      departureDates: geminiData.departureDates || [],
      promoText: geminiData.promoText,
      description: geminiData.description,
      rawCaption: caption,
      rawOcrText: ocrResult.rawText || "",
      confidence: 1, // Gemini is confident
    };
  }

  // --- FALLBACK REGEX PARSER ---
  const combinedText = [caption, ocrResult.rawText].filter(Boolean).join("\n\n");
  
  // Parse the combined text
  const captionFields = parseCaption(combinedText);

  // We don't need additional fallback for ocrAirline / ocrCity since parseCaption now reads the OCR text too,
  // but we leave it as a safe fallback just in case.
  const ocrAirline = ocrResult.rawText ? resolveAirline(ocrResult.rawText.trim()) : "";
  const ocrCity = ocrResult.rawText ? resolveCity(ocrResult.rawText.trim()) : "";

  // Build the final extraction result
  // Caption data takes priority for structured fields,
  // OCR provides supplemental data
  const result: PackageExtractionResult = {
    title: captionFields.title || "Untitled Package",
    packageType: captionFields.packageType || "umroh_reguler",
    departureCity: captionFields.departureCity || ocrCity || "",
    airline: captionFields.airline || ocrAirline || "",
    hotelMekkah: captionFields.hotelMekkah || "",
    hotelMadinah: captionFields.hotelMadinah || "",
    roomUpgrade: captionFields.roomUpgrade,
    hotelUpgrade: captionFields.hotelUpgrade,
    durationDays: captionFields.durationDays || 0,
    departureDates: captionFields.departureDates || [],
    promoText: captionFields.promoText,
    description: captionFields.description,
    rawCaption: caption,
    rawOcrText: ocrResult.rawText || "",
    confidence: ocrResult.overallConfidence || 0,
  };

  return result;
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
