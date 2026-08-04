// ============================================================
// M-02: SESSION MANAGER — Generate Package Intelligence v2
// ============================================================
//
// Manages the lifecycle of pipeline sessions.
// Replaces the in-memory Map<> from v1 with a structured class
// that enforces valid state transitions per Constitution.
//
// Traceability:
// - Constitution Business States (DRAFT → REVIEW → READY → PUBLISHED)
// - Constitution Business Events EVT-01 to EVT-14
// - R-14: Human Publish Only
// - R-18: Published Immutable
//
// NOTE: Current implementation uses in-memory storage.
// Database persistence (Prisma) will be added when the
// pipeline session table schema is finalized.
// ============================================================

import type {
  PipelineSession,
  DraftStatus,
} from './types';
import { VALID_DRAFT_TRANSITIONS } from './types';

// ── Session Store ────────────────────────────────────────────

/**
 * In-memory session storage.
 * TODO: Replace with Prisma database persistence per M-02 task.
 * Risk R-07 acknowledged — data loss on restart.
 */
const sessionStore = new Map<string, PipelineSession>();

// ── ID Generation ────────────────────────────────────────────

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `gpi_session_${timestamp}_${random}`;
}

// ── Session Manager ──────────────────────────────────────────

/**
 * Session Manager for the Generate Package Intelligence pipeline.
 *
 * Responsibilities:
 * - Create new pipeline sessions from upload inputs
 * - Retrieve sessions by ID
 * - Update session state (extraction result, validation, evidence, form config)
 * - Enforce valid draft status transitions per Constitution Business States
 * - Complete sessions (publish) and discard sessions (archive)
 *
 * Ref: Constitution Business States L122-L148
 */
export const SessionManager = {

  /**
   * Create a new pipeline session from uploaded inputs.
   * Corresponds to Business Events EVT-01 (Upload Flyer), EVT-02 (Upload Caption),
   * EVT-03 (Upload Itinerary).
   *
   * Session always starts in DRAFT status (R-01: Draft-Only).
   */
  createSession(params: {
    flyerPath: string;
    captionText: string;
    itineraryPath?: string;
    userId?: string;
  }): PipelineSession {
    const now = new Date();
    const session: PipelineSession = {
      id: generateSessionId(),
      status: 'DRAFT',
      flyerPath: params.flyerPath,
      itineraryPath: params.itineraryPath ?? null,
      captionText: params.captionText,
      rawOcrText: null,
      rawItineraryOcrText: null,
      extractionResult: null,
      validationReport: null,
      evidencePackage: null,
      formConfig: null,
      reviewedBy: null,
      reviewedAt: null,
      publishedPackageId: null,
      createdAt: now,
      updatedAt: now,
    };

    sessionStore.set(session.id, session);
    return { ...session };
  },

  /**
   * Get a session by ID.
   * Returns a copy to prevent external mutation.
   */
  getSession(sessionId: string): PipelineSession | null {
    const session = sessionStore.get(sessionId);
    return session ? { ...session } : null;
  },

  /**
   * Get a session by ID or throw if not found.
   */
  getSessionOrThrow(sessionId: string): PipelineSession {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`[SessionManager] Session ${sessionId} tidak ditemukan`);
    }
    return { ...session };
  },

  /**
   * Update session with partial data.
   * Does NOT change status — use updateStatus() for that.
   * Enforces immutability for PUBLISHED sessions (R-18).
   */
  updateSession(
    sessionId: string,
    updates: Partial<Pick<PipelineSession,
      | 'rawOcrText'
      | 'rawItineraryOcrText'
      | 'extractionResult'
      | 'validationReport'
      | 'evidencePackage'
      | 'formConfig'
    >>
  ): PipelineSession {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`[SessionManager] Session ${sessionId} tidak ditemukan`);
    }

    // R-18: Published Immutable — draft tidak boleh diubah setelah PUBLISHED
    if (session.status === 'PUBLISHED') {
      throw new Error(
        `[SessionManager] Session ${sessionId} sudah PUBLISHED. ` +
        `Tidak boleh diubah (R-18: Published Immutable).`
      );
    }

    // Apply updates
    if (updates.rawOcrText !== undefined) session.rawOcrText = updates.rawOcrText;
    if (updates.rawItineraryOcrText !== undefined) session.rawItineraryOcrText = updates.rawItineraryOcrText;
    if (updates.extractionResult !== undefined) session.extractionResult = updates.extractionResult;
    if (updates.validationReport !== undefined) session.validationReport = updates.validationReport;
    if (updates.evidencePackage !== undefined) session.evidencePackage = updates.evidencePackage;
    if (updates.formConfig !== undefined) session.formConfig = updates.formConfig;

    session.updatedAt = new Date();
    sessionStore.set(sessionId, session);

    return { ...session };
  },

  /**
   * Update the draft status of a session.
   * Enforces valid state transitions per Constitution Business States.
   *
   * Valid transitions:
   *   DRAFT   → REVIEW, ARCHIVED
   *   REVIEW  → READY, DRAFT, ARCHIVED
   *   READY   → PUBLISHED, REVIEW
   *   PUBLISHED → (none — terminal)
   *   ARCHIVED  → (none — terminal)
   *
   * REVIEW and READY transitions require a reviewerId (R-14: Human authority).
   */
  updateStatus(
    sessionId: string,
    newStatus: DraftStatus,
    reviewerId?: string
  ): PipelineSession {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`[SessionManager] Session ${sessionId} tidak ditemukan`);
    }

    // Validate transition
    const allowed = VALID_DRAFT_TRANSITIONS[session.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `[SessionManager] Transisi status tidak valid: ${session.status} → ${newStatus}. ` +
        `Transisi yang diizinkan: ${allowed.join(', ') || '(none — terminal state)'}`
      );
    }

    // Require reviewerId for REVIEW and READY transitions (R-14: Human authority)
    if ((newStatus === 'REVIEW' || newStatus === 'READY') && !reviewerId) {
      throw new Error(
        `[SessionManager] reviewerId diperlukan untuk transisi ke ${newStatus} ` +
        `(R-14: Human Publish Only).`
      );
    }

    // Apply transition
    session.status = newStatus;
    session.updatedAt = new Date();

    if (reviewerId && (newStatus === 'REVIEW' || newStatus === 'READY')) {
      session.reviewedBy = reviewerId;
      session.reviewedAt = new Date();
    }

    sessionStore.set(sessionId, session);
    return { ...session };
  },

  /**
   * Complete a session by publishing it.
   * Sets status to PUBLISHED and records the published package ID.
   *
   * Pre-conditions:
   * - Session must be in READY status
   * - publishedPackageId must be provided (EVT-13)
   *
   * Ref: Constitution Business Event EVT-13 — Publish
   */
  completeSession(
    sessionId: string,
    publishedPackageId: string,
    reviewerId: string
  ): PipelineSession {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`[SessionManager] Session ${sessionId} tidak ditemukan`);
    }

    if (session.status !== 'READY') {
      throw new Error(
        `[SessionManager] Session ${sessionId} harus dalam status READY sebelum publish. ` +
        `Status saat ini: ${session.status}`
      );
    }

    session.status = 'PUBLISHED';
    session.publishedPackageId = publishedPackageId;
    session.reviewedBy = reviewerId;
    session.reviewedAt = new Date();
    session.updatedAt = new Date();

    sessionStore.set(sessionId, session);
    return { ...session };
  },

  /**
   * Discard a session and mark it as ARCHIVED.
   * Corresponds to Business Event EVT-14 — Draft Discarded.
   *
   * Cannot discard a PUBLISHED session (R-18).
   */
  discardSession(sessionId: string): PipelineSession {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`[SessionManager] Session ${sessionId} tidak ditemukan`);
    }

    if (session.status === 'PUBLISHED') {
      throw new Error(
        `[SessionManager] Session ${sessionId} sudah PUBLISHED. ` +
        `Tidak boleh discard (R-18: Published Immutable).`
      );
    }

    if (session.status === 'ARCHIVED') {
      // Idempotent — already archived
      return { ...session };
    }

    session.status = 'ARCHIVED';
    session.updatedAt = new Date();

    sessionStore.set(sessionId, session);
    return { ...session };
  },

  /**
   * List all sessions, optionally filtered by status.
   */
  listSessions(status?: DraftStatus): PipelineSession[] {
    const all = Array.from(sessionStore.values());
    const filtered = status ? all.filter(s => s.status === status) : all;
    return filtered.map(s => ({ ...s }));
  },

  /**
   * Remove a session from the store entirely.
   * Used only for cleanup after ARCHIVED sessions.
   * Should NOT be used on active sessions.
   */
  purgeSession(sessionId: string): boolean {
    const session = sessionStore.get(sessionId);
    if (!session) return false;

    if (session.status !== 'ARCHIVED') {
      throw new Error(
        `[SessionManager] Hanya session ARCHIVED yang boleh di-purge. ` +
        `Status saat ini: ${session.status}`
      );
    }

    return sessionStore.delete(sessionId);
  },

  /**
   * Get session count, optionally by status.
   * Useful for dashboard metrics.
   */
  getSessionCount(status?: DraftStatus): number {
    if (!status) return sessionStore.size;
    return Array.from(sessionStore.values()).filter(s => s.status === status).length;
  },
};
