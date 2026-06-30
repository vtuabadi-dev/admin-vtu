// ============================================================
// Rotation Engine — Fixed Round Robin
// ============================================================
// Each provider processes `rotationCount` requests before
// the engine advances to the next provider in rotation order.
// State is tracked via DB columns (requestCounter) for
// serverless safety — no in-memory state across cold starts.
// ============================================================

import type { OcrProviderRecord } from "./types";

export interface RotationSelection {
  provider: OcrProviderRecord;
  isNewSlot: boolean; // true when rotation advanced to this provider
}

/**
 * Select the next provider using Fixed Round Robin.
 *
 * Algorithm:
 * 1. Filter to active providers with healthy status
 * 2. Find the current "slot" — provider with requestCounter < rotationCount
 * 3. If all providers have exhausted their rotation slots, reset all counters
 * 4. Return the current slot provider
 */
export function selectProvider(
  providers: OcrProviderRecord[],
): RotationSelection | null {
  const eligible = providers.filter(
    (p) => p.isActive && p.healthStatus === "active",
  );

  if (eligible.length === 0) return null;

  // Find the first provider that hasn't reached its rotation count
  const current = eligible.find((p) => p.requestCounter < p.rotationCount);

  if (current) {
    return { provider: current, isNewSlot: current.requestCounter === 0 };
  }

  // All providers exhausted their rotation slots → reset and start over
  return { provider: eligible[0]!, isNewSlot: true };
}

/**
 * Determine which providers need their counters reset.
 * Called after all providers have exhausted their slots.
 */
export function getProvidersToReset(
  providers: OcrProviderRecord[],
): string[] {
  return providers
    .filter((p) => p.requestCounter >= p.rotationCount)
    .map((p) => p.id);
}

/**
 * Check if a provider should advance to the next one.
 */
export function shouldAdvance(
  provider: OcrProviderRecord,
): boolean {
  return provider.requestCounter >= provider.rotationCount;
}
