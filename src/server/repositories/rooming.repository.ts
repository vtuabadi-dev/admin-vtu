import { prisma } from "@/server/db/client";
import type { Rooming, Kamar, PenghuniKamar, HotelCombinationSummary } from "@/shared/types";

function mapRooming(row: any): Rooming {
  return {
    id: row.id,
    keberangkatanId: row.keberangkatanId,
    hotelMekkah: row.hotelMekkah,
    hotelMadinah: row.hotelMadinah,
    hotelNama: row.hotelNama,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    kamar: (row.kamar ?? []).map(mapKamar),
  };
}

function mapKamar(k: any): Kamar {
  return {
    id: k.id,
    roomingId: k.roomingId,
    nomorKamar: k.nomorKamar,
    tipe: k.tipe,
    lantai: k.lantai,
    penghuni: (k.penghuni ?? []).map(mapPenghuni),
    mixLabel: k.mixLabel ?? undefined,
  };
}

function mapPenghuni(p: any): PenghuniKamar {
  return {
    jamaahId: p.jamaahId,
    namaLengkap: p.namaLengkap,
    jenisKelamin: p.jenisKelamin,
    isPasangan: p.isPasangan ?? false,
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const roomingRepo = {
  async findAll(params?: { keberangkatanId?: string; status?: string }) {
    const where: any = {};
    if (params?.keberangkatanId) where.keberangkatanId = params.keberangkatanId;
    if (params?.status) where.status = params.status;

    const rows = await prisma.rooming.findMany({
      where,
      include: { kamar: { include: { penghuni: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRooming);
  },

  async findById(id: string) {
    const row = await prisma.rooming.findUnique({ where: { id }, include: { kamar: { include: { penghuni: true } } } });
    return row ? mapRooming(row) : null;
  },

  async findByKeberangkatan(keberangkatanId: string) {
    const rows = await prisma.rooming.findMany({
      where: { keberangkatanId },
      include: { kamar: { include: { penghuni: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRooming);
  },

  async create(data: Omit<Rooming, "id" | "createdAt" | "kamar"> & { kamar: (Omit<Kamar, "id" | "roomingId" | "penghuni"> & { penghuni: Omit<PenghuniKamar, "">[] })[] }) {
    const row = await prisma.rooming.create({
      data: {
        keberangkatanId: data.keberangkatanId,
        hotelMekkah: data.hotelMekkah,
        hotelMadinah: data.hotelMadinah,
        hotelNama: data.hotelNama,
        status: data.status,
        kamar: {
          create: data.kamar.map((k) => ({
            nomorKamar: k.nomorKamar,
            tipe: k.tipe,
            lantai: k.lantai,
            mixLabel: k.mixLabel ?? null,
            penghuni: {
              create: k.penghuni.map((p) => ({
                jamaahId: p.jamaahId,
                namaLengkap: p.namaLengkap,
                jenisKelamin: p.jenisKelamin,
                isPasangan: p.isPasangan ?? false,
              })),
            },
          })),
        },
      },
      include: { kamar: { include: { penghuni: true } } },
    });
    return mapRooming(row);
  },

  async finalize(id: string) {
    const row = await prisma.rooming.update({
      where: { id },
      data: { status: "final", updatedAt: new Date() },
      include: { kamar: { include: { penghuni: true } } },
    });
    return mapRooming(row);
  },

  async getHotelCombinations(keberangkatanId: string): Promise<HotelCombinationSummary[]> {
    const jamaah = await prisma.jamaah.findMany({
      where: {
        group: { paketKeberangkatanId: keberangkatanId },
        status: { not: "batal" },
      },
      select: { id: true, hotelMekkah: true, hotelMadinah: true },
    });

    const comboMap = new Map<string, { hotelMekkah: string; hotelMadinah: string; jamaahIds: string[] }>();
    for (const j of jamaah) {
      const key = `${j.hotelMekkah}|||${j.hotelMadinah}`;
      if (!comboMap.has(key)) {
        comboMap.set(key, { hotelMekkah: j.hotelMekkah, hotelMadinah: j.hotelMadinah, jamaahIds: [] });
      }
      comboMap.get(key)!.jamaahIds.push(j.id);
    }

    return Array.from(comboMap.values()).map((c) => ({
      hotelMekkah: c.hotelMekkah,
      hotelMadinah: c.hotelMadinah,
      label: `${c.hotelMekkah} — ${c.hotelMadinah}`,
      jumlahJamaah: c.jamaahIds.length,
      jamaahIds: c.jamaahIds,
    }));
  },
};
