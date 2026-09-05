import { prisma } from "@/server/db/client";
import type { Keberangkatan } from "@/shared/types";
import { purgePackageStorageFolder } from "@/server/storage/google-drive";

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

  const activePaxCount = (row.groups as any[])?.reduce(
    (sum: number, g: any) => sum + (g.anggota?.length || 0),
    0
  ) ?? row.terisi ?? 0;

  if (row.id && row.terisi !== activePaxCount) {
    prisma.keberangkatan.update({
      where: { id: row.id },
      data: { terisi: activePaxCount },
    }).catch(() => {});
  }

  return {
    id: row.id,
    kode: row.kodeIndividu || row.kode,
    paketUmrohId: row.paketUmrohId ?? "",
    status: row.status,
    terisi: activePaxCount,
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
    parentKeberangkatanId: row.parentKeberangkatanId ?? undefined,
    splitReason: row.splitReason ?? undefined,
    splitLabel: row.splitLabel ?? undefined,
    promoLabel: row.promoLabel ?? undefined,
    driveFolderIds: row.driveFolderIds ?? undefined,
    hotelOptions: parsedHotelOptions,
  };
}

const DEFAULT_INCLUDE = {
  maskapaiMaster: true,
  hotelMekkahMaster: true,
  hotelMadinahMaster: true,
  groups: {
    include: {
      anggota: {
        where: { status: { not: "batal" as any } },
        select: { id: true },
      },
    },
  },
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
        parentKeberangkatanId: data.parentKeberangkatanId,
        splitReason: data.splitReason,
        splitLabel: data.splitLabel,
        promoLabel: data.promoLabel,
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
    if (data.paketGrupId !== undefined) updateData.paketGrupId = data.paketGrupId;
    if (data.parentKeberangkatanId !== undefined) updateData.parentKeberangkatanId = data.parentKeberangkatanId;
    if (data.splitReason !== undefined) updateData.splitReason = data.splitReason;
    if (data.splitLabel !== undefined) updateData.splitLabel = data.splitLabel;
    if (data.promoLabel !== undefined) updateData.promoLabel = data.promoLabel;
    if (data.tanggalBerangkat !== undefined) updateData.tanggalBerangkat = new Date(data.tanggalBerangkat);
    if (data.tanggalPulang !== undefined) updateData.tanggalPulang = new Date(data.tanggalPulang);
    if (data.nomorPenerbangan !== undefined) updateData.nomorPenerbangan = data.nomorPenerbangan;
    if (data.maxSeat !== undefined) {
      updateData.maxSeat = data.maxSeat;
      updateData.kuota = data.maxSeat;
    }
    if (data.kuota !== undefined) {
      updateData.kuota = data.kuota;
      if (updateData.maxSeat === undefined) updateData.maxSeat = data.kuota;
    }
    if (data.targetMaterialisasi !== undefined) updateData.targetMaterialisasi = data.targetMaterialisasi;
    if (data.terisi !== undefined) updateData.terisi = data.terisi;
    if (data.maskapaiId !== undefined) updateData.maskapaiId = data.maskapaiId;
    if (data.hotelMekkahId !== undefined) updateData.hotelMekkahId = data.hotelMekkahId;
    if (data.hotelMadinahId !== undefined) updateData.hotelMadinahId = data.hotelMadinahId;
    if (data.startingPointId !== undefined) updateData.startingPointId = data.startingPointId;
    if (data.packageTypeId !== undefined) updateData.packageTypeId = data.packageTypeId;
    if (data.include !== undefined) updateData.include = data.include;
    if (data.exclude !== undefined) updateData.exclude = data.exclude;

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
      include: {
        groups: {
          include: {
            anggota: true,
          },
        },
      },
    });

    if (!keberangkatan) {
      throw new Error("Paket keberangkatan tidak ditemukan.");
    }

    const activeJamaahCount = keberangkatan.groups.reduce((sum, group) => {
      const activeInGroup = group.anggota.filter((a: any) => a.status !== "batal");
      return sum + activeInGroup.length;
    }, 0);

    if (activeJamaahCount > 0) {
      throw new Error(
        `Tidak dapat menghapus paket: Masih terdapat ${activeJamaahCount} jamaah aktif terdaftar pada paket ini. Pindahkan atau batalkan jamaah terlebih dahulu.`
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const groupIds = keberangkatan.groups.map((g) => g.id);
        const allJamaahInPackage = keberangkatan.groups.flatMap((g) => g.anggota);
        const jamaahIds = allJamaahInPackage.map((a) => a.id);

        // 1. Unlink package draft if published from this package
        await tx.packageDraft.updateMany({
          where: { publishedId: id },
          data: { publishedId: null },
        }).catch(() => {});

        // 2. Hard delete activity events, auto deadlines, registration requests, roomings, and manifests in parallel
        await Promise.all([
          tx.activityEvent.deleteMany({ where: { keberangkatanId: id } }).catch(() => {}),
          tx.autoDeadline.deleteMany({ where: { keberangkatanId: id } }).catch(() => {}),
          tx.registrationRequest.deleteMany({ where: { paketId: id } }).catch(() => {}),
          tx.rooming.deleteMany({ where: { keberangkatanId: id } }).catch(() => {}),
          tx.manifest.deleteMany({ where: { keberangkatanId: id } }).catch(() => {}),
        ]);

        // 3. Hard delete groups and jamaah records if any exist
        if (groupIds.length > 0) {
          // Break circular FK deadlock: reassign ketuaGroupId to a safe external Jamaah or temporary dummy Jamaah
          let safeJamaah = await tx.jamaah.findFirst({
            where: { id: { notIn: jamaahIds } },
            select: { id: true },
          });

          let tempJamaahCreatedId: string | null = null;

          if (!safeJamaah) {
            const tempGroup = await tx.registrationGroup.findFirst({
              where: { id: { notIn: groupIds } },
            });

            if (tempGroup) {
              const temp = await tx.jamaah.create({
                data: {
                  registrationId: `TEMP-${Date.now()}`,
                  groupId: tempGroup.id,
                  nomorPeserta: `TEMP-${Date.now()}`,
                  namaLengkap: "TEMP_CLEANUP",
                  namaAyah: "-",
                  jenisKelamin: "L" as any,
                  tempatLahir: "-",
                  tanggalLahir: new Date(),
                  nik: "0000000000000000",
                  nomorPaspor: "-",
                  masaBerlakuPaspor: new Date(),
                  nomorTelepon: "-",
                  email: "temp@clean.local",
                  alamat: "-",
                  provinsi: "-",
                  kota: "-",
                  kecamatan: "-",
                  kelurahan: "-",
                  hotelMekkah: "-",
                  hotelMadinah: "-",
                  status: "batal" as any,
                },
              });
              safeJamaah = { id: temp.id };
              tempJamaahCreatedId = temp.id;
            }
          }

          if (safeJamaah) {
            await tx.registrationGroup.updateMany({
              where: { id: { in: groupIds } },
              data: { ketuaGroupId: safeJamaah.id },
            });
          }

          if (jamaahIds.length > 0) {
            await Promise.all([
              tx.dokumenItem.deleteMany({ where: { jamaahId: { in: jamaahIds } } }),
              tx.manifestRow.deleteMany({ where: { jamaahId: { in: jamaahIds } } }),
              tx.penghuniKamar.deleteMany({ where: { jamaahId: { in: jamaahIds } } }),
              tx.alokasiPembayaran.deleteMany({ where: { jamaahId: { in: jamaahIds } } }),
            ]);

            await tx.jamaah.deleteMany({
              where: { id: { in: jamaahIds } },
            });
          }

          await Promise.all([
            tx.invoiceItem.deleteMany({ where: { invoice: { groupId: { in: groupIds } } } }),
            tx.invoice.deleteMany({ where: { groupId: { in: groupIds } } }),
            tx.pembayaran.deleteMany({ where: { groupId: { in: groupIds } } }),
            tx.invoiceSplitConfig.deleteMany({ where: { groupId: { in: groupIds } } }).catch(() => {}),
            tx.reminder.deleteMany({ where: { groupId: { in: groupIds } } }).catch(() => {}),
          ]);

          await tx.registrationGroup.deleteMany({
            where: { id: { in: groupIds } },
          });

          if (tempJamaahCreatedId) {
            await tx.jamaah.delete({ where: { id: tempJamaahCreatedId } }).catch(() => {});
          }
        }

        // 4. Hard delete the Keberangkatan package itself
        await tx.keberangkatan.delete({
          where: { id },
        });
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );

    // 5. Hard purge cloud storage folder for this departure package if provisioned
    if (keberangkatan.driveFolderIds) {
      try {
        await purgePackageStorageFolder(keberangkatan.driveFolderIds);
      } catch (storageErr) {
        console.error(`[Package Delete Storage Purge Error] Failed to purge storage folder for package ${id}:`, storageErr);
      }
    }

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

      // Format Individual / Single-Date Packages (all individual departures)
      const individualList = allKeberangkatan.map((k) => {
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
