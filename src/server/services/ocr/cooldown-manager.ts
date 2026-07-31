// ============================================================
// Cooldown Manager — Provider cooldown lifecycle
// ============================================================
// Handles: cooldown activation, cooldown expiry check,
// auto-reactivation when cooldown period ends.
// ============================================================

import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import type { OcrProviderRecord } from "./types";
import { checkCooldownExpiry } from "./health-monitor";

/**
 * Reactivate providers whose cooldown has expired.
 * Called at the start of each OCR request cycle.
 * Returns the count of reactivated providers.
 */
export async function reactivateExpiredCooldowns(
  providers: OcrProviderRecord[],
): Promise<number> {
  let reactivated = 0;

  // 1. Reactivate naturally expired cooldowns
  for (const p of providers) {
    if (checkCooldownExpiry(p)) {
      await ocrProviderRepo.updateHealth(p.id, {
        healthStatus: "active",
        cooldownUntil: null,
        consecutiveErrors: 0,
      });
      // Update in-memory for this request
      p.healthStatus = "active";
      p.cooldownUntil = null;
      p.consecutiveErrors = 0;
      reactivated++;
    }
  }

  // 2. AUTOMATIC ALL-COOLDOWN EMERGENCY RESET:
  // If ALL active providers with API keys are in cooldown (0 available non-cooldown keys),
  // emergency-reset ALL active providers back to active status immediately!
  const activeProviders = providers.filter((p) => p.isActive && p.apiKey?.trim());
  const nonCooldownCount = activeProviders.filter((p) => !isInCooldown(p)).length;

  if (activeProviders.length > 0 && nonCooldownCount === 0) {
    console.log(`[CooldownManager] ⚡ ALL ${activeProviders.length} active API keys are in cooldown! Emergency reset ALL active keys to ACTIVE status.`);
    for (const p of activeProviders) {
      await ocrProviderRepo.updateHealth(p.id, {
        healthStatus: "active",
        cooldownUntil: null,
        consecutiveErrors: 0,
      });
      p.healthStatus = "active";
      p.cooldownUntil = null;
      p.consecutiveErrors = 0;
      reactivated++;
    }
  }

  return reactivated;
}

/**
 * Check if a provider is currently in cooldown.
 */
export function isInCooldown(provider: OcrProviderRecord): boolean {
  if (provider.healthStatus !== "cooldown") return false;
  if (!provider.cooldownUntil) return false;

  const now = new Date();
  const cooldownEnd = new Date(provider.cooldownUntil);
  return now < cooldownEnd;
}
