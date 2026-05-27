import { prisma } from "@/server/db/client";
import type { AuditEntry, OperationalRole } from "@/shared/types";

function mapAudit(row: any): AuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    userId: row.userId,
    userName: row.userName,
    role: row.role as OperationalRole,
    module: row.module,
    action: row.action,
    detail: row.detail,
    before: row.before ?? undefined,
    after: row.after ?? undefined,
    entityId: row.entityId ?? undefined,
    entityType: row.entityType ?? undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const auditRepo = {
  async findAll(params?: { module?: string; userId?: string; entityId?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.module) where.module = params.module;
    if (params?.userId) where.userId = params.userId;
    if (params?.entityId) where.entityId = params.entityId;

    const [rows, total] = await Promise.all([
      prisma.auditEntry.findMany({ where, take: params?.limit ?? 50, skip: params?.offset, orderBy: { timestamp: "desc" } }),
      prisma.auditEntry.count({ where }),
    ]);
    return { data: rows.map(mapAudit), total };
  },

  async findByEntity(entityId: string, entityType: string) {
    const rows = await prisma.auditEntry.findMany({
      where: { entityId, entityType },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return rows.map(mapAudit);
  },

  async create(entry: Omit<AuditEntry, "id" | "timestamp">) {
    const row = await prisma.auditEntry.create({
      data: {
        userId: entry.userId,
        userName: entry.userName,
        role: entry.role,
        module: entry.module,
        action: entry.action,
        detail: entry.detail,
        before: entry.before ?? null,
        after: entry.after ?? null,
        entityId: entry.entityId ?? null,
        entityType: entry.entityType ?? null,
      },
    });
    return mapAudit(row);
  },
};
