// ============================================================
// OCR Cache Engine — Content-hash-based caching
// ============================================================
// Uses SHA-256 of image buffer as cache key.
// Two-tier: in-memory LRU (fast, request-lifetime) +
//           DB-backed (persistent across cold starts).
// TTL: 24 hours default (configurable).
// ============================================================

import { createHash } from "crypto";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import type { OcrResult } from "./provider";
import type { DokumenJenis } from "@/shared/types";
import { logger } from "@/server/lib/logger";

// ── In-memory L1 cache (survives within a single function instance) ─

const MAX_L1_ENTRIES = 100;
const l1Cache = new Map<string, { result: OcrResult; expiresAt: number }>();

function getL1(key: string): OcrResult | null {
  const entry = l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1Cache.delete(key);
    return null;
  }
  // LRU: move to end
  l1Cache.delete(key);
  l1Cache.set(key, entry);
  return entry.result;
}

function setL1(key: string, result: OcrResult, ttlMs: number): void {
  if (l1Cache.size >= MAX_L1_ENTRIES) {
    // Evict oldest (first key)
    const firstKey = l1Cache.keys().next().value;
    if (firstKey) l1Cache.delete(firstKey);
  }
  l1Cache.set(key, { result, expiresAt: Date.now() + ttlMs });
}

// ── Hashing ───────────────────────────────────────────────

export function hashImage(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ── Public API ────────────────────────────────────────────

export interface CacheConfig {
  enabled: boolean;
  ttlHours: number;
}

const DEFAULT_TTL_HOURS = 24;

export async function lookupCache(
  buffer: Buffer,
  _jenis: DokumenJenis,
  config: CacheConfig = { enabled: true, ttlHours: DEFAULT_TTL_HOURS },
): Promise<OcrResult | null> {
  if (!config.enabled) return null;

  const hash = hashImage(buffer);

  // L1: in-memory
  const l1Result = getL1(hash);
  if (l1Result) {
    logger.debug({ hash: hash.slice(0, 12) }, "[Cache] L1 hit");
    return l1Result;
  }

  // L2: database
  try {
    const entry = await ocrProviderRepo.findCacheEntry(hash);
    if (entry) {
      // Populate L1
      const ttlMs = config.ttlHours * 3600_000;
      setL1(hash, entry.result as OcrResult, ttlMs);
      logger.debug({ hash: hash.slice(0, 12), accessCount: entry.accessCount }, "[Cache] L2 hit");
      return entry.result as OcrResult;
    }
  } catch (err) {
    logger.error({ err }, "[Cache] L2 lookup failed");
  }

  return null;
}

export async function storeCache(
  buffer: Buffer,
  documentType: DokumenJenis,
  result: OcrResult,
  config: CacheConfig = { enabled: true, ttlHours: DEFAULT_TTL_HOURS },
): Promise<void> {
  if (!config.enabled) return;
  if (!result.success) return; // Don't cache failures

  const hash = hashImage(buffer);
  const ttlMs = config.ttlHours * 3600_000;

  // L1
  setL1(hash, result, ttlMs);

  // L2: database (fire and forget — don't block the response)
  try {
    await ocrProviderRepo.storeCacheEntry({
      imageHash: hash,
      documentType,
      result,
      confidence: result.overallConfidence,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    logger.debug({ hash: hash.slice(0, 12) }, "[Cache] Stored");
  } catch (err) {
    logger.error({ err }, "[Cache] Store failed");
  }
}
