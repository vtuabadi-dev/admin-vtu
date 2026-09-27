import { prisma } from "@/server/db/client";
import { formatStandardDocumentFileName, hasPackageTourLeader } from "@/shared/lib/file-standardization";
import { moveAndRenameDriveFile, isGoogleDriveConfigured } from "@/server/storage/google-drive";

/**
 * Resolves the accurate sequential manifest number for a given Jamaah.
 * Adheres to ADR-0014: FIFO chronological ordering based on package entry time,
 * with Tour Leader offset (starts from 2 if package has TL, 1 if without).
 */
export async function resolveJamaahManifestSequence(jamaahId: string): Promise<number> {
  const jamaah = await prisma.jamaah.findUnique({
    where: { id: jamaahId },
    include: {
      group: {
        include: { keberangkatan: true },
      },
    },
  });

  if (!jamaah || !jamaah.group?.paketKeberangkatanId) return 1;

  // 1. Check if an explicit manifest row exists
  const manifestRow = await prisma.manifestRow.findFirst({
    where: { jamaahId },
    select: { nomorUrut: true },
  });
  if (manifestRow?.nomorUrut) {
    return manifestRow.nomorUrut;
  }

  // 2. Compute dynamic chronological position within the package
  const keberangkatan = jamaah.group.keberangkatan;
  const hasTL = hasPackageTourLeader(keberangkatan);
  const offset = hasTL ? 2 : 1;

  const packageGroups = await prisma.registrationGroup.findMany({
    where: {
      paketKeberangkatanId: jamaah.group.paketKeberangkatanId,
      status: { not: "batal" as any },
    },
    orderBy: { updatedAt: "asc" },
    include: {
      anggota: {
        where: { status: { not: "batal" as any } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      },
    },
  });

  let currentCounter = offset;
  for (const g of packageGroups) {
    for (const m of g.anggota) {
      if (m.id === jamaahId) {
        return currentCounter;
      }
      currentCounter++;
    }
  }

  return currentCounter;
}

/**
 * Resolves the Single Source of Truth (SSOT) Manifest Name for a Jamaah.
 * Prioritizes passport OCR/manual verification data, then KTP, then registered name.
 */
export function resolveJamaahManifestName(jamaah: any): string {
  if (jamaah.dokumen && Array.isArray(jamaah.dokumen)) {
    const pasporDoc = jamaah.dokumen.find((d: any) => d.jenis === "paspor");
    if (pasporDoc) {
      const pName = pasporDoc.manualData?.namaLengkap || pasporDoc.ocrData?.namaLengkap;
      if (pName && typeof pName === "string" && pName.trim()) {
        return pName.trim();
      }
    }

    const ktpDoc = jamaah.dokumen.find((d: any) => d.jenis === "ktp");
    if (ktpDoc) {
      const kName = ktpDoc.manualData?.namaLengkap || ktpDoc.ocrData?.namaLengkap;
      if (kName && typeof kName === "string" && kName.trim()) {
        return kName.trim();
      }
    }
  }

  return jamaah.namaLengkap || "JAMAAH";
}

/**
 * Synchronizes all document filenames for a given Jamaah in Google Drive
 * to the standardized manifest format: [3 digit no urut]-[4digit id reg]-[nama manifest].[ext]
 */
export async function syncJamaahDocumentFileNamesToDrive(
  jamaahId: string,
  options?: { newName?: string; newNomorManifest?: number }
): Promise<{ success: boolean; renamedCount: number; errors: string[] }> {
  if (!isGoogleDriveConfigured()) {
    return { success: false, renamedCount: 0, errors: ["Google Drive belum dikonfigurasi"] };
  }

  try {
    const jamaah = await prisma.jamaah.findUnique({
      where: { id: jamaahId },
      include: {
        group: { include: { keberangkatan: true } },
        dokumen: true,
      },
    });

    if (!jamaah) {
      return { success: false, renamedCount: 0, errors: ["Jamaah tidak ditemukan"] };
    }

    const nomorManifest = options?.newNomorManifest ?? (await resolveJamaahManifestSequence(jamaahId));
    const manifestName = options?.newName ?? resolveJamaahManifestName(jamaah);
    const regCode = jamaah.registrationId || jamaah.group?.kodeRegistrasi || jamaah.id;

    let renamedCount = 0;
    const errors: string[] = [];

    for (const dok of jamaah.dokumen) {
      if (!dok.fileUrl) continue;

      let ext = "jpg";
      const extMatch = dok.fileUrl.match(/\.([a-zA-Z0-9]{3,4})(?:[?#]|$)/i);
      if (extMatch && extMatch[1]) {
        ext = extMatch[1].toLowerCase();
      }

      // ADR-0014: [3 digit no urut manifest]-[4digit id reg dan id unik grup]-[Nama Manifest].[ext]
      const newFileName = formatStandardDocumentFileName(nomorManifest, regCode, manifestName, ext);

      try {
        const renamed = await moveAndRenameDriveFile(dok.fileUrl, undefined, undefined, newFileName);
        if (renamed) {
          renamedCount++;
        }
      } catch (err: any) {
        errors.push(`Gagal me-rename dokumen ${dok.jenis} (${dok.id}): ${err?.message || err}`);
      }
    }

    return { success: errors.length === 0, renamedCount, errors };
  } catch (err: any) {
    return { success: false, renamedCount: 0, errors: [err?.message || "Kesalahan internal"] };
  }
}

/**
 * Synchronizes all document filenames for all Jamaah in a package
 * to match the latest manifest numbering and names in Google Drive.
 */
export async function syncPackageDocumentFileNamesToDrive(
  keberangkatanId: string
): Promise<{ success: boolean; totalProcessed: number; renamedCount: number; errors: string[] }> {
  if (!isGoogleDriveConfigured()) {
    return { success: false, totalProcessed: 0, renamedCount: 0, errors: ["Google Drive belum dikonfigurasi"] };
  }

  try {
    const paket = await prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
    });
    if (!paket) {
      return { success: false, totalProcessed: 0, renamedCount: 0, errors: ["Paket keberangkatan tidak ditemukan"] };
    }

    const hasTL = hasPackageTourLeader(paket);
    let currentCounter = hasTL ? 2 : 1;

    const groups = await prisma.registrationGroup.findMany({
      where: {
        paketKeberangkatanId: keberangkatanId,
        status: { not: "batal" as any },
      },
      orderBy: { updatedAt: "asc" },
      include: {
        anggota: {
          where: { status: { not: "batal" as any } },
          orderBy: { createdAt: "asc" },
          include: { dokumen: true },
        },
      },
    });

    let totalProcessed = 0;
    let renamedCount = 0;
    const allErrors: string[] = [];

    for (const g of groups) {
      for (const m of g.anggota) {
        const noUrut = currentCounter++;
        const manifestName = resolveJamaahManifestName(m);
        const res = await syncJamaahDocumentFileNamesToDrive(m.id, {
          newNomorManifest: noUrut,
          newName: manifestName,
        });

        totalProcessed++;
        renamedCount += res.renamedCount;
        if (res.errors.length > 0) {
          allErrors.push(...res.errors);
        }
      }
    }

    return {
      success: allErrors.length === 0,
      totalProcessed,
      renamedCount,
      errors: allErrors,
    };
  } catch (err: any) {
    return { success: false, totalProcessed: 0, renamedCount: 0, errors: [err?.message || "Kesalahan internal"] };
  }
}
