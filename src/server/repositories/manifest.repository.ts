import { prisma } from "@/server/db/client";
import type { Manifest, ManifestRow } from "@/shared/types";

function mapManifest(row: any): Manifest {
  return {
    id: row.id,
    keberangkatanId: row.keberangkatanId,
    kode: row.kode,
    namaManifest: row.namaManifest,
    templateId: row.templateId ?? undefined,
    hotelMekkah: row.hotelMekkah ?? undefined,
    hotelMadinah: row.hotelMadinah ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status,
    data: (row.rows ?? []).map(mapManifestRow),
  };
}

function mapManifestRow(row: any): ManifestRow {
  const j = row.jamaah;
  const group = j?.group;
  const hotelUpgrade = group?.registrationRequests?.[0]?.hotelUpgrade;
  const statusPerlengkapan = j?.statusPerlengkapan;

  const isV2 = Boolean(
    row.catatan?.toLowerCase().includes("varian 2") ||
    row.catatan?.toLowerCase().includes("v2") ||
    hotelUpgrade?.toLowerCase().includes("varian 2") ||
    hotelUpgrade?.toLowerCase().includes("tanpa perlengkapan") ||
    statusPerlengkapan === "TANPA"
  );

  let varianName: string | undefined = undefined;
  if (isV2) {
    if (hotelUpgrade) {
      varianName = hotelUpgrade.replace(/^Varian 2\s*-\s*/i, "").trim();
    } else if (statusPerlengkapan === "TANPA") {
      varianName = "Tanpa Perlengkapan (Saja)";
    } else {
      varianName = "Spesifikasi Varian 2";
    }
  }

  return {
    id: row.id,
    nomorUrut: row.nomorUrut,
    jamaahId: row.jamaahId,
    nomorPaspor: row.nomorPaspor,
    namaLengkap: row.namaLengkap,
    tempatLahir: row.tempatLahir,
    tanggalLahir: row.tanggalLahir,
    nomorKursi: row.nomorKursi ?? undefined,
    nomorKamar: row.nomorKamar ?? undefined,
    catatan: row.catatan ?? undefined,
    isKeretaCepat: row.isKeretaCepat ?? j?.isKeretaCepat ?? undefined,
    isCityTourThoif: row.isCityTourThoif ?? j?.isCityTourThoif ?? undefined,
    isVarian2: isV2,
    varianName: isV2 ? varianName : undefined,
    statusPerlengkapan: statusPerlengkapan ?? undefined,
  };
}

const defaultRowInclude = {
  orderBy: { nomorUrut: "asc" as const },
  include: {
    jamaah: {
      include: {
        group: {
          include: {
            registrationRequests: {
              select: { hotelUpgrade: true, roomUpgrade: true },
            },
          },
        },
      },
    },
  },
};

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const manifestRepo = {
  async findAll(params?: { keberangkatanId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.keberangkatanId) where.keberangkatanId = params.keberangkatanId;
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.manifest.findMany({ where, include: { rows: defaultRowInclude }, take: params?.limit, skip: params?.offset, orderBy: { createdAt: "desc" } }),
      prisma.manifest.count({ where }),
    ]);
    return { data: rows.map(mapManifest), total };
  },

  async findById(id: string) {
    const row = await prisma.manifest.findUnique({ where: { id }, include: { rows: defaultRowInclude } });
    return row ? mapManifest(row) : null;
  },

  async findByKeberangkatan(keberangkatanId: string) {
    const rows = await prisma.manifest.findMany({
      where: { keberangkatanId },
      include: { rows: defaultRowInclude },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapManifest);
  },

  async create(data: Omit<Manifest, "id" | "createdAt" | "updatedAt" | "data"> & { rows: Omit<ManifestRow, "id">[] }) {
    const row = await prisma.manifest.create({
      data: {
        keberangkatanId: data.keberangkatanId,
        kode: data.kode,
        namaManifest: data.namaManifest,
        templateId: data.templateId ?? null,
        hotelMekkah: data.hotelMekkah ?? null,
        hotelMadinah: data.hotelMadinah ?? null,
        status: data.status,
        rows: {
          create: data.rows.map((r: any) => ({
            nomorUrut: r.nomorUrut,
            jamaahId: r.jamaahId,
            nomorPaspor: r.nomorPaspor,
            namaLengkap: r.namaLengkap,
            tempatLahir: r.tempatLahir,
            tanggalLahir: r.tanggalLahir,
            nomorKursi: r.nomorKursi ?? null,
            nomorKamar: r.nomorKamar ?? null,
            catatan: r.catatan ?? null,
          })),
        },
      },
      include: { rows: { orderBy: { nomorUrut: "asc" } } },
    });
    return mapManifest(row);
  },

  async finalize(id: string) {
    // Dynamic manifest numbering for finalized manifests
    const existing = await prisma.manifest.findUnique({ where: { id }, include: { rows: true } });
    if (!existing) throw new Error("Manifest not found");

    // Renumber rows sequentially
    const updates = existing.rows
      .sort((a: any, b: any) => a.nomorUrut - b.nomorUrut)
      .map((r: any, i: number) => prisma.manifestRow.update({ where: { id: r.id }, data: { nomorUrut: i + 1 } }));
    await Promise.all(updates);

    const row = await prisma.manifest.update({
      where: { id },
      data: { status: "final", updatedAt: new Date() },
      include: { rows: { orderBy: { nomorUrut: "asc" } } },
    });
    return mapManifest(row);
  },

  async submit(id: string) {
    const row = await prisma.manifest.update({
      where: { id },
      data: { status: "submitted", updatedAt: new Date() },
      include: { rows: { orderBy: { nomorUrut: "asc" } } },
    });
    return mapManifest(row);
  },
};
