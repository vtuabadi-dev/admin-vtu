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
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const manifestRepo = {
  async findAll(params?: { keberangkatanId?: string; status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.keberangkatanId) where.keberangkatanId = params.keberangkatanId;
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.manifest.findMany({ where, include: { rows: { orderBy: { nomorUrut: "asc" } } }, take: params?.limit, skip: params?.offset, orderBy: { createdAt: "desc" } }),
      prisma.manifest.count({ where }),
    ]);
    return { data: rows.map(mapManifest), total };
  },

  async findById(id: string) {
    const row = await prisma.manifest.findUnique({ where: { id }, include: { rows: { orderBy: { nomorUrut: "asc" } } } });
    return row ? mapManifest(row) : null;
  },

  async findByKeberangkatan(keberangkatanId: string) {
    const rows = await prisma.manifest.findMany({
      where: { keberangkatanId },
      include: { rows: { orderBy: { nomorUrut: "asc" } } },
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
      .sort((a, b) => a.nomorUrut - b.nomorUrut)
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
