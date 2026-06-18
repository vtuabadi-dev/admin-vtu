// ============================================================
// OPERATIONAL DOCUMENT REPOSITORY
// CMS untuk Syarat & Ketentuan, Template, dan Dokumen Operasional
// ============================================================

import { prisma } from "@/server/db/client";

export interface OperationalDocumentRow {
  id: string;
  type: string;
  title: string;
  version: string;
  content: string;
  status: string;
  effectiveDate: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    version: row.version,
    content: row.content,
    status: row.status,
    effectiveDate: row.effectiveDate?.toISOString() ?? null,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const operationalDocumentRepo = {
  async findAll(params?: { type?: string; status?: string }) {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.status) where.status = params.status;

    const rows = await (prisma as any).operationalDocument.findMany({
      where,
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(mapRow);
  },

  async findById(id: string) {
    const row = await (prisma as any).operationalDocument.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  },

  async findActiveByType(type: string) {
    const row = await (prisma as any).operationalDocument.findFirst({
      where: { type, status: "ACTIVE" },
      orderBy: { effectiveDate: "desc" },
    });
    return row ? mapRow(row) : null;
  },

  async create(data: {
    type: string;
    title: string;
    version: string;
    content: string;
    status?: string;
    effectiveDate?: Date;
    createdBy?: string;
  }) {
    const row = await (prisma as any).operationalDocument.create({
      data: {
        type: data.type,
        title: data.title,
        version: data.version,
        content: data.content,
        status: data.status ?? "DRAFT",
        effectiveDate: data.effectiveDate ?? null,
        createdBy: data.createdBy ?? null,
      },
    });
    return mapRow(row);
  },

  async update(id: string, data: {
    title?: string;
    content?: string;
    status?: string;
    effectiveDate?: Date;
    updatedBy?: string;
  }) {
    const row = await (prisma as any).operationalDocument.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate }),
        ...(data.updatedBy !== undefined && { updatedBy: data.updatedBy }),
      },
    });
    return mapRow(row);
  },

  /** Activate this version — archive all other active versions of same type */
  async activateVersion(id: string, updatedBy?: string) {
    const doc = await (prisma as any).operationalDocument.findUnique({ where: { id } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");

    // Archive all active docs of same type
    await (prisma as any).operationalDocument.updateMany({
      where: { type: doc.type, status: "ACTIVE", id: { not: id } },
      data: { status: "ARCHIVED" },
    });

    // Activate this one
    const row = await (prisma as any).operationalDocument.update({
      where: { id },
      data: {
        status: "ACTIVE",
        effectiveDate: new Date(),
        updatedBy: updatedBy ?? null,
      },
    });
    return mapRow(row);
  },
};
