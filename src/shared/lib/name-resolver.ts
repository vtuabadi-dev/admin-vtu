// Centralized operational name resolution
// Priority: PASSPORT → KTP → REGISTRATION
// All modules that use namaLengkap in generated outputs MUST use this resolver.

import type { Jamaah, DokumenItem } from "@/shared/types";

export function resolveOperationalName(
  jamaah: Pick<Jamaah, "namaLengkap">,
  dokumen?: Pick<DokumenItem, "jenis" | "ocrData" | "manualData">[],
): string {
  if (!dokumen || dokumen.length === 0) return jamaah.namaLengkap.toUpperCase().trim();

  // Priority 1: Passport OCR or manual data
  const paspor = dokumen.find((d) => d.jenis === "paspor");
  if (paspor) {
    const passportName =
      paspor.manualData?.namaLengkap?.trim() ||
      paspor.ocrData?.namaLengkap?.trim();
    if (passportName) return passportName.toUpperCase();
  }

  // Priority 2: KTP OCR or manual data
  const ktp = dokumen.find((d) => d.jenis === "ktp");
  if (ktp) {
    const ktpName =
      ktp.manualData?.namaLengkap?.trim() ||
      ktp.ocrData?.namaLengkap?.trim();
    if (ktpName) return ktpName.toUpperCase();
  }

  // Priority 3: Registration name (fallback)
  return jamaah.namaLengkap.toUpperCase().trim();
}

export function resolveOperationalNik(
  dokumen?: Pick<DokumenItem, "jenis" | "ocrData" | "manualData">[],
): string | undefined {
  if (!dokumen) return undefined;

  // Priority: KTP → Akta → KK
  const sources = ["ktp", "akta", "kk"] as const;
  for (const jenis of sources) {
    const doc = dokumen.find((d) => d.jenis === jenis);
    if (doc) {
      const nik = doc.manualData?.nik?.trim() || doc.ocrData?.nik?.trim();
      if (nik) return nik;
    }
  }
  return undefined;
}

export function resolveOperationalPaspor(
  dokumen?: Pick<DokumenItem, "jenis" | "ocrData" | "manualData">[],
): string | undefined {
  const paspor = dokumen?.find((d) => d.jenis === "paspor");
  if (!paspor) return undefined;
  return paspor.manualData?.nomorPaspor?.trim() || paspor.ocrData?.nomorPaspor?.trim();
}
