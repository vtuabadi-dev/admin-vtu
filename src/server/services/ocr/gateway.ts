// ============================================================
// OCR Gateway — Single entry point for all OCR processing
// ============================================================
// Business layer calls: gateway.process(imageBuffer, jenis)
// Gateway orchestrates: cache → rotation → adapter → retry
// Business layer does NOT know which provider or key is used.
// ============================================================

import type { DokumenJenis } from "@/shared/types";
import type { OcrResult, ImageMetaCheck } from "./provider";
import type { OcrProviderRecord, GatewayConfig } from "./types";
import { DEFAULT_GATEWAY_CONFIG } from "./types";
import { logger } from "@/server/lib/logger";

// Engines
import { loadProviders, getAdapter, buildAdapterConfig, invalidateCache } from "./registry";
import { selectProvider, getProvidersToReset } from "./rotation-engine";
import { classifyError } from "./health-monitor";
import { reactivateExpiredCooldowns, isInCooldown } from "./cooldown-manager";
import { initRetry, getNextForRetry, canRetry } from "./retry-engine";
import { checkDailyLimit, hasDailyQuota } from "./daily-tracker";
import { recordSuccess, recordError, logUsage } from "./statistics-engine";
import { lookupCache, storeCache, hashImage } from "./cache-engine";
import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";

// ── Gateway State ─────────────────────────────────────────

let gatewayConfig: GatewayConfig = { ...DEFAULT_GATEWAY_CONFIG };

export function configureGateway(config: Partial<GatewayConfig>): void {
  gatewayConfig = { ...gatewayConfig, ...config };
}

export function getGatewayConfig(): GatewayConfig {
  return { ...gatewayConfig };
}

// ── Main Process ───────────────────────────────────────────

export async function process(
  imageBuffer: Buffer,
  jenis: DokumenJenis,
  retryCount: number = 0,
): Promise<OcrResult> {
  const startTime = Date.now();
  const imageHash = gatewayConfig.cacheEnabled ? hashImage(imageBuffer) : undefined;
  const imageSize = imageBuffer.length;

  // ── 1. Cache check ──────────────────────────────────
  if (gatewayConfig.cacheEnabled) {
    const cached = await lookupCache(imageBuffer, jenis, {
      enabled: true,
      ttlHours: gatewayConfig.cacheTtlHours,
    });
    if (cached) {
      return { ...cached, retryCount, processingTimeMs: Date.now() - startTime };
    }
  }

  // ── 2. Load & refresh providers ─────────────────────
  let providers = await loadProviders();
  if (providers.length === 0) {
    // Try seeding from env vars
    const seeded = await ocrProviderRepo.seedFromEnvKeys();
    if (seeded > 0) {
      invalidateCache();
      providers = await loadProviders();
    }
  }

  if (providers.length === 0) {
    logger.error("[OCR Gateway] No providers available");
    return {
      success: false,
      fields: [],
      rawText: "No OCR providers configured. Tambahkan provider di Admin Panel → OCR Settings.",
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      retryCount,
    };
  }

  // ── 3. Reactivate expired cooldowns ────────────────
  await reactivateExpiredCooldowns(providers);

  // ── 4. Filter eligible providers ───────────────────
  let eligible = providers.filter(
    (p) => p.isActive && p.healthStatus === "active" && !isInCooldown(p) && hasDailyQuota(p),
  );

  if (eligible.length === 0) {
    // Check if any are in cooldown
    const cooldownProviders = providers.filter(
      (p) => p.isActive && isInCooldown(p),
    );
    if (cooldownProviders.length > 0) {
      const soonest = cooldownProviders.sort(
        (a, b) => new Date(a.cooldownUntil!).getTime() - new Date(b.cooldownUntil!).getTime(),
      )[0]!;
      return {
        success: false,
        fields: [],
        rawText: `All providers in cooldown. Next available: ${soonest.label} at ${soonest.cooldownUntil}`,
        overallConfidence: 0,
        processingTimeMs: Date.now() - startTime,
        retryCount,
      };
    }
    return {
      success: false,
      fields: [],
      rawText: "No eligible OCR providers. Periksa status provider di Admin Panel.",
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      retryCount,
    };
  }

  // ── 5. Rotation: select current provider ────────────
  const selection = selectProvider(eligible);
  if (!selection) {
    return {
      success: false,
      fields: [],
      rawText: "Rotation engine returned no provider.",
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      retryCount,
    };
  }

  // ── 6. Reset all counters if starting new rotation ──
  if (selection.isNewSlot) {
    const toReset = getProvidersToReset(providers);
    for (const id of toReset) {
      await ocrProviderRepo.resetCounter(id);
    }
    // Reload providers after reset
    invalidateCache();
    providers = await loadProviders();
    eligible = providers.filter(
      (p) => p.isActive && p.healthStatus === "active" && !isInCooldown(p) && hasDailyQuota(p),
    );
  }

  // ── 7. Check daily limit ───────────────────────────
  const dailyCheck = await checkDailyLimit(selection.provider);
  if (!dailyCheck.allowed) {
    // Find another eligible provider
    const alt = eligible.find((p) => p.id !== selection.provider.id && hasDailyQuota(p));
    if (!alt) {
      return {
        success: false,
        fields: [],
        rawText: `All providers have reached daily limits.`,
        overallConfidence: 0,
        processingTimeMs: Date.now() - startTime,
        retryCount,
      };
    }
    // Use alternative provider
    return await attemptWithProvider(alt, imageBuffer, jenis, imageHash, imageSize, startTime, retryCount, providers);
  }

  // ── 8. Attempt OCR with selected provider ──────────
  return await attemptWithProvider(
    selection.provider, imageBuffer, jenis, imageHash, imageSize, startTime, retryCount, providers,
  );
}

// ── Provider Attempt Logic ──────────────────────────────────

async function attemptWithProvider(
  provider: OcrProviderRecord,
  imageBuffer: Buffer,
  jenis: DokumenJenis,
  imageHash: string | undefined,
  imageSize: number,
  startTime: number,
  retryCount: number,
  allProviders: OcrProviderRecord[],
): Promise<OcrResult> {
  const adapter = getAdapter(provider.providerType);
  if (!adapter) {
    logger.error({ providerType: provider.providerType }, "[OCR Gateway] No adapter for provider type");
    return {
      success: false,
      fields: [],
      rawText: `No adapter registered for provider type: ${provider.providerType}`,
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      retryCount,
    };
  }

  const config = buildAdapterConfig(provider);
  const retryState = initRetry(allProviders, provider.id, gatewayConfig.maxRetries);

  let currentProvider = provider;
  let lastError: any = null;

  while (true) {
    const attemptStart = Date.now();

    try {
      // Increment counter
      await ocrProviderRepo.incrementCounter(currentProvider.id);

      // Call adapter
      const result = await adapter.recognize(imageBuffer, jenis, config, retryCount);
      const latencyMs = Date.now() - attemptStart;

      // Success: record statistics
      await recordSuccess(currentProvider, latencyMs);
      await logUsage({
        providerId: currentProvider.id,
        requestType: "ocr",
        documentType: jenis,
        success: true,
        confidence: result.overallConfidence,
        latencyMs,
        imageHash,
        imageSize,
      });

      // Store cache
      if (gatewayConfig.cacheEnabled && result.success) {
        await storeCache(imageBuffer, jenis, result, {
          enabled: true,
          ttlHours: gatewayConfig.cacheTtlHours,
        });
      }

      result.processingTimeMs = Date.now() - startTime;
      result.retryCount = retryCount;
      return result;

    } catch (err: any) {
      const latencyMs = Date.now() - attemptStart;
      const statusCode = err?.statusCode;
      const message = err?.message || String(err);
      const isTimeout = message?.includes("timeout") || message?.includes("abort");

      logger.warn(
        { providerId: currentProvider.id, statusCode, latencyMs },
        `[OCR Gateway] Request failed: ${message}`,
      );

      // Record error statistics
      await recordError(currentProvider, latencyMs, statusCode ? String(statusCode) : undefined, message);
      await logUsage({
        providerId: currentProvider.id,
        requestType: "ocr",
        documentType: jenis,
        success: false,
        latencyMs,
        errorCode: statusCode ? String(statusCode) : isTimeout ? "TIMEOUT" : "UNKNOWN",
        errorMessage: message,
        imageHash,
        imageSize,
      });

      // Health classification
      const classification = classifyError(currentProvider, {
        statusCode,
        message,
        isTimeout,
      });

      if (classification.newStatus !== "active") {
        await ocrProviderRepo.updateHealth(currentProvider.id, {
          healthStatus: classification.newStatus,
          cooldownUntil: classification.cooldownUntil,
          lastErrorAt: new Date(),
          lastErrorMsg: classification.reason,
          consecutiveErrors: currentProvider.consecutiveErrors + 1,
        });
      }

      lastError = err;

      // Can we retry?
      if (!canRetry(retryState)) break;

      // Get next provider
      const next = getNextForRetry(allProviders, retryState);
      if (!next) break;

      currentProvider = next;
      retryCount++;
      logger.info(
        { from: provider.id, to: next.id, attempt: retryCount },
        "[OCR Gateway] Retrying with next provider",
      );
    }
  }

  // All attempts exhausted
  return {
    success: false,
    fields: [],
    rawText: `OCR failed after ${retryCount + 1} attempt(s). Last error: ${lastError?.message || "Unknown"}`,
    overallConfidence: 0,
    processingTimeMs: Date.now() - startTime,
    retryCount,
  };
}

// ── Image Validation ────────────────────────────────────────

export function validateImage(
  imageBuffer: Buffer,
  providerType: string = "google_vision",
): ImageMetaCheck {
  const adapter = getAdapter(providerType);
  if (!adapter) {
    return { valid: false, issues: [`Unknown provider type: ${providerType}`] };
  }
  return adapter.validateImage(imageBuffer);
}

// ── Test Connection ─────────────────────────────────────────

export async function testProviderConnection(
  provider: OcrProviderRecord,
): Promise<{ ok: boolean; message: string }> {
  const adapter = getAdapter(provider.providerType);
  if (!adapter) {
    return { ok: false, message: `No adapter for type: ${provider.providerType}` };
  }
  if (!adapter.testConnection) {
    return { ok: false, message: "Adapter does not support connection testing" };
  }
  const config = buildAdapterConfig(provider);
  return adapter.testConnection(config);
}
