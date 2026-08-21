import { prisma } from "../db/client";
import { keberangkatanRepo } from "../repositories/keberangkatan.repository";
import type { 
  PackageIntelligence, 
  FinalizationResult, 
  PackageReadinessScore 
} from "@/shared/types";
import {
  generateKodeIndividu,
  generateKodeGrup,
  generateNamaPaket,
  generatePackageFolderName,
  getMonthFolderName,
} from "./package-code.service";
import { createPackageFolderHierarchy, validateFolderRegistry } from "../storage/google-drive";

export const packageService = {
  async findAll(params?: { status?: string; limit?: number; offset?: number }) {
    return keberangkatanRepo.findAll(params);
  },

  async findById(id: string) {
    return keberangkatanRepo.findById(id);
  },

  async create(data: any) {
    // 1. Resolve master codes for package type, starting point, airline, and route
    const [pkgType, startingPoint, airline, masterRoute] = await Promise.all([
      data.packageTypeId ? prisma.masterPackageType.findUnique({ where: { id: data.packageTypeId } }) : null,
      data.startingPointId ? prisma.masterCity.findUnique({ where: { id: data.startingPointId } }) : null,
      data.maskapaiId ? prisma.masterAirline.findUnique({ where: { id: data.maskapaiId } }) : null,
      data.landingPatternId ? prisma.masterRoute.findUnique({ where: { id: data.landingPatternId } }) : null,
    ]);

    const pCode = pkgType?.code || "REG";
    const sCode = startingPoint?.code || "JKT";
    const mCode = airline?.code || "SV";
    const rCode = masterRoute?.kode || "JED.C";
    const durasiHari = parseInt(data.durationDays || data.durasiHari || "9", 10);

    // Support single or multiple departure dates
    const departureDatesRaw: string[] = Array.isArray(data.departureDates) && data.departureDates.length > 0
      ? data.departureDates
      : [data.tanggalBerangkat || new Date().toISOString()];

    const departureDates = departureDatesRaw.map((d) => new Date(d));
    const firstDate = departureDates[0] || new Date();
    const year = firstDate.getFullYear();

    // 2. If multi-date or splitting individual parent package, create/link PaketGrup
    let paketGrupId: string | undefined = data.paketGrupId;
    let kodeGrup: string | undefined = data.kodeGrup;

    if (data.parentKeberangkatanId && !paketGrupId) {
      const parentKeb = await prisma.keberangkatan.findUnique({
        where: { id: data.parentKeberangkatanId },
      });

      if (parentKeb) {
        const finalKodeGrup = data.kodeGrup || generateKodeGrup({
          tahun: year,
          durasiHari,
          packageTypeCode: pCode,
          startingPointCode: sCode,
          maskapaiCode: mCode,
          tanggalList: departureDates,
        });
        kodeGrup = finalKodeGrup;

        let groupRecord = await prisma.paketGrup.findUnique({
          where: { kodeGrup: finalKodeGrup },
        });

        if (!groupRecord) {
          groupRecord = await prisma.paketGrup.create({
            data: {
              kodeGrup: finalKodeGrup,
              namaPaket: parentKeb.namaPaket || `${pCode} ${sCode} Group`,
            },
          });
        }
        paketGrupId = groupRecord.id;

        // Update parent to be part of this group
        await prisma.keberangkatan.update({
          where: { id: data.parentKeberangkatanId },
          data: { paketGrupId },
        });
      }
    } else if (!paketGrupId && departureDates.length > 1) {
      kodeGrup = generateKodeGrup({
        tahun: year,
        durasiHari,
        packageTypeCode: pCode,
        startingPointCode: sCode,
        maskapaiCode: mCode,
        tanggalList: departureDates,
      });

      let groupRecord = await prisma.paketGrup.findUnique({
        where: { kodeGrup },
      });

      if (!groupRecord) {
        groupRecord = await prisma.paketGrup.create({
          data: {
            kodeGrup,
            namaPaket: data.namaPaket || `${pCode} ${sCode} Group`,
          },
        });
      }
      paketGrupId = groupRecord.id;
    }

    // Resolve hotel names (for single or cluster mode)
    const hotelIdsToFetch = new Set<string>();
    if (data.hotelMekkahId) hotelIdsToFetch.add(data.hotelMekkahId);
    if (data.hotelMadinahId) hotelIdsToFetch.add(data.hotelMadinahId);
    if (data.isAdaKlaster === "ya" && data.clusterConfigs) {
      for (const cfg of Object.values(data.clusterConfigs as Record<string, any>)) {
        if (cfg.hotelMekkahId) hotelIdsToFetch.add(cfg.hotelMekkahId);
        if (cfg.hotelMadinahId) hotelIdsToFetch.add(cfg.hotelMadinahId);
      }
    }

    const fetchedHotels = hotelIdsToFetch.size > 0
      ? await prisma.masterHotel.findMany({ where: { id: { in: Array.from(hotelIdsToFetch) } } })
      : [];
    const hotelMap = new Map(fetchedHotels.map(h => [h.id, h.name]));

    const resolveHotel = (idOrName?: string) => {
      if (!idOrName || !idOrName.trim()) return "TBA";
      return hotelMap.get(idOrName) || idOrName;
    };

    let finalHotelMekkah = resolveHotel(data.hotelMekkahId || data.hotelMekkah);
    let finalHotelMadinah = resolveHotel(data.hotelMadinahId || data.hotelMadinah);
    let hotelOptionsArray: any[] = [];

    if (data.isAdaKlaster === "ya" && data.clusterConfigs) {
      // Filter out empty garbage clusters (e.g. K1, K2, K3, K4 with no hotel and no price)
      const validClusterEntries = Object.entries(data.clusterConfigs).filter(([, cfg]: [string, any]) => {
        if (!cfg) return false;
        const hMek = cfg.hotelMekkahId || cfg.hotelMekkah;
        const hMed = cfg.hotelMadinahId || cfg.hotelMadinah;
        const harga = Number(cfg.hargaBase || 0);
        return (hMek && hMek.trim() !== "") || (hMed && hMed.trim() !== "") || harga > 0;
      });

      const clusterIds = validClusterEntries.map(([cId]) => cId);
      const masterClusters = clusterIds.length > 0
        ? await prisma.masterCluster.findMany({ where: { id: { in: clusterIds } } })
        : [];
      const clusterMap = new Map(masterClusters.map(c => [c.id, c.nama]));

      hotelOptionsArray = validClusterEntries.map(([cId, cfg]: [string, any]) => {
        const cName = clusterMap.get(cId) || cfg.clusterName || cId;
        const hMek = resolveHotel(cfg.hotelMekkahId || cfg.hotelMekkah);
        const hMed = resolveHotel(cfg.hotelMadinahId || cfg.hotelMadinah);
        return {
          clusterId: cId,
          clusterName: cName,
          hotelMekkah: hMek,
          hotelMadinah: hMed,
          hargaBase: Number(cfg.hargaBase || 0),
          upgradeDouble: Number(cfg.upgradeDouble || 0),
          upgradeTriple: Number(cfg.upgradeTriple || 0),
        };
      });

      const mekkahNames = Array.from(new Set(hotelOptionsArray.map(o => o.hotelMekkah).filter(n => n && n !== "TBA")));
      const madinahNames = Array.from(new Set(hotelOptionsArray.map(o => o.hotelMadinah).filter(n => n && n !== "TBA")));

      if (mekkahNames.length > 0) finalHotelMekkah = mekkahNames.join(" / ");
      if (madinahNames.length > 0) finalHotelMadinah = madinahNames.join(" / ");
    } else {
      hotelOptionsArray = [{
        clusterName: "Reguler",
        hotelMekkah: finalHotelMekkah,
        hotelMadinah: finalHotelMadinah,
        hargaBase: Number(data.hargaBase || data.hargaPaket || 0),
      }];
    }

    // 3. Create Keberangkatan for each date
    const createdList = [];

    for (const depDate of departureDates) {
      const depYear = depDate.getFullYear();
      const retDate = new Date(depDate);
      retDate.setDate(retDate.getDate() + durasiHari - 1);

      const baseKodeIndividu = generateKodeIndividu({
        tahun: depYear,
        durasiHari,
        packageTypeCode: pCode,
        startingPointCode: sCode,
        maskapaiCode: mCode,
        tanggalBerangkat: depDate,
      });

      let kodeIndividu = baseKodeIndividu;
      const existingKeb = await prisma.keberangkatan.findFirst({
        where: { OR: [{ kode: kodeIndividu }, { kodeIndividu: kodeIndividu }] },
      });
      if (existingKeb) {
        let counter = 2;
        while (
          await prisma.keberangkatan.findFirst({
            where: {
              OR: [
                { kode: `${baseKodeIndividu}_V${counter}` },
                { kodeIndividu: `${baseKodeIndividu}_V${counter}` },
              ],
            },
          })
        ) {
          counter++;
        }
        kodeIndividu = `${baseKodeIndividu}_V${counter}`;
      }

      const formattedNamaPaket = generateNamaPaket({
        packageTypeCode: pCode,
        packageTypeName: pkgType?.name,
        durasiHari,
        startingPointCode: sCode,
        routeCode: rCode,
        tanggalBerangkat: depDate,
        maskapaiCode: mCode,
        maskapaiName: airline?.name || data.maskapai,
      });

      const folderName = generatePackageFolderName({
        startingPointCode: sCode,
        tanggalBerangkat: depDate,
        durasiHari,
        packageTypeCode: pCode,
        maskapaiCode: mCode,
      });

      const monthFolder = getMonthFolderName(depDate);

      // Create & validate Google Drive folder hierarchy for this package BEFORE DB creation
      const driveFolderIds = await createPackageFolderHierarchy(depYear, monthFolder, folderName);

      if (!validateFolderRegistry(driveFolderIds)) {
        throw new Error(
          `[PackageService Error] Gagal mem-provisioning folder Google Drive untuk paket "${formattedNamaPaket}". Kategori folder tidak lengkap.`
        );
      }

      const created = await keberangkatanRepo.create({
        kode: kodeIndividu,
        kodeIndividu,
        paketGrupId,
        driveFolderIds,
        namaPaket: departureDates.length > 1 ? formattedNamaPaket : (data.namaPaket || formattedNamaPaket),
        hargaPaket: parseInt(data.hargaBase || data.hargaPaket || "0", 10),
        tanggalBerangkat: depDate.toISOString(),
        tanggalPulang: retDate.toISOString(),
        maskapai: airline?.name || data.maskapai || "Saudia",
        maskapaiId: data.maskapaiId,
        nomorPenerbangan: data.nomorPenerbangan || "SV-816",
        hotelMekkah: finalHotelMekkah,
        hotelMekkahId: data.hotelMekkahId,
        hotelMadinah: finalHotelMadinah,
        hotelMadinahId: data.hotelMadinahId,
        startingPointId: data.startingPointId,
        packageTypeId: data.packageTypeId,
        kuota: parseInt(data.kapasitas || data.kuota || "45", 10),
        maxSeat: parseInt(data.kapasitas || data.maxSeat || "45", 10),
        targetMaterialisasi: parseInt(data.targetMaterialisasi || data.targetMaterialis || "30", 10),
        terisi: 0,
        status: "scheduled",
        durationDays: durasiHari,
        hotelOptions: hotelOptionsArray,
      } as any);

      createdList.push(created);
    }

    // 4. If pairedItems (parent seat adjustments) passed, update parent departure seat capacities!
    if (Array.isArray(data.pairedItems) && data.pairedItems.length > 0) {
      for (const pair of data.pairedItems) {
        if (pair.parentId && typeof pair.parentSeat === "number") {
          await prisma.keberangkatan.update({
            where: { id: pair.parentId },
            data: {
              kuota: pair.parentSeat,
              maxSeat: pair.parentSeat,
            },
          });
        }
      }
    }

    // 5. Trigger Telegram Broadcast (Async Background Notification)
    try {
      const { sendPackageBroadcast } = await import("./telegram-broadcast.service");
      await sendPackageBroadcast({
        packages: createdList,
        kodeGrup,
        flyerBase64List: Array.isArray(data.flyerBase64List)
          ? data.flyerBase64List
          : data.flyerBase64
          ? [data.flyerBase64]
          : [],
        startingPointCode: sCode,
        startingPointName: startingPoint?.name,
        customCaption: data.caption || data.customCaption || "",
      });
    } catch (telegramErr) {
      console.error("[PackageService] Gagal mengirim Telegram broadcast:", telegramErr);
    }

    return departureDates.length === 1 ? createdList[0] : createdList;
  },

  async update(id: string, data: any) {
    return keberangkatanRepo.update(id, data);
  },

  async updateWithAudit(id: string, data: any, user: { userId: string; userName: string; role: string }) {
    const before = await keberangkatanRepo.findById(id);
    const updated = await keberangkatanRepo.update(id, data);

    const changes: string[] = [];
    if (data.tanggalBerangkat) {
      const newDep = new Date(data.tanggalBerangkat).toISOString().split("T")[0];
      const oldDep = before?.tanggalBerangkat ? new Date(before.tanggalBerangkat).toISOString().split("T")[0] : "";
      if (newDep !== oldDep) changes.push(`Tgl Berangkat (${oldDep} -> ${newDep})`);
    }
    if (data.tanggalPulang) {
      const newRet = new Date(data.tanggalPulang).toISOString().split("T")[0];
      const oldRet = before?.tanggalPulang ? new Date(before.tanggalPulang).toISOString().split("T")[0] : "";
      if (newRet !== oldRet) changes.push(`Tgl Pulang (${oldRet} -> ${newRet})`);
    }
    if (data.nomorPenerbangan && before?.nomorPenerbangan !== data.nomorPenerbangan) {
      changes.push(`Flight No (${before?.nomorPenerbangan} -> ${data.nomorPenerbangan})`);
    }
    if (data.flightDetails?.rutePenerbangan) {
      changes.push(`Rute Flight (${data.flightDetails.rutePenerbangan})`);
    }
    if (data.tourLeader?.nama) {
      changes.push(`TL: ${data.tourLeader.nama}`);
    }
    if (data.muthowif?.nama) {
      changes.push(`Muthowif: ${data.muthowif.nama}`);
    }
    if (changes.length === 0) changes.push("Memperbarui detail operasional paket");

    const detailMsg = `Perubahan paket #${before?.kode || id} oleh ${user.userName}: ${changes.join(", ")}`;

    try {
      await prisma.auditEntry.create({
        data: {
          userId: user.userId || "system",
          userName: user.userName || "Admin Operasional",
          role: (user.role as any) || "super_admin",
          module: "keberangkatan",
          action: "EDIT_KEBERANGKATAN",
          detail: detailMsg,
          entityId: id,
          entityType: "Keberangkatan",
          before: JSON.stringify(before),
          after: JSON.stringify(updated),
        },
      });

      await prisma.activityEvent.create({
        data: {
          keberangkatanId: id,
          type: "info",
          message: detailMsg,
          module: "keberangkatan",
          triggeredBy: user.userName,
        },
      });
    } catch (auditErr) {
      console.error("Failed to record audit log:", auditErr);
    }

    return updated;
  },

  async delete(id: string) {
    return keberangkatanRepo.delete(id);
  },

  async getPackageIntelligence(keberangkatanId: string): Promise<PackageIntelligence | null> {
    const row = await keberangkatanRepo.getForIntelligence(keberangkatanId);
    if (!row) return null;

    const allJamaah = row.groups.flatMap((g: any) => g.anggota);
    const unpaidCount = row.groups.reduce((sum: number, g: any) => sum + (g.sisaPembayaran > 0 ? 1 : 0), 0);
    const dokumenPending = allJamaah.filter((j: any) => j.dokumen.some((d: any) => d.status !== "verified" && d.status !== "lengkap")).length;
    const roomingIncomplete = row.roomings.filter((r: any) => r.status !== "final").length;
    const manifestIncomplete = row.manifests.filter((m: any) => m.status !== "final" && m.status !== "submitted").length;
    const warningCount = [unpaidCount > 0 ? 1 : 0, dokumenPending > 0 ? 1 : 0, roomingIncomplete > 0 ? 1 : 0, manifestIncomplete > 0 ? 1 : 0].filter(Boolean).length;

    return {
      totalJamaah: allJamaah.length,
      unpaidCount,
      dokumenPending,
      roomingIncomplete,
      manifestIncomplete,
      warningCount,
      readinessBreakdown: row.groups.reduce((acc: Record<string, number>, g: any) => {
        acc[g.kodeRegistrasi] = g.sisaPembayaran <= 0 ? 1 : 0;
        return acc;
      }, {}),
    };
  },

  async getFinalizationResult(keberangkatanId: string): Promise<FinalizationResult> {
    const row = await keberangkatanRepo.getForFinalization(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const checks: any[] = [
      {
        key: "all_lunas",
        label: "Semua jamaah lunas",
        passed: row.groups.every((g: any) => g.sisaPembayaran <= 0),
        blocking: true,
        detail: row.groups.filter((g: any) => g.sisaPembayaran > 0).map((g: any) => `${g.kodeRegistrasi}: sisa ${g.sisaPembayaran}`).join("; ") || undefined,
      },
      {
        key: "dokumen_verified",
        label: "Dokumen semua jamaah terverifikasi",
        passed: row.groups.every((g: any) => g.anggota.every((a: any) => a.dokumen.filter((d: any) => d.wajib).every((d: any) => d.status === "verified" || d.status === "lengkap"))),
        blocking: true,
      },
      {
        key: "manifest_final",
        label: "Manifest sudah final",
        passed: row.manifests.length > 0 && row.manifests.every((m: any) => m.status === "final" || m.status === "submitted"),
        blocking: true,
      },
      {
        key: "rooming_final",
        label: "Rooming sudah final",
        passed: row.roomings.length > 0 && row.roomings.every((r: any) => r.status === "final"),
        blocking: false,
      },
      {
        key: "kuota_terpenuhi",
        label: "Kuota terpenuhi",
        passed: row.terisi >= row.kuota,
        blocking: false,
        detail: `${row.terisi}/${row.kuota} terisi`,
      },
    ];

    const blockingCount = checks.filter((c: any) => !c.passed && c.blocking).length;
    return {
      canFinalize: checks.every((c: any) => c.passed || !c.blocking),
      checks,
      blockingCount,
      totalCount: checks.length,
    };
  },

  async getManifestValidation(keberangkatanId: string): Promise<{
    canFinalize: boolean;
    blockers: { label: string; count: number; detail: string }[];
    warnings: { label: string; count: number; detail: string }[];
  }> {
    const { row, hasRooming } = await keberangkatanRepo.getForManifestValidation(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const blockers: { label: string; count: number; detail: string }[] = [];
    const warnings: { label: string; count: number; detail: string }[] = [];
    const allJamaah = row.groups.flatMap((g: any) => g.anggota);

    const unpaidJamaah = row.groups.filter((g: any) => g.sisaPembayaran > 0).flatMap((g: any) => g.anggota);
    if (unpaidJamaah.length > 0) {
      blockers.push({ label: "Unpaid Jamaah", count: unpaidJamaah.length, detail: `${unpaidJamaah.length} jamaah in groups with outstanding balance` });
    }

    const missingPassport = allJamaah.filter((j: any) => !j.dokumen.some((d: any) => d.jenis === "paspor" && (d.status === "verified" || d.status === "lengkap")));
    if (missingPassport.length > 0) {
      blockers.push({ label: "Missing Verified Passport", count: missingPassport.length, detail: `${missingPassport.length} jamaah without verified passport` });
    }

    const incompleteDocs = allJamaah.filter((j: any) => j.dokumen.filter((d: any) => d.wajib).some((d: any) => d.status !== "verified" && d.status !== "lengkap"));
    if (incompleteDocs.length > 0) {
      warnings.push({ label: "Incomplete Documents", count: incompleteDocs.length, detail: `${incompleteDocs.length} jamaah with incomplete required documents` });
    }

    if (!hasRooming) {
      warnings.push({ label: "No Rooming Assignment", count: allJamaah.length, detail: "Rooming has not been generated for this departure" });
    }

    return {
      canFinalize: blockers.length === 0,
      blockers,
      warnings,
    };
  },

  async getReadinessScore(keberangkatanId: string): Promise<PackageReadinessScore> {
    const row = await keberangkatanRepo.getForReadiness(keberangkatanId);
    if (!row) throw new Error("Keberangkatan not found");

    const allJamaah = row.groups.flatMap((g: any) => g.anggota);
    const totalJamaah = allJamaah.length || 1;

    const paymentScore = row.groups.reduce((sum: number, g: any) => sum + (g.totalTagihan > 0 ? g.totalPembayaran / g.totalTagihan : 1), 0) / (row.groups.length || 1) * 100;
    const documentScore = allJamaah.filter((j: any) => j.dokumen.filter((d: any) => d.wajib).every((d: any) => d.status === "verified" || d.status === "lengkap")).length / totalJamaah * 100;
    const manifestScore = row.manifests.length > 0 ? (row.manifests.filter((m: any) => m.status === "final" || m.status === "submitted").length / row.manifests.length) * 100 : 0;
    const roomingScore = row.roomings.length > 0 ? (row.roomings.filter((r: any) => r.status === "final").length / row.roomings.length) * 100 : 0;
    const operationalScore = row.status === "ready" || row.status === "departed" ? 100 : row.status === "preparing" ? 50 : 0;

    const scores = [
      { label: "Pembayaran", score: paymentScore, weight: 30 },
      { label: "Dokumen", score: documentScore, weight: 25 },
      { label: "Manifest", score: manifestScore, weight: 20 },
      { label: "Rooming", score: roomingScore, weight: 15 },
      { label: "Operasional", score: operationalScore, weight: 10 },
    ];

    const overallScore = scores.reduce((sum: number, s: any) => sum + (s.score * s.weight) / 100, 0);

    return {
      overallScore: Math.round(overallScore),
      paymentScore: Math.round(paymentScore),
      documentScore: Math.round(documentScore),
      manifestScore: Math.round(manifestScore),
      roomingScore: Math.round(roomingScore),
      operationalScore: Math.round(operationalScore),
      breakdown: scores.map((s: any) => ({ ...s, score: Math.round(s.score) })),
    };
  }
};
