// ============================================================
// Retry Engine — Cross-provider retry
// ============================================================
// When a provider fails, retry with the NEXT eligible provider.
// NEVER retry the same provider twice in the same request.
// Respects cooldown status — skips providers in cooldown.
// ============================================================

import type { OcrProviderRecord } from "./types";
import { isInCooldown } from "./cooldown-manager";

export interface RetryState {
  attemptedIds: Set<string>;
  currentIndex: number;
  maxRetries: number;
}

/**
 * Initialize retry state for a new OCR request.
 */
export function initRetry(
  providers: OcrProviderRecord[],
  firstProviderId: string,
  maxRetries: number = 5,
): RetryState {
  const state: RetryState = {
    attemptedIds: new Set([firstProviderId]),
    currentIndex: providers.findIndex((p) => p.id === firstProviderId),
    maxRetries: Math.min(maxRetries, providers.length),
  };

  return state;
}

/**
 * Get the next eligible provider for retry.
 * Skips: already attempted, in cooldown, disabled, error, inactive.
 * Returns null if no eligible provider remains.
 */
export function getNextForRetry(
  providers: OcrProviderRecord[],
  state: RetryState,
): OcrProviderRecord | null {
  if (state.attemptedIds.size >= state.maxRetries) return null;

  const eligible = providers.filter(
    (p) =>
      p.isActive &&
      p.healthStatus === "active" &&
      !isInCooldown(p) &&
      !state.attemptedIds.has(p.id),
  );

  if (eligible.length === 0) return null;

  // Pick the next in rotation order
  const next = eligible[0]!;
  state.attemptedIds.add(next.id);
  return next;
}

/**
 * Check if retry should continue.
 */
export function canRetry(state: RetryState): boolean {
  return state.attemptedIds.size < state.maxRetries;
}
