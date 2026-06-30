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
