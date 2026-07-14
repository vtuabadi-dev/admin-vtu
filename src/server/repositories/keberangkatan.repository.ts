import { prisma } from "@/server/db/client";
import type { Keberangkatan } from "@/shared/types";

function mapKeberangkatan(row: any): Keberangkatan {
  return {
    id: row.id,
    kode: row.kode,
    namaPaket: row.namaPaket,
    hargaPaket: row.hargaPaket,
    tanggalBerangkat: row.tanggalBerangkat.toISOString(),
    tanggalPulang: row.tanggalPulang.toISOString(),
    maskapai: row.maskapai,
    nomorPenerbangan: row.nomorPenerbangan,
    hotelMekkah: row.hotelMekkah,
    hotelMadinah: row.hotelMadinah,
    hotelOptions: (row.hotelOptions as Keberangkatan["hotelOptions"]) ?? [],
    status: row.status,
    kuota: row.kuota,
    terisi: row.terisi,
    jamaahIds: (row.groups as any[])?.flatMap((g: any) => g.anggota?.map((a: any) => a.id) ?? []) ?? [],
    maskapaiId: row.maskapaiId ?? undefined,
    hotelMekkahId: row.hotelMekkahId ?? undefined,
    hotelMadinahId: row.hotelMadinahId ?? undefined,
    startingPointId: row.startingPointId ?? undefined,
    packageTypeId: row.packageTypeId ?? undefined,
    pricingMode: row.pricingMode ?? undefined,
    durationDays: row.durationDays ?? undefined,
    promoText: row.promoText ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    include: row.include ?? undefined,
    exclude: row.exclude ?? undefined,
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
        namaPaket: data.namaPaket,
        hargaPaket: data.hargaPaket,
        tanggalBerangkat: new Date(data.tanggalBerangkat),
        tanggalPulang: new Date(data.tanggalPulang),
        maskapai: data.maskapai,
        nomorPenerbangan: data.nomorPenerbangan,
        hotelMekkah: data.hotelMekkah,
        hotelMadinah: data.hotelMadinah,
        hotelOptions: data.hotelOptions,
        status: data.status,
        kuota: data.kuota,
        terisi: data.terisi,
        maskapaiId: data.maskapaiId,
        hotelMekkahId: data.hotelMekkahId,
        hotelMadinahId: data.hotelMadinahId,
        startingPointId: data.startingPointId,
        packageTypeId: data.packageTypeId,
        pricingMode: data.pricingMode,
        durationDays: data.durationDays,
        promoText: data.promoText,
        description: data.description,
        notes: data.notes,
        include: data.include,
        exclude: data.exclude,
      },
      include: { groups: { include: { anggota: { select: { id: true } } } } },
    });
    return mapKeberangkatan(row);
  },

  async update(id: string, data: Partial<Keberangkatan>) {
    const updateData: any = {};
    if (data.namaPaket !== undefined) updateData.namaPaket = data.namaPaket;
    if (data.hargaPaket !== undefined) updateData.hargaPaket = data.hargaPaket;
    if (data.tanggalBerangkat !== undefined) updateData.tanggalBerangkat = new Date(data.tanggalBerangkat);
    if (data.tanggalPulang !== undefined) updateData.tanggalPulang = new Date(data.tanggalPulang);
    if (data.maskapai !== undefined) updateData.maskapai = data.maskapai;
    if (data.nomorPenerbangan !== undefined) updateData.nomorPenerbangan = data.nomorPenerbangan;
    if (data.hotelOptions !== undefined) updateData.hotelOptions = data.hotelOptions;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.kuota !== undefined) updateData.kuota = data.kuota;
    if (data.terisi !== undefined) updateData.terisi = data.terisi;
    if (data.maskapaiId !== undefined) updateData.maskapaiId = data.maskapaiId;
    if (data.hotelMekkahId !== undefined) updateData.hotelMekkahId = data.hotelMekkahId;
    if (data.hotelMadinahId !== undefined) updateData.hotelMadinahId = data.hotelMadinahId;
    if (data.startingPointId !== undefined) updateData.startingPointId = data.startingPointId;
    if (data.packageTypeId !== undefined) updateData.packageTypeId = data.packageTypeId;
    if (data.pricingMode !== undefined) updateData.pricingMode = data.pricingMode;
    if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;
    if (data.promoText !== undefined) updateData.promoText = data.promoText;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.include !== undefined) updateData.include = data.include;
    if (data.exclude !== undefined) updateData.exclude = data.exclude;

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


};
