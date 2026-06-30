// ============================================================
// Daily Usage Tracker — Per-provider daily limit enforcement
// ============================================================
// Checks daily usage against daily limit.
// Resets daily counter when a new day is detected.
// No cron needed — date comparison on each request.
// ============================================================

import { ocrProviderRepo } from "@/server/repositories/ocr-provider.repository";
import type { OcrProviderRecord } from "./types";

/**
 * Check and potentially reset daily usage for a provider.
 * Returns true if the provider is within daily limits.
 */
export async function checkDailyLimit(
  provider: OcrProviderRecord,
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Reset daily counter if new day
  await ocrProviderRepo.resetDailyIfNewDay(provider.id, provider.lastUsedAt);

  // No limit set → always allowed
  if (!provider.dailyLimit) return { allowed: true };

  // Reload to get fresh daily usage
  const fresh = await ocrProviderRepo.findById(provider.id);
  if (!fresh) return { allowed: false, reason: "Provider not found" };

  if (fresh.dailyUsage >= fresh.dailyLimit!) {
    return {
      allowed: false,
      reason: `Daily limit reached (${fresh.dailyUsage}/${fresh.dailyLimit})`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a provider has remaining daily quota.
 * Non-blocking — used for pre-filtering in rotation.
 */
export function hasDailyQuota(provider: OcrProviderRecord): boolean {
  if (!provider.dailyLimit) return true;
  return provider.dailyUsage < provider.dailyLimit;
}
