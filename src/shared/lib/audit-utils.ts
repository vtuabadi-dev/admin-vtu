import type { AuditEntry, OperationalRole } from "@/shared/types";

let auditIdCounter = 0;

export function createAuditEntry(params: {
  userId?: string;
  userName?: string;
  role?: OperationalRole;
  module: AuditEntry["module"];
  action: string;
  detail: string;
  before?: string;
  after?: string;
  entityId?: string;
  entityType?: string;
}): AuditEntry {
  auditIdCounter++;
  return {
    id: `audit-${String(auditIdCounter).padStart(4, "0")}`,
    timestamp: new Date().toISOString(),
    userId: params.userId ?? "user-001",
    userName: params.userName ?? "Admin",
    role: params.role ?? "super_admin",
    module: params.module,
    action: params.action,
    detail: params.detail,
    before: params.before,
    after: params.after,
    entityId: params.entityId,
    entityType: params.entityType,
  };
}

export function formatAuditChange(before: string, after: string): string {
  return `${before} → ${after}`;
}

// ── Structured audit factories ───────────────────────────────────

export function auditDocumentAction(params: {
  userId?: string;
  userName?: string;
  role?: OperationalRole;
  action: string;
  detail: string;
  entityId?: string;
  before?: string;
  after?: string;
}): AuditEntry {
  return createAuditEntry({
    module: "dokumen",
    entityType: "document",
    ...params,
  });
}

export function auditPaymentAction(params: {
  userId?: string;
  userName?: string;
  role?: OperationalRole;
  action: string;
  detail: string;
  entityId?: string;
  before?: string;
  after?: string;
}): AuditEntry {
  return createAuditEntry({
    module: "pembayaran",
    entityType: "payment",
    ...params,
  });
}

export function auditManifestAction(params: {
  userId?: string;
  userName?: string;
  role?: OperationalRole;
  action: string;
  detail: string;
  entityId?: string;
  before?: string;
  after?: string;
}): AuditEntry {
  return createAuditEntry({
    module: "manifest",
    entityType: "manifest",
    ...params,
  });
}

export function auditRoomingAction(params: {
  userId?: string;
  userName?: string;
  role?: OperationalRole;
  action: string;
  detail: string;
  entityId?: string;
  before?: string;
  after?: string;
}): AuditEntry {
  return createAuditEntry({
    module: "rooming",
    entityType: "rooming",
    ...params,
  });
}
