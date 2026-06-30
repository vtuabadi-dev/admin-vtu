// ============================================================
// Health Monitor — Provider error classification
// ============================================================
// Classifies HTTP errors and timeouts, updates provider health.
// Works with CooldownManager for time-based recovery.
// ============================================================

import {
  COOLDOWN_DURATIONS,
  PERMANENT_DISABLE_CODES,
} from "./types";
import type { OcrProviderRecord } from "./types";

export interface HealthClassification {
  newStatus: OcrProviderRecord["healthStatus"];
  cooldownUntil: Date | null;
  shouldDisable: boolean;
  reason: string;
}

/**
 * Classify an error response and determine the health action.
 */
export function classifyError(
  provider: OcrProviderRecord,
  error: {
    statusCode?: number;
    message?: string;
    isTimeout?: boolean;
  },
): HealthClassification {
  const code = error.statusCode;

  // 401 / 403 → immediate DISABLED (auth failure, permanent)
  if (code && PERMANENT_DISABLE_CODES.includes(String(code))) {
    return {
      newStatus: "disabled",
      cooldownUntil: null,
      shouldDisable: true,
      reason: `Authentication failed (HTTP ${code}) — provider dinonaktifkan permanen. Periksa API key.`,
    };
  }

  // 429 → COOLDOWN
  if (code === 429) {
    const duration = COOLDOWN_DURATIONS["429"] || 60_000;
    return {
      newStatus: "cooldown",
      cooldownUntil: new Date(Date.now() + duration),
      shouldDisable: false,
      reason: `Rate limited (HTTP 429) — cooldown ${duration / 1000}s`,
    };
  }

  // 5xx → COOLDOWN (shorter)
  if (code && code >= 500 && code < 600) {
    const duration = COOLDOWN_DURATIONS[String(code)] || COOLDOWN_DURATIONS["500"] || 30_000;
    return {
      newStatus: "cooldown",
      cooldownUntil: new Date(Date.now() + duration),
      shouldDisable: false,
      reason: `Server error (HTTP ${code}) — cooldown ${duration / 1000}s`,
    };
  }

  // Timeout → COOLDOWN (shortest)
  if (error.isTimeout) {
    const duration = COOLDOWN_DURATIONS["TIMEOUT"] || 15_000;
    return {
      newStatus: "cooldown",
      cooldownUntil: new Date(Date.now() + duration),
      shouldDisable: false,
      reason: `Timeout — cooldown ${duration / 1000}s`,
    };
  }

  // Unknown error → increment consecutive errors, disable after threshold
  const consecutiveThreshold = 5;
  if (provider.consecutiveErrors + 1 >= consecutiveThreshold) {
    return {
      newStatus: "error",
      cooldownUntil: null,
      shouldDisable: false,
      reason: `${provider.consecutiveErrors + 1} consecutive errors — status set to ERROR`,
    };
  }

  return {
    newStatus: "active", // Keep active for transient unknown errors
    cooldownUntil: null,
    shouldDisable: false,
    reason: `Unknown error: ${error.message || "no message"}`,
  };
}

/**
 * Check if a provider in COOLDOWN should be reactivated.
 */
export function checkCooldownExpiry(provider: OcrProviderRecord): boolean {
  if (provider.healthStatus !== "cooldown") return false;
  if (!provider.cooldownUntil) return true; // No cooldown set → reactivate

  const now = new Date();
  const cooldownEnd = new Date(provider.cooldownUntil);
  return now >= cooldownEnd;
}
