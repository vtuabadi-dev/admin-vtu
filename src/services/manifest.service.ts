import type { Manifest, Keberangkatan } from "@/shared/types";
import type { ManifestStats, EnrichedManifest } from "./contracts";

export function computeManifestStats(manifests: Manifest[]): ManifestStats {
  return {
    total: manifests.length,
    draft: manifests.filter((m) => m.status === "draft").length,
    final: manifests.filter((m) => m.status === "final").length,
    totalJamaah: manifests.reduce((sum, m) => sum + m.data.length, 0),
  };
}

export function enrichManifestWithPackage(
  manifest: Manifest,
  kbrList: Keberangkatan[]
): EnrichedManifest {
  const kbr = kbrList.find((k) => k.id === manifest.keberangkatanId);
  return {
    ...manifest,
    packageCode: kbr?.kode ?? "-",
    packageName: kbr?.paketUmroh?.namaPaket ?? "-",
  };
}

export function getManifestsByPackage(
  manifests: Manifest[],
  packageId: string | "all"
): Manifest[] {
  if (packageId === "all") return manifests;
  return manifests.filter((m) => m.keberangkatanId === packageId);
}
