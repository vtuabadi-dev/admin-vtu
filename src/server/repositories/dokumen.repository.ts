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

async function syncJamaahAndManifestFromDocData(jamaahId: string, data: Record<string, any>) {
  if (!jamaahId || !data) return;

  const jamaahUpdates: Record<string, any> = {};
  const manifestUpdates: Record<string, any> = {};

  // Check if jamaah already has passport name (Single Source of Truth)
  const currentJamaah = await prisma.jamaah.findUnique({
    where: { id: jamaahId },
    include: { dokumen: { where: { jenis: "paspor" } } },
  }).catch(() => null);

  const hasPassportName = Boolean(
    (currentJamaah?.nomorPaspor && currentJamaah.nomorPaspor !== "-") ||
    currentJamaah?.dokumen?.some((d: any) => d.manualData?.namaLengkap || d.ocrData?.namaLengkap)
  );

  const isPassportData = Boolean(data.nomorPaspor || data.tempatTerbitPaspor);

  if (typeof data.namaLengkap === "string" && data.namaLengkap.trim()) {
    const cleanedName = data.namaLengkap.trim().toUpperCase();
    // Only update name if it's passport data OR if jamaah has no passport name yet
    if (isPassportData || !hasPassportName) {
      jamaahUpdates.namaLengkap = cleanedName;
      manifestUpdates.namaLengkap = cleanedName;
    }
  }

  if (typeof data.nomorPaspor === "string" && data.nomorPaspor.trim()) {
    const cleanedPaspor = data.nomorPaspor.trim().toUpperCase();
    jamaahUpdates.nomorPaspor = cleanedPaspor;
    manifestUpdates.nomorPaspor = cleanedPaspor;
  }

  if (data.tanggalKadaluarsa) {
    const expDate = new Date(data.tanggalKadaluarsa);
    if (!isNaN(expDate.getTime())) {
      jamaahUpdates.masaBerlakuPaspor = expDate;
    }
  } else if (data.masaBerlaku) {
    const expDate = new Date(data.masaBerlaku);
    if (!isNaN(expDate.getTime())) {
      jamaahUpdates.masaBerlakuPaspor = expDate;
    }
  }

  if (typeof data.tempatLahir === "string" && data.tempatLahir.trim()) {
    jamaahUpdates.tempatLahir = data.tempatLahir.trim();
    manifestUpdates.tempatLahir = data.tempatLahir.trim();
  }

  if (data.tanggalLahir) {
    const dob = new Date(data.tanggalLahir);
    if (!isNaN(dob.getTime())) {
      jamaahUpdates.tanggalLahir = dob;
      manifestUpdates.tanggalLahir = data.tanggalLahir;
    }
  }

  if (typeof data.nik === "string" && data.nik.trim()) {
    jamaahUpdates.nik = data.nik.trim();
  }

  if (typeof data.statusPerkawinan === "string" && data.statusPerkawinan.trim()) {
    const s = data.statusPerkawinan.trim().toUpperCase();
    jamaahUpdates.statusMenikah = s.includes("BELUM") ? "Belum Menikah" : s.includes("KAWIN") || s.includes("MENIKAH") ? "Menikah" : s;
  }

  if (typeof data.provinsi === "string" && data.provinsi.trim()) {
    jamaahUpdates.provinsi = data.provinsi.trim();
  }

  if (typeof data.kota === "string" && data.kota.trim()) {
    jamaahUpdates.kota = data.kota.trim();
  } else if (typeof data.kotaKabupaten === "string" && data.kotaKabupaten.trim()) {
    jamaahUpdates.kota = data.kotaKabupaten.trim();
  }

  if (typeof data.kecamatan === "string" && data.kecamatan.trim()) {
    jamaahUpdates.kecamatan = data.kecamatan.trim();
  }

  if (typeof data.kelurahan === "string" && data.kelurahan.trim()) {
    jamaahUpdates.kelurahan = data.kelurahan.trim();
  }

  if (typeof data.alamatLengkap === "string" && data.alamatLengkap.trim()) {
    jamaahUpdates.alamat = data.alamatLengkap.trim();
  } else if (typeof data.alamat === "string" && data.alamat.trim()) {
    jamaahUpdates.alamat = data.alamat.trim();
  }

  // Update Jamaah if there are updates
  if (Object.keys(jamaahUpdates).length > 0) {
    await prisma.jamaah.update({
      where: { id: jamaahId },
      data: jamaahUpdates,
    }).catch((err) => console.warn("[DokumenRepo] Failed to sync Jamaah from OCR:", err));
  }

  // Update ManifestRows if there are updates
  if (Object.keys(manifestUpdates).length > 0) {
    await prisma.manifestRow.updateMany({
      where: { jamaahId },
      data: manifestUpdates,
    }).catch((err) => console.warn("[DokumenRepo] Failed to sync ManifestRow from OCR:", err));
  }
}

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
    if (row.jamaahId && manualData) {
      await syncJamaahAndManifestFromDocData(row.jamaahId, manualData as Record<string, any>);
    }
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
    if (row.jamaahId && ocrData) {
      await syncJamaahAndManifestFromDocData(row.jamaahId, ocrData as Record<string, any>);
    }
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
