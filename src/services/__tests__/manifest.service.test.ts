import { describe, it, expect } from "vitest";
import {
  computeManifestStats,
  enrichManifestWithPackage,
  getManifestsByPackage,
} from "../manifest.service";
import type { Manifest, Keberangkatan } from "@/shared/types";

const mockKbrList: Keberangkatan[] = [
  { id: "kbr-1", kode: "PKG01", paketUmroh: { namaPaket: "Paket A" } } as unknown as Keberangkatan,
  { id: "kbr-2", kode: "PKG02", paketUmroh: { namaPaket: "Paket B" } } as unknown as Keberangkatan,
];

function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    id: "m-1",
    keberangkatanId: "kbr-1",
    kode: "MNF-001",
    namaManifest: "Test Manifest",
    status: "draft",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    data: [{ id: "r1", nomorUrut: 1, jamaahId: "j1", nomorPaspor: "A123", namaLengkap: "Ali", tempatLahir: "Jakarta", tanggalLahir: "1990-01-01" }],
    ...overrides,
  };
}

describe("computeManifestStats", () => {
  it("returns zero counts for empty array", () => {
    const stats = computeManifestStats([]);
    expect(stats).toEqual({ total: 0, draft: 0, final: 0, totalJamaah: 0 });
  });

  it("counts total, draft, and final manifests", () => {
    const manifests = [
      makeManifest({ id: "m1", status: "draft" }),
      makeManifest({ id: "m2", status: "final" }),
      makeManifest({ id: "m3", status: "draft" }),
    ];
    const stats = computeManifestStats(manifests);
    expect(stats.total).toBe(3);
    expect(stats.draft).toBe(2);
    expect(stats.final).toBe(1);
  });

  it("sums totalJamaah across all manifests", () => {
    const manifests = [
      makeManifest({ id: "m1", data: [{ id: "r1" } as Manifest["data"][0], { id: "r2" } as Manifest["data"][0]] }),
      makeManifest({ id: "m2", data: [{ id: "r3" } as Manifest["data"][0]] }),
    ] as Manifest[];
    const stats = computeManifestStats(manifests);
    expect(stats.totalJamaah).toBe(3);
  });
});

describe("enrichManifestWithPackage", () => {
  it("adds packageCode and packageName from matching keberangkatan", () => {
    const result = enrichManifestWithPackage(makeManifest(), mockKbrList);
    expect(result.packageCode).toBe("PKG01");
    expect(result.packageName).toBe("Paket A");
  });

  it("falls back to '-' when keberangkatan not found", () => {
    const manifest = makeManifest({ keberangkatanId: "unknown" });
    const result = enrichManifestWithPackage(manifest, mockKbrList);
    expect(result.packageCode).toBe("-");
    expect(result.packageName).toBe("-");
  });
});

describe("getManifestsByPackage", () => {
  it("returns all manifests when packageId is 'all'", () => {
    const manifests = [makeManifest(), makeManifest({ id: "m2" })];
    expect(getManifestsByPackage(manifests, "all")).toHaveLength(2);
  });

  it("filters by keberangkatanId", () => {
    const manifests = [
      makeManifest({ id: "m1", keberangkatanId: "kbr-1" }),
      makeManifest({ id: "m2", keberangkatanId: "kbr-2" }),
    ];
    const filtered = getManifestsByPackage(manifests, "kbr-1");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.id).toBe("m1");
  });
});
