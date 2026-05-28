// ============================================================
// REGISTRATION STATE MACHINE — Travel Operational Automation System
// ============================================================
// Documents all valid state transitions for the registration
// lifecycle pipeline:
//   DRAFT → PENDING_REVIEW → APPROVED → ACCOUNT_CREATED → ACTIVE
//                                                   ↘ CANCELLED / EXPIRED
//   PENDING_REVIEW → REJECTED → PENDING_REVIEW (re-review)
//
// Each transition should:
//   1. Validate the transition is allowed
//   2. Perform the side effects (DB writes, audit, notifications)
//   3. Update the status atomically
// ============================================================

import type { RegistrationStatus } from "@/shared/types";

/**
 * Maps each status to the list of valid next statuses.
 * This is the single source of truth for registration lifecycle transitions.
 */
export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ACCOUNT_CREATED", "CANCELLED"],
  REJECTED: ["PENDING_REVIEW"], // can be re-reviewed after rejection
  ACCOUNT_CREATED: ["ACTIVE"],
  ACTIVE: [],
  CANCELLED: [],
  EXPIRED: [],
};

/**
 * Returns true if the transition from `current` to `next` is valid.
 */
export function isValidTransition(
  current: RegistrationStatus,
  next: RegistrationStatus,
): boolean {
  const allowed = REGISTRATION_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

/**
 * Returns a human-readable description of allowed transitions for a given status.
 * Useful for error messages in API responses.
 */
export function getAllowedTransitionsDescription(status: RegistrationStatus): string {
  const allowed = REGISTRATION_TRANSITIONS[status];
  if (!allowed || allowed.length === 0) return "tidak ada transisi yang diizinkan";
  return allowed.join(", ");
}

/**
 * Describes the semantic meaning of each status.
 */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  DRAFT: "Draf — registrasi baru dibuat, belum diajukan",
  PENDING_REVIEW: "Menunggu Review — registrasi menunggu persetujuan admin",
  APPROVED: "Disetujui — registrasi telah disetujui, sedang diproses",
  REJECTED: "Ditolak — registrasi ditolak oleh admin",
  ACCOUNT_CREATED: "Akun Dibuat — akun jamaah dan grup telah dibuat",
  ACTIVE: "Aktif — grup jamaah aktif dalam sistem",
  CANCELLED: "Dibatalkan — registrasi dibatalkan",
  EXPIRED: "Kedaluwarsa — registrasi melewati batas waktu",
};
