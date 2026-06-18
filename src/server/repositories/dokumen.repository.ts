import { prisma } from "@/server/db/client";
import type { DokumenItem, OcrData, StatusDokumen } from "@/shared/types";

function mapDokumen(doc: any): DokumenItem {
  return {
    id: doc.id,
    jamaahId: doc.jamaahId,
    jenis: doc.jenis,
    wajib: doc.wajib,
    status: doc.status as StatusDokumen,
    fileUrl: doc.fileUrl ?? undefined,
    ocrData: doc.ocrData as OcrData | undefined,
    catatan: doc.catatan ?? undefined,
    uploadedAt: doc.uploadedAt?.toISOString(),
    verifiedAt: doc.verifiedAt?.toISOString(),
    verifiedBy: doc.verifiedBy ?? undefined,
    dataStatus: (doc.dataStatus as DokumenItem["dataStatus"]) ?? undefined,
    fileStatus: (doc.fileStatus as DokumenItem["fileStatus"]) ?? undefined,
    manualData: doc.manualData as DokumenItem["manualData"] | undefined,
    ocrRetryCount: doc.ocrRetryCount ?? 0,
    qualityCheck: doc.qualityCheck as DokumenItem["qualityCheck"] | undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const dokumenRepo = {
  mapDokumen,
  async findByJamaah(jamaahId: string) {
    const rows = await prisma.dokumenItem.findMany({ where: { jamaahId }, orderBy: { jenis: "asc" } });
    return rows.map(mapDokumen);
  },

  async updateStatus(id: string, status: StatusDokumen, verifiedBy?: string) {
    const row = await prisma.dokumenItem.update({
      where: { id },
      data: {
        status,
        ...(status === "verified" || status === "lengkap" ? { verifiedAt: new Date(), verifiedBy: verifiedBy ?? null } : {}),
        ...(status === "rejected" ? { verifiedBy: verifiedBy ?? null } : {}),
      },
    });
    return mapDokumen(row);
  },

  async updateFileStatus(id: string, fileStatus: DokumenItem["fileStatus"], qualityCheck?: DokumenItem["qualityCheck"]) {
    const row = await prisma.dokumenItem.update({
      where: { id },
      data: {
        fileStatus: fileStatus ?? null,
        qualityCheck: qualityCheck as any ?? undefined,
        status: fileStatus === "valid" ? "processing" : fileStatus === "rejected" ? "rejected" : "revisi",
      },
    });
    return mapDokumen(row);
  },

  async saveManualOcrData(id: string, manualData: DokumenItem["manualData"], dataStatus: DokumenItem["dataStatus"] = "manual_edit") {
    const row = await prisma.dokumenItem.update({
      where: { id },
      data: { manualData: manualData as any, dataStatus },
    });
    return mapDokumen(row);
  },

  async saveOcrResult(id: string, ocrData: OcrData) {
    const row = await prisma.dokumenItem.update({
      where: { id },
      data: {
        ocrData: ocrData as any,
        dataStatus: ocrData.confidence >= 0.7 ? "valid" : "pending",
        ocrRetryCount: { increment: 0 },
      },
    });
    return mapDokumen(row);
  },

  async incrementOcrRetry(id: string) {
    const row = await prisma.dokumenItem.update({
      where: { id },
      data: { ocrRetryCount: { increment: 1 }, status: "processing" },
    });
    return mapDokumen(row);
  },

  async getReviewQueue() {
    const rows = await prisma.dokumenItem.findMany({
      where: { status: { in: ["pending", "processing", "revisi"] } },
      include: { jamaah: { select: { id: true, namaLengkap: true, nomorPeserta: true, registrationId: true, groupId: true } } },
      orderBy: { uploadedAt: "asc" },
      take: 100,
    });
    return rows.map((r: any) => ({
      dokumen: mapDokumen(r),
      jamaah: (r as any).jamaah ?? null,
    }));
  },
};
