// ============================================================
// Provider Registry — DB-backed provider management
// ============================================================
// Loads providers from database on demand.
// Maintains in-memory cache for the request lifecycle.
// Provides adapter factory based on provider type.
// ============================================================

import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import { googleVisionAdapter } from "./adapters/google-vision.adapter";
import { externalApiAdapter } from "./adapters/external-api.adapter";
import type { OcrAdapter, OcrAdapterConfig } from "./adapters/adapter.interface";
import type { OcrProviderRecord } from "./types";
import { logger } from "@/server/lib/logger";

// ── Adapter Registry ──────────────────────────────────────

const adapterRegistry = new Map<string, OcrAdapter>();

// Register built-in adapters
adapterRegistry.set("google_vision", googleVisionAdapter);
adapterRegistry.set("external_api", externalApiAdapter);

/**
 * Register a custom adapter at runtime.
 */
export function registerAdapter(type: string, adapter: OcrAdapter): void {
  adapterRegistry.set(type, adapter);
  logger.info(`[OCR Registry] Adapter registered: ${type}`);
}

/**
 * Get an adapter by type.
 */
export function getAdapter(type: string): OcrAdapter | null {
  return adapterRegistry.get(type) ?? null;
}

/**
 * Build adapter config from a provider record.
 */
export function buildAdapterConfig(provider: OcrProviderRecord): OcrAdapterConfig {
  return {
    apiKey: provider.apiKey,
    apiUrl: provider.apiUrl ?? undefined,
    apiHeaderName: provider.apiHeaderName ?? undefined,
    apiHeaderPrefix: provider.apiHeaderPrefix ?? undefined,
  };
}

// ── Provider Loading ─────────────────────────────────────

let _providersCache: OcrProviderRecord[] | null = null;
let _cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds — balance between freshness and DB load

/**
 * Load all active, healthy providers from DB.
 * Results are cached for CACHE_TTL_MS to avoid hammering DB.
 */
export async function loadProviders(): Promise<OcrProviderRecord[]> {
  const now = Date.now();
  if (_providersCache && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _providersCache;
  }

  try {
    _providersCache = await ocrProviderRepo.findActive();
    _cacheTimestamp = now;
    logger.debug(`[OCR Registry] Loaded ${_providersCache.length} providers from DB`);
    return _providersCache;
  } catch (err) {
    logger.error({ err }, "[OCR Registry] Failed to load providers from DB");
    // Return stale cache if available
    if (_providersCache && _providersCache.length > 0) {
      logger.warn("[OCR Registry] Using stale provider cache");
      return _providersCache;
    }
    throw err;
  }
}

/**
 * Invalidate the provider cache — call after admin changes.
 */
export function invalidateCache(): void {
  _providersCache = null;
  _cacheTimestamp = 0;
}

/**
 * Get all registered adapter types.
 */
export function getRegisteredAdapterTypes(): string[] {
  return Array.from(adapterRegistry.keys());
}
