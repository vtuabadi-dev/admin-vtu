import { prisma } from "@/server/db/client";
import type { PackageDraftStatus } from "@prisma/client";

export interface PackageDraft {
  id: string;
  sourceUrl: string | null;
  captionText: string | null;
  itineraryText: string | null;
  status: PackageDraftStatus;
  extractedData: any;
  confidence: number | null;
  publishedId: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapPackageDraft(row: any): PackageDraft {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    captionText: row.captionText,
    itineraryText: row.itineraryText,
    status: row.status,
    extractedData: row.extractedData,
    confidence: row.confidence,
    publishedId: row.publishedId,
    tenantId: row.tenantId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const packageDraftRepo = {
  async findAll(params?: { status?: PackageDraftStatus; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.packageDraft.findMany({
        where,
        take: params?.limit,
        skip: params?.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.packageDraft.count({ where }),
    ]);
    return { data: rows.map(mapPackageDraft), total };
  },

  async findById(id: string) {
    const row = await prisma.packageDraft.findUnique({
      where: { id },
    });
    return row ? mapPackageDraft(row) : null;
  },

  async create(data: Omit<PackageDraft, "id" | "createdAt" | "updatedAt">) {
    const row = await prisma.packageDraft.create({
      data: {
        sourceUrl: data.sourceUrl,
        captionText: data.captionText,
        itineraryText: data.itineraryText,
        status: data.status,
        extractedData: data.extractedData,
        confidence: data.confidence,
        publishedId: data.publishedId,
        tenantId: data.tenantId,
      },
    });
    return mapPackageDraft(row);
  },

  async update(id: string, data: Partial<PackageDraft>) {
    const updateData: any = {};
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    if (data.captionText !== undefined) updateData.captionText = data.captionText;
    if (data.itineraryText !== undefined) updateData.itineraryText = data.itineraryText;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.extractedData !== undefined) updateData.extractedData = data.extractedData;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.publishedId !== undefined) updateData.publishedId = data.publishedId;
    if (data.tenantId !== undefined) updateData.tenantId = data.tenantId;

    const row = await prisma.packageDraft.update({
      where: { id },
      data: updateData,
    });
    return mapPackageDraft(row);
  },

  async delete(id: string) {
    await prisma.packageDraft.delete({
      where: { id },
    });
    return true;
  },
};
