// ============================================================
// STATE MACHINE — Travel Operational Automation System
// ============================================================
// Dua workflow terpisah:
//
// A. REGISTRATION LIFECYCLE (status):
//    DRAFT → PENDING_REVIEW → APPROVED → ACCOUNT_CREATED → ACTIVE
//                        ↘ REJECTED → PENDING_REVIEW (re-review)
//    Any → CANCELLED / EXPIRED
//
// B. LEAD PIPELINE (leadStatus):
//    BARU → DIHUBUNGI → FOLLOW_UP → MENUNGGU_DP → DP_MASUK → DIKONVERSI
//                                                     ↘ DITOLAK
//    DIKONVERSI triggers: status = PENDING_REVIEW
// ============================================================

import type { RegistrationStatus, LeadStatus } from "@/shared/types";

// ═══════════════════════════════════════════════════════════
// A. REGISTRATION LIFECYCLE
// ═══════════════════════════════════════════════════════════

export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ACCOUNT_CREATED", "CANCELLED"],
  REJECTED: ["PENDING_REVIEW"], // can be re-reviewed
  ACCOUNT_CREATED: ["ACTIVE"],
  ACTIVE: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidRegistrationTransition(
  current: RegistrationStatus,
  next: RegistrationStatus,
): boolean {
  const allowed = REGISTRATION_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

export function getRegistrationTransitionsDescription(status: RegistrationStatus): string {
  const allowed = REGISTRATION_TRANSITIONS[status];
  if (!allowed || allowed.length === 0) return "tidak ada transisi yang diizinkan";
  return allowed.join(", ");
}

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

// ═══════════════════════════════════════════════════════════
// B. LEAD PIPELINE
// ═══════════════════════════════════════════════════════════

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  BARU: ["DIHUBUNGI", "DITOLAK"],
  DIHUBUNGI: ["FOLLOW_UP", "MENUNGGU_DP", "DITOLAK"],
  FOLLOW_UP: ["MENUNGGU_DP", "DIHUBUNGI", "DITOLAK"],
  MENUNGGU_DP: ["DP_MASUK", "DIHUBUNGI", "DITOLAK"],
  DP_MASUK: ["DIKONVERSI", "MENUNGGU_DP", "DITOLAK"],
  DIKONVERSI: [], // terminal — sudah masuk registration pipeline
  DITOLAK: [],   // terminal
};

export function isValidLeadTransition(
  current: LeadStatus,
  next: LeadStatus,
): boolean {
  const allowed = LEAD_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

export function getLeadTransitionsDescription(status: LeadStatus): string {
  const allowed = LEAD_TRANSITIONS[status];
  if (!allowed || allowed.length === 0) return "tidak ada transisi yang diizinkan";
  return allowed.join(", ");
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  BARU: "Baru — lead dari portal pendaftaran",
  DIHUBUNGI: "Dihubungi — tim sudah kontak calon jamaah",
  FOLLOW_UP: "Follow Up — dalam proses tindak lanjut",
  MENUNGGU_DP: "Menunggu DP — menunggu pembayaran uang muka",
  DP_MASUK: "DP Masuk — uang muka diterima, siap konversi",
  DIKONVERSI: "Dikonversi — lead sudah menjadi registrasi aktif",
  DITOLAK: "Ditolak — lead tidak dilanjutkan",
};

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════

/** @deprecated Use isValidRegistrationTransition */
export const isValidTransition = isValidRegistrationTransition;

/** @deprecated Use getRegistrationTransitionsDescription */
export const getAllowedTransitionsDescription = getRegistrationTransitionsDescription;
