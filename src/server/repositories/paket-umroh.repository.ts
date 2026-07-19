import { prisma } from "@/server/db/client";
import type { PaketUmroh, CreatePackageInput, UpdatePackageInput } from "@/shared/types";

function mapPaketUmroh(row: any): PaketUmroh {
  return {
    id: row.id,
    namaPaket: row.namaPaket,
    deskripsi: row.deskripsi,
    hargaBase: row.hargaBase,
    durasiHari: row.durasiHari,
    hotelMekkahOptions: row.hotelMekkahOptions as string[],
    hotelMadinahOptions: row.hotelMadinahOptions as string[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const paketUmrohRepo = {
  async findAll() {
    const rows = await prisma.paketUmroh.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapPaketUmroh);
  },

  async findById(id: string) {
    const row = await prisma.paketUmroh.findUnique({
      where: { id },
    });
    return row ? mapPaketUmroh(row) : null;
  },

  async create(data: CreatePackageInput) {
    const row = await prisma.paketUmroh.create({
      data: {
        namaPaket: data.namaPaket,
        deskripsi: data.deskripsi,
        hargaBase: data.hargaBase,
        durasiHari: data.durasiHari,
        hotelMekkahOptions: data.hotelMekkahOptions ?? [],
        hotelMadinahOptions: data.hotelMadinahOptions ?? [],
      },
    });
    return mapPaketUmroh(row);
  },

  async update(id: string, data: UpdatePackageInput) {
    const row = await prisma.paketUmroh.update({
      where: { id },
      data: {
        namaPaket: data.namaPaket,
        deskripsi: data.deskripsi,
        hargaBase: data.hargaBase,
        durasiHari: data.durasiHari,
        hotelMekkahOptions: data.hotelMekkahOptions,
        hotelMadinahOptions: data.hotelMadinahOptions,
      },
    });
    return mapPaketUmroh(row);
  },

  async delete(id: string) {
    await prisma.paketUmroh.delete({
      where: { id },
    });
    return true;
  }
};
