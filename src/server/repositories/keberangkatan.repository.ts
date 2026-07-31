import { prisma } from "@/server/db/client";
import type { Keberangkatan } from "@/shared/types";

function mapKeberangkatan(row: any): Keberangkatan {
  const maskapaiName = row.maskapaiMaster?.name || (row.maskapai && !row.maskapai.startsWith("cm") ? row.maskapai : undefined) || "Saudia";
  
  let mekkahName = row.hotelMekkahMaster?.name || row.hotelMekkah;
  if (!mekkahName || (typeof mekkahName === "string" && mekkahName.startsWith("cm") && mekkahName.length > 20)) {
    mekkahName = "TBA";
  }

  let madinahName = row.hotelMadinahMaster?.name || row.hotelMadinah;
  if (!madinahName || (typeof madinahName === "string" && madinahName.startsWith("cm") && madinahName.length > 20)) {
    madinahName = "TBA";
  }

  let parsedHotelOptions = row.hotelOptions;
  if (typeof parsedHotelOptions === "string") {
    try {
      parsedHotelOptions = JSON.parse(parsedHotelOptions);
    } catch {
      parsedHotelOptions = [];
    }
  }
  if (!Array.isArray(parsedHotelOptions)) {
    parsedHotelOptions = [];
  }

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
    maskapai: maskapaiName,
    hotelMekkah: mekkahName,
    hotelMadinah: madinahName,
    kuota: row.kuota ?? row.maxSeat ?? 0,
    tanggalBerangkat: row.tanggalBerangkat?.toISOString() ?? new Date().toISOString(),
    tanggalPulang: row.tanggalPulang?.toISOString() ?? new Date().toISOString(),
    nomorPenerbangan: row.nomorPenerbangan ?? "-",
    kodeIndividu: row.kodeIndividu ?? undefined,
    paketGrupId: row.paketGrupId ?? undefined,
    driveFolderIds: row.driveFolderIds ?? undefined,
    hotelOptions: parsedHotelOptions,
  };
}

const DEFAULT_INCLUDE = {
  maskapaiMaster: true,
  hotelMekkahMaster: true,
  hotelMadinahMaster: true,
  groups: { include: { anggota: { select: { id: true } } } },
};

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
        include: DEFAULT_INCLUDE,
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
      include: DEFAULT_INCLUDE,
    });
    return row ? mapKeberangkatan(row) : null;
  },

  async create(data: any) {
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
        hotelOptions: data.hotelOptions ? (data.hotelOptions as any) : [],
      },
      include: DEFAULT_INCLUDE,
    });
    return mapKeberangkatan(row);
  },

  async update(id: string, data: Partial<Keberangkatan> & Record<string, any>) {
    const updateData: any = {};
    if (data.namaPaket !== undefined) updateData.namaPaket = data.namaPaket;
    if (data.hargaPaket !== undefined) updateData.hargaPaket = data.hargaPaket;
    if (data.maskapai !== undefined) updateData.maskapai = data.maskapai;
    if (data.hotelMekkah !== undefined) updateData.hotelMekkah = data.hotelMekkah;
    if (data.hotelMadinah !== undefined) updateData.hotelMadinah = data.hotelMadinah;
    if (data.hotelOptions !== undefined) updateData.hotelOptions = data.hotelOptions;
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

    if (data.driveFolderIds !== undefined || data.tourLeader !== undefined || data.muthowif !== undefined || data.flightDetails !== undefined) {
      const existing = await prisma.keberangkatan.findUnique({ where: { id }, select: { driveFolderIds: true } });
      const currentMeta = (existing?.driveFolderIds as any) || {};
      const newMeta = {
        ...currentMeta,
        ...(data.driveFolderIds && typeof data.driveFolderIds === "object" ? data.driveFolderIds : {}),
      };
      if (data.tourLeader !== undefined) newMeta.tourLeader = data.tourLeader;
      if (data.muthowif !== undefined) newMeta.muthowif = data.muthowif;
      if (data.flightDetails !== undefined) newMeta.flightDetails = data.flightDetails;
      updateData.driveFolderIds = newMeta;
    }

    const row = await prisma.keberangkatan.update({
      where: { id },
      data: updateData,
      include: DEFAULT_INCLUDE,
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

  async findExistingGroupsForSplit() {
    try {
      const allKeberangkatan = await prisma.keberangkatan.findMany({
        include: {
          startingPoint: true,
          maskapaiMaster: true,
          packageType: true,
        },
        orderBy: { tanggalBerangkat: "asc" },
      });

      // Group items by paketGrupId (for grouped packages)
      const groupMap = new Map<string, typeof allKeberangkatan>();
      const standaloneList: typeof allKeberangkatan = [];

      for (const k of allKeberangkatan) {
        if (k.paketGrupId) {
          if (!groupMap.has(k.paketGrupId)) {
            groupMap.set(k.paketGrupId, []);
          }
          groupMap.get(k.paketGrupId)!.push(k);
        } else {
          standaloneList.push(k);
        }
      }

      // Format Grouped Packages
      const groupList: any[] = [];
      for (const [groupId, items] of Array.from(groupMap.entries())) {
        if (!items || items.length === 0) continue;
        const firstK = items[0]!;
        const startingName = firstK.startingPoint?.name || 
          (firstK.namaPaket.includes("SURABAYA") || firstK.namaPaket.includes("SBY") ? "Surabaya" :
           firstK.namaPaket.includes("SOLO") || firstK.namaPaket.includes("SOC") ? "Solo" : "Jakarta");

        const dates = items.map((k: any) => k.tanggalBerangkat.toISOString().split("T")[0]!);

        groupList.push({
          id: groupId,
          type: "group",
          kodeGrup: firstK.kode.startsWith("#") ? firstK.kode : (firstK.kodeIndividu || firstK.kode),
          namaPaket: firstK.namaPaket.split("-")[0]?.trim() || firstK.namaPaket,
          startingCity: startingName,
          startingPointId: firstK.startingPointId,
          dateCount: items.length,
          dates,
          totalCapacity: items.reduce((sum: number, k: any) => sum + (k.kuota || k.maxSeat || 45), 0),
          items: items.map((k: any) => ({
            id: k.id,
            kode: k.kode,
            namaPaket: k.namaPaket,
            date: k.tanggalBerangkat.toISOString().split("T")[0]!,
            seat: k.kuota || k.maxSeat || 45,
          })),
        });
      }

      // Format Individual / Standalone Packages
      const individualList = standaloneList.map((k) => {
        const dateStr = k.tanggalBerangkat.toISOString().split("T")[0]!;
        const startingName = k.startingPoint?.name || 
          (k.namaPaket.includes("SURABAYA") || k.namaPaket.includes("SBY") ? "Surabaya" :
           k.namaPaket.includes("SOLO") || k.namaPaket.includes("SOC") ? "Solo" : "Jakarta");

        return {
          id: k.id,
          keberangkatanId: k.id,
          type: "individual",
          kodeGrup: k.kodeIndividu || k.kode,
          namaPaket: k.namaPaket,
          startingCity: startingName,
          startingPointId: k.startingPointId,
          dateCount: 1,
          dates: [dateStr],
          totalCapacity: k.kuota || k.maxSeat || 45,
          items: [
            {
              id: k.id,
              kode: k.kode,
              namaPaket: k.namaPaket,
              date: dateStr,
              seat: k.kuota || k.maxSeat || 45,
            },
          ],
        };
      });

      return {
        groups: groupList,
        individuals: individualList,
      };
    } catch (error) {
      console.error("[findExistingGroupsForSplit error]", error);
      return { groups: [], individuals: [] };
    }
  },
};
