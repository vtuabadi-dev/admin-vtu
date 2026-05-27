import type { Manifest, Jamaah } from "@/shared/types";

export interface ManifestValidationCheck {
  key: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail?: string;
}

export interface ManifestValidationResult {
  canFinalize: boolean;
  checks: ManifestValidationCheck[];
  blockingCount: number;
  totalCount: number;
}

export function validateManifestFinalization(
  manifest: Manifest,
  jamaahList: Jamaah[]
): ManifestValidationResult {
  const checks: ManifestValidationCheck[] = [];

  // 1. All jamaah included in manifest
  const manifestJamaahIds = new Set(manifest.data.map((r) => r.jamaahId));
  const missingJamaah = jamaahList.filter((j) => !manifestJamaahIds.has(j.id));
  checks.push({
    key: "all_included",
    label: "Semua jamaah masuk manifest",
    passed: missingJamaah.length === 0,
    blocking: true,
    detail:
      missingJamaah.length > 0
        ? `${missingJamaah.length} jamaah belum masuk`
        : `${jamaahList.length} jamaah terdaftar`,
  });

  // 2. No duplicate jamaah entries
  const seen = new Set<string>();
  const duplicates: string[] = [];
  manifest.data.forEach((r) => {
    if (seen.has(r.jamaahId)) duplicates.push(r.jamaahId);
    else seen.add(r.jamaahId);
  });
  checks.push({
    key: "no_duplicates",
    label: "Tidak ada jamaah duplikat",
    passed: duplicates.length === 0,
    blocking: true,
    detail: duplicates.length > 0 ? `${duplicates.length} duplikat terdeteksi` : "Semua unik",
  });

  // 3. All rows have nomorPaspor filled
  const noPaspor = manifest.data.filter((r) => !r.nomorPaspor || r.nomorPaspor.trim() === "");
  checks.push({
    key: "paspor_filled",
    label: "Semua baris memiliki nomor paspor",
    passed: noPaspor.length === 0,
    blocking: true,
    detail: noPaspor.length > 0 ? `${noPaspor.length} baris tanpa paspor` : "Semua lengkap",
  });

  // 4. All rows have namaLengkap filled
  const noNama = manifest.data.filter((r) => !r.namaLengkap || r.namaLengkap.trim() === "");
  checks.push({
    key: "nama_filled",
    label: "Semua baris memiliki nama lengkap",
    passed: noNama.length === 0,
    blocking: true,
    detail: noNama.length > 0 ? `${noNama.length} baris tanpa nama` : "Semua lengkap",
  });

  // 5. Nomor kursi assigned (non-blocking)
  const noKursi = manifest.data.filter((r) => !r.nomorKursi);
  checks.push({
    key: "kursi_assigned",
    label: "Nomor kursi terisi semua",
    passed: noKursi.length === 0,
    blocking: false,
    detail: noKursi.length > 0 ? `${noKursi.length} baris tanpa kursi` : "Semua terisi",
  });

  const blockingChecks = checks.filter((c) => c.blocking && !c.passed);
  return {
    canFinalize: blockingChecks.length === 0,
    checks,
    blockingCount: blockingChecks.length,
    totalCount: checks.length,
  };
}
