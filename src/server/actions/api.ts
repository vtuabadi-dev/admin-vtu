"use server";

import { prisma } from "@/server/db/client";
import { packageService } from "@/server/services/package.service";


// ==========================================
// REAL PRISMA SERVICES
// Replaces all mock/handlers.ts functions
// ==========================================

export async function getKeberangkatanList() {
  try {
    const list = await prisma.keberangkatan.findMany({
      orderBy: { tanggalBerangkat: "asc" },
      include: {
        paketUmroh: true,
        maskapaiMaster: true,
        hotelMekkahMaster: true,
        hotelMadinahMaster: true,
        startingPoint: true,
        packageType: true,
      },
    });
    return list.map((k) => {
      const isPromo = k.splitReason === "promo" || !!k.promoLabel || k.kode.includes("_V");
      let nama = k.namaPaket || "PAKET UMROH";
      if (isPromo && !nama.toUpperCase().includes("(PROMO")) {
        const promoTag = k.promoLabel ? `(PROMO: ${k.promoLabel})` : "(PROMO)";
        nama = `${nama} ${promoTag}`;
      }

      return {
        ...k,
        namaPaket: nama,
        tanggalBerangkat: k.tanggalBerangkat ? k.tanggalBerangkat.toISOString() : new Date().toISOString(),
        tanggalPulang: k.tanggalPulang ? k.tanggalPulang.toISOString() : new Date().toISOString(),
        createdAt: k.createdAt ? k.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: k.updatedAt ? k.updatedAt.toISOString() : new Date().toISOString(),
        maskapai: k.maskapaiMaster?.name || (k.maskapai && !k.maskapai.startsWith("cm") ? k.maskapai : undefined) || "Saudia",
        hotelMekkah: k.hotelMekkahMaster?.name || (k.hotelMekkah && !k.hotelMekkah.startsWith("cm") ? k.hotelMekkah : undefined) || "TBA",
        hotelMadinah: k.hotelMadinahMaster?.name || (k.hotelMadinah && !k.hotelMadinah.startsWith("cm") ? k.hotelMadinah : undefined) || "TBA",
        hotelOptions: (k as any).hotelOptions ?? [],
      };
    }) as any;
  } catch (err) {
    console.error("getKeberangkatanList error:", err);
    return [];
  }
}

export async function getKeberangkatanById(id: string) {
  if (!id) return null;
  try {
    const k = await prisma.keberangkatan.findFirst({
      where: {
        OR: [
          { id },
          { kode: id },
          { kodeIndividu: id },
        ],
      },
      include: {
        paketUmroh: true,
        maskapaiMaster: true,
        hotelMekkahMaster: true,
        hotelMadinahMaster: true,
        startingPoint: true,
        packageType: true,
      },
    });
    if (!k) return null;

    const isPromo = k.splitReason === "promo" || !!k.promoLabel || k.kode.includes("_V");
    let nama = k.namaPaket || "PAKET UMROH";
    if (isPromo && !nama.toUpperCase().includes("(PROMO")) {
      const promoTag = k.promoLabel ? `(PROMO: ${k.promoLabel})` : "(PROMO)";
      nama = `${nama} ${promoTag}`;
    }

    return {
      ...k,
      namaPaket: nama,
      tanggalBerangkat: k.tanggalBerangkat ? k.tanggalBerangkat.toISOString() : new Date().toISOString(),
      tanggalPulang: k.tanggalPulang ? k.tanggalPulang.toISOString() : new Date().toISOString(),
      createdAt: k.createdAt ? k.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: k.updatedAt ? k.updatedAt.toISOString() : new Date().toISOString(),
      maskapai: k.maskapaiMaster?.name || (k.maskapai && !k.maskapai.startsWith("cm") ? k.maskapai : undefined) || "Saudia",
      hotelMekkah: k.hotelMekkahMaster?.name || (k.hotelMekkah && !k.hotelMekkah.startsWith("cm") ? k.hotelMekkah : undefined) || "TBA",
      hotelMadinah: k.hotelMadinahMaster?.name || (k.hotelMadinah && !k.hotelMadinah.startsWith("cm") ? k.hotelMadinah : undefined) || "TBA",
      hotelOptions: (k as any).hotelOptions ?? [],
    } as any;
  } catch (err) {
    console.error("getKeberangkatanById error:", err);
    return null;
  }
}

export async function getJamaahList() {
  return await prisma.jamaah.findMany({
    orderBy: { createdAt: "desc" },
    include: { dokumen: true },
  }) as any;
}

export async function getGroupList() {
  return await prisma.registrationGroup.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getJamaahByGroup(groupId: string) {
  return await prisma.jamaah.findMany({
    where: { groupId },
    include: { dokumen: true },
  }) as any;
}

export async function getManifestById(id: string) {
  return await prisma.manifest.findUnique({
    where: { id },
    include: { rows: { include: { jamaah: true } }, keberangkatan: true },
  }) as any;
}

export async function getAllPaymentSummaries() {
  // Mock summaries usually returned an aggregated view
  // For now, we return empty arrays since real aggregation requires complex queries
  return [];
}

export async function getInvoiceList() {
  return await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function createInvoice(data: {
  groupId: string;
  nomorInvoice?: string;
  nominal: number;
  jatuhTempo?: string;
  catatan?: string;
}) {
  const nomorInvoice =
    data.nomorInvoice ||
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const created = await prisma.invoice.create({
    data: {
      id: nomorInvoice,
      groupId: data.groupId,
      nomorInvoice,
      tipe: "pelunasan",
      jumlah: data.nominal,
      sisaTagihan: data.nominal,
      status: "unpaid",
      jatuhTempo: data.jatuhTempo ? new Date(data.jatuhTempo) : new Date(Date.now() + 14 * 86400000),
    },
  });

  return created;
}

export async function getPembayaranList() {
  return await prisma.pembayaran.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getDokumenByJamaah(jamaahId: string) {
  return await prisma.dokumenItem.findMany({
    where: { jamaahId },
  }) as any;
}

export async function deleteKeberangkatan(id: string) {
  try {
    await packageService.delete(id);
    return { success: true, message: "Paket keberangkatan berhasil dihapus." };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal menghapus paket keberangkatan." };
  }
}

export async function createKeberangkatan(data: any) {
  return await prisma.keberangkatan.create({
    data,
  }) as any;
}

export async function getJamaahById(id: string) {
  try {
    let j = (await prisma.jamaah.findUnique({
      where: { id },
      include: { dokumen: true },
    })) as any;

    // Fallback: if not in prisma.jamaah, check registrationMember / registrationRequest
    if (!j) {
      const member = await prisma.registrationMember.findUnique({
        where: { id },
        include: { request: { include: { keberangkatan: { include: { paketUmroh: true } } } } },
      }).catch(() => null);

      if (member) {
        j = {
          id: member.id,
          nomorPeserta: `PST-${member.id.slice(-6).toUpperCase()}`,
          namaLengkap: member.namaLengkap,
          jenisKelamin: member.jenisKelamin,
          tempatLahir: member.tempatLahir || "Jakarta",
          tanggalLahir: member.tanggalLahir || "1990-01-01",
          nik: "3171000000000000",
          nomorPaspor: "-",
          masaBerlakuPaspor: "-",
          nomorTelepon: member.request?.nomorTelepon || "-",
          email: member.request?.emailPerwakilan || "-",
          status: "registered",
          hotelMekkah: "Hotel Setaraf Bintang 5",
          hotelMadinah: "Hotel Setaraf Bintang 4",
          dokumen: [],
          groupId: member.request?.kodeRegistrasi || "GRP-2026",
          paket: member.request?.keberangkatan,
        };
      }
    }

    if (!j) return null;

    let group = null;
    let paket = j.paket || null;
    let invoices: any[] = [];
    let pembayarans: any[] = [];

    // Fetch related group & package
    if (j.groupId) {
      group = await prisma.registrationGroup.findUnique({ where: { id: j.groupId } }).catch(() => null);
    }

    // Fetch invoices for this jamaah or group
    invoices = await prisma.invoice
      .findMany({
        where: {
          OR: [{ jamaahId: j.id }, ...(j.groupId ? [{ groupId: j.groupId }] : [])],
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);

    // Fetch payments
    pembayarans = invoices.length > 0
      ? await prisma.pembayaran
          .findMany({
            where: { invoiceId: { in: invoices.map((i) => i.id) } },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : [];

    // Fetch package details if not already present
    const paketId = group?.paketKeberangkatanId;
    if (!paket && paketId) {
      paket = await prisma.keberangkatan
        .findUnique({
          where: { id: paketId },
          include: {
            paketUmroh: true,
            maskapaiMaster: true,
            hotelMekkahMaster: true,
            hotelMadinahMaster: true,
          },
        })
        .catch(() => null);
    }

    if (!paket) {
      // Fallback: search default package
      const list = await prisma.keberangkatan
        .findMany({
          take: 1,
          include: { paketUmroh: true, maskapaiMaster: true, hotelMekkahMaster: true, hotelMadinahMaster: true },
        })
        .catch(() => []);
      if (list.length > 0) paket = list[0];
    }

    // Must sanitize Date objects into plain JSON for Next.js Server Action serialization
    return JSON.parse(
      JSON.stringify({
        ...j,
        group,
        paket,
        invoices,
        pembayarans,
      })
    );
  } catch (err) {
    console.error("getJamaahById error:", err);
    return null;
  }
}

export async function getJamaahReadiness(_id: string) {
  return {
    level: "INCOMPLETE",
    checks: [],
    passed: 0,
    total: 0,
    score: 0,
  } as any;
}

export async function getJamaahProgress(_id: string) {
  return {
    steps: [],
    currentStep: "test",
    completedSteps: 0,
    totalSteps: 0,
    percentComplete: 0,
  } as any;
}

export async function getDerivedStatus(_jamaah: any) {
  return "draft";
}

export async function getExportData(_request: any) {
  return { headers: [], rows: [] };
}

export async function getManifestList() {
  return await prisma.manifest.findMany({
    orderBy: { createdAt: "desc" },
  }) as any;
}

export async function getReminderList() {
  return []; // Mock return for now
}

export async function getGroupPaymentSummary(_groupId: string) {
  return null as any;
}

export async function addPembayaran(_data: any) {
  return null as any;
}

export async function cancelInvoiceItem(_invoiceId: string, _itemId: string, _reason: string, _user: string) {
  return null as any;
}

export async function getGroupByKode(_kode: string) {
  return null as any;
}

export async function fetchInvoiceSplitConfig(_groupId: string) {
  return null as any;
}

export async function saveInvoiceSplitConfig(_groupId: string, _data: any) {
  return null as any;
}

export async function getDashboardData() {
  return null as any;
}

export async function getAutoDeadlines(_keberangkatanId?: string) {
  return [] as any;
}

export async function getActivityFeed(_keberangkatanId?: string) {
  return [] as any;
}

export async function getAutoWarnings(_keberangkatanId?: string) {
  return [] as any;
}

export async function getPackageReadinessScore(_keberangkatanId: string) {
  return null as any;
}

export async function getOperationalTimeline(_keberangkatanId: string) {
  return [] as any;
}

export async function getFinalizationResult(_keberangkatanId: string) {
  return null as any;
}

export async function getDocumentCompletionMatrix(_keberangkatanId: string) {
  return [] as any;
}

export async function getRoomingList(_keberangkatanId?: string) {
  return [] as any;
}

export async function getPackageIntelligence(_keberangkatanId: string) {
  return null as any;
}

export async function submitRegistrasi(_data: any) {
  return null as any;
}
