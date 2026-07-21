import { prisma } from "@/server/db/client";
import type { Keberangkatan } from "@/shared/types";

function mapKeberangkatan(row: any): Keberangkatan {
  return {
    id: row.id,
    kode: row.kodeIndividu || row.kode,
    paketUmrohId: row.paketUmrohId ?? "",
    status: row.status,
    terisi: row.terisi,
    jamaahIds: (row.groups as any[])?.flatMap((g: any) => g.anggota?.map((a: any) => a.id) ?? []) ?? [],
    maxSeat: row.maxSeat ?? undefined,
    targetMaterialisasi: row.targetMaterialisasi ?? undefined,
    maskapaiId: row.maskapaiId ?? undefined,
    hotelMekkahId: row.hotelMekkahId ?? undefined,
    hotelMadinahId: row.hotelMadinahId ?? undefined,
    startingPointId: row.startingPointId ?? undefined,
    packageTypeId: row.packageTypeId ?? undefined,
    namaPaket: row.namaPaket ?? "-",
    hargaPaket: row.hargaPaket ?? 0,
    maskapai: row.maskapai ?? "-",
    hotelMekkah: row.hotelMekkah ?? "-",
    hotelMadinah: row.hotelMadinah ?? "-",
    kuota: row.kuota ?? row.maxSeat ?? 0,
    tanggalBerangkat: row.tanggalBerangkat?.toISOString() ?? new Date().toISOString(),
    tanggalPulang: row.tanggalPulang?.toISOString() ?? new Date().toISOString(),
    nomorPenerbangan: row.nomorPenerbangan ?? "-",
    kodeIndividu: row.kodeIndividu ?? undefined,
    paketGrupId: row.paketGrupId ?? undefined,
    driveFolderIds: row.driveFolderIds ?? undefined,
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const keberangkatanRepo = {
  async findAll(params?: { status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      prisma.keberangkatan.findMany({
        where,
        include: { groups: { include: { anggota: { select: { id: true } } } } },
        take: params?.limit,
        skip: params?.offset,
        orderBy: { tanggalBerangkat: "asc" },
      }),
      prisma.keberangkatan.count({ where }),
    ]);
    return { data: rows.map(mapKeberangkatan), total };
  },

  async findById(id: string) {
    const row = await prisma.keberangkatan.findUnique({
      where: { id },
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return row ? mapKeberangkatan(row) : null;
  },

  async create(data: Omit<Keberangkatan, "id" | "jamaahIds">) {
    const row = await prisma.keberangkatan.create({
      data: {
        kode: data.kode,
        kodeIndividu: data.kodeIndividu || data.kode,
        paketGrupId: data.paketGrupId,
        driveFolderIds: data.driveFolderIds ? (data.driveFolderIds as any) : undefined,
        paketUmrohId: data.paketUmrohId,
        tanggalBerangkat: new Date(data.tanggalBerangkat),
        tanggalPulang: new Date(data.tanggalPulang),
        nomorPenerbangan: data.nomorPenerbangan,
        status: data.status,
        terisi: data.terisi,
        maxSeat: data.maxSeat,
        targetMaterialisasi: data.targetMaterialisasi,
        maskapaiId: data.maskapaiId,
        hotelMekkahId: data.hotelMekkahId,
        hotelMadinahId: data.hotelMadinahId,
        startingPointId: data.startingPointId,
        packageTypeId: data.packageTypeId,
        namaPaket: data.namaPaket ?? "Legacy Package",
        hargaPaket: data.hargaPaket ?? 0,
        maskapai: data.maskapai ?? "TBA",
        hotelMekkah: data.hotelMekkah ?? "TBA",
        hotelMadinah: data.hotelMadinah ?? "TBA",
        kuota: data.kuota ?? data.maxSeat ?? 0,
        hotelOptions: [],
      },
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return mapKeberangkatan(row);
  },

  async update(id: string, data: Partial<Keberangkatan>) {
    const updateData: any = {};
    if (data.paketUmrohId !== undefined) updateData.paketUmrohId = data.paketUmrohId;
    if (data.tanggalBerangkat !== undefined) updateData.tanggalBerangkat = new Date(data.tanggalBerangkat);
    if (data.tanggalPulang !== undefined) updateData.tanggalPulang = new Date(data.tanggalPulang);
    if (data.nomorPenerbangan !== undefined) updateData.nomorPenerbangan = data.nomorPenerbangan;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.maxSeat !== undefined) updateData.maxSeat = data.maxSeat;
    if (data.targetMaterialisasi !== undefined) updateData.targetMaterialisasi = data.targetMaterialisasi;
    if (data.terisi !== undefined) updateData.terisi = data.terisi;
    if (data.maskapaiId !== undefined) updateData.maskapaiId = data.maskapaiId;
    if (data.hotelMekkahId !== undefined) updateData.hotelMekkahId = data.hotelMekkahId;
    if (data.hotelMadinahId !== undefined) updateData.hotelMadinahId = data.hotelMadinahId;
    if (data.startingPointId !== undefined) updateData.startingPointId = data.startingPointId;
    if (data.packageTypeId !== undefined) updateData.packageTypeId = data.packageTypeId;

    const row = await prisma.keberangkatan.update({
      where: { id },
      data: updateData,
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return mapKeberangkatan(row);
  },

  async delete(id: string) {
    const keberangkatan = await prisma.keberangkatan.findUnique({
      where: { id },
      include: { _count: { select: { groups: true } } },
    });
    
    if (!keberangkatan) throw new Error("Keberangkatan not found");
    if (keberangkatan._count.groups > 0) {
      throw new Error("Cannot delete package: There are already groups registered to this package.");
    }

    await prisma.keberangkatan.delete({
      where: { id },
    });
    
    return true;
  },

  async getForIntelligence(keberangkatanId: string) {
    return prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            pembayaran: true,
          },
        },
        roomings: true,
        manifests: true,
      },
    });
  },


  async getForFinalization(keberangkatanId: string) {
    return prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            invoices: true,
          },
        },
        roomings: { include: { kamar: { include: { penghuni: true } } } },
        manifests: true,
      },
    });
  },


  async getForManifestValidation(keberangkatanId: string) {
    const [row, hasRooming] = await Promise.all([
      prisma.keberangkatan.findUnique({
        where: { id: keberangkatanId },
        include: {
          groups: {
            include: {
              anggota: { include: { dokumen: true } },
              pembayaran: { where: { status: "verified" } },
            },
          },
        },
      }),
      prisma.rooming.findFirst({ where: { keberangkatanId } }),
    ]);
    return { row, hasRooming: !!hasRooming };
  },


  async getForReadiness(keberangkatanId: string) {
    return prisma.keberangkatan.findUnique({
      where: { id: keberangkatanId },
      include: {
        groups: {
          include: {
            anggota: { include: { dokumen: true } },
            pembayaran: true,
          },
        },
        roomings: true,
        manifests: true,
      },
    });
  },

  async countByPaketId(paketUmrohId: string) {
    return prisma.keberangkatan.count({
      where: { paketUmrohId },
    });
  },

};
