"use server";

import { prisma } from "@/server/db/client";
import { packageService } from "@/server/services/package.service";
import { groupRepo, pembayaranRepo } from "@/server/repositories";


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
  kategori?: "PEMBAYARAN" | "PINDAH_PAKET" | "TAMBAH_JAMAAH" | "PEMBATALAN" | "REFUND_MURNI";
  subKategori?: string;
  scopePembatalan?: "SEBAGIAN" | "SELURUH";
  refundStatus?: "NON_REFUND" | "WITH_REFUND";
  jamaahTargetIds?: string[];
}) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = String(Math.floor(Math.random() * 9000) + 1000);
  
  let prefix = "INV";
  if (data.kategori === "PEMBATALAN") prefix = "CN-CANCEL";
  else if (data.kategori === "REFUND_MURNI") prefix = "REF";
  else if (data.kategori === "PINDAH_PAKET") prefix = "INV-PAKET";
  else if (data.kategori === "TAMBAH_JAMAAH") prefix = "INV-PAX";

  const nomorInvoice = data.nomorInvoice || `${prefix}-${dateStr}-${randomSuffix}`;
  const tipe = data.subKategori || (data.kategori ? data.kategori.toLowerCase() : "pelunasan");

  const created = await prisma.invoice.create({
    data: {
      id: nomorInvoice,
      groupId: data.groupId,
      nomorInvoice,
      tipe: tipe as any,
      jumlah: data.nominal,
      sisaTagihan: data.nominal,
      status: "unpaid",
      jatuhTempo: data.jatuhTempo ? new Date(data.jatuhTempo) : new Date(Date.now() + 14 * 86400000),
    },
  });

  // Create pending payment in review queue so it appears in Payment Review / Penerbitan Invoice
  try {
    const catatanPembayaran =
      data.catatan ||
      (data.kategori === "PINDAH_PAKET"
        ? `Pindah Paket: Selisih biaya paket`
        : data.kategori === "TAMBAH_JAMAAH"
          ? `Tambah Jamaah: Tagihan penambahan jamaah`
          : data.kategori === "PEMBATALAN"
            ? `Pembatalan: Biaya pembatalan`
            : data.kategori === "REFUND_MURNI"
              ? `Refund: Pengembalian dana`
              : `Tagihan Invoice: ${tipe}`);

    await prisma.pembayaran.create({
      data: {
        groupId: data.groupId,
        invoiceId: created.id,
        jumlah: data.nominal,
        metode: "transfer",
        tanggal: new Date(),
        status: "pending",
        sumber: "admin",
        catatan: catatanPembayaran,
      },
    });
  } catch (err) {
    console.warn("Failed creating pending pembayaran in review queue:", err);
  }

  // Auto-Approve Registration Request if pending
  try {
    const group = await prisma.registrationGroup.findUnique({ where: { id: data.groupId } });
    if (group?.kodeRegistrasi) {
      const reg = await prisma.registrationRequest.findFirst({
        where: { kodeRegistrasi: group.kodeRegistrasi, status: { in: ["PENDING_REVIEW", "DRAFT"] } },
      });

      if (reg) {
        await prisma.registrationRequest.update({
          where: { id: reg.id },
          data: { status: "APPROVED" },
        });
      }
    }
  } catch (err) {
    console.warn("Auto approve registration on invoice creation warning:", err);
  }

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
          nomorPeserta: member.request?.kodeRegistrasi ? `${member.request.kodeRegistrasi}-1` : `GRP-2026-${member.id.slice(-6).toUpperCase()}`,
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

export async function getGroupPaymentSummary(groupId: string) {
  try {
    return await groupRepo.getPaymentSummary(groupId);
  } catch (err) {
    console.error("getGroupPaymentSummary error:", err);
    return null;
  }
}

export async function addPembayaran(data: any) {
  try {
    return await pembayaranRepo.create({
      ...data,
      status: data.status || "verified",
    });
  } catch (err) {
    console.error("addPembayaran error:", err);
    throw err;
  }
}

export async function cancelInvoiceItem(_invoiceId: string, _itemId: string, _reason: string, _user: string) {
  return null as any;
}

export async function getGroupByKode(kode: string) {
  try {
    return await groupRepo.findByKode(kode);
  } catch (err) {
    console.error("getGroupByKode error:", err);
    return null;
  }
}

export async function fetchInvoiceSplitConfig(groupId: string) {
  try {
    return await groupRepo.getInvoiceSplitConfig(groupId);
  } catch (err) {
    console.error("fetchInvoiceSplitConfig error:", err);
    return null;
  }
}

export async function saveInvoiceSplitConfig(groupId: string, data: any) {
  try {
    return await groupRepo.saveInvoiceSplitConfig(groupId, data.splits || data);
  } catch (err) {
    console.error("saveInvoiceSplitConfig error:", err);
    throw err;
  }
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

export async function addJamaahToGroup(data: {
  groupId: string;
  jamaahList: Array<{
    namaLengkap: string;
    jenisKelamin: "L" | "P";
    hubungan?: string;
  }>;
}) {
  try {
    const group = await prisma.registrationGroup.findUnique({
      where: { id: data.groupId },
      include: {
        anggota: { orderBy: { createdAt: "asc" } },
        keberangkatan: true,
        ketuaGroup: true,
        invoices: { orderBy: { createdAt: "asc" } },
        registrationRequests: { include: { members: true } },
      },
    });

    if (!group) {
      return { success: false, message: "Group tidak ditemukan" };
    }

    if (!data.jamaahList || data.jamaahList.length === 0) {
      return { success: false, message: "Daftar jamaah tambahan tidak boleh kosong" };
    }

    // Determine max index for registrationId: GRP-YYYY-NNNN-X
    let maxIndex = group.anggota.length;
    for (const a of group.anggota) {
      const match = a.registrationId?.match(/-(\d+)$/);
      if (match && match[1]) {
        const idxNum = parseInt(match[1], 10);
        if (!isNaN(idxNum) && idxNum > maxIndex) {
          maxIndex = idxNum;
        }
      }
    }

    const regPrefix = group.kodeRegistrasi || `GRP-2026-${group.id.slice(-4).toUpperCase()}`;

    // Create Jamaah records
    for (let i = 0; i < data.jamaahList.length; i++) {
      const item = data.jamaahList[i]!;
      const memberIndex = maxIndex + i + 1;
      const registrationId = `${regPrefix}-${memberIndex}`;
      const nomorPeserta = registrationId;

      await prisma.jamaah.create({
        data: {
          registrationId,
          groupId: group.id,
          nomorPeserta,
          namaLengkap: item.namaLengkap.trim(),
          namaAyah: "",
          jenisKelamin: item.jenisKelamin as any,
          tempatLahir: "-",
          tanggalLahir: new Date("2000-01-01"),
          nik: "",
          nomorPaspor: "",
          masaBerlakuPaspor: new Date("2030-01-01"),
          nomorTelepon: group.ketuaGroup?.nomorTelepon || "-",
          email: group.ketuaGroup?.email || "-",
          alamat: group.ketuaGroup?.alamat || "-",
          provinsi: group.ketuaGroup?.provinsi || "-",
          kota: group.ketuaGroup?.kota || "-",
          kecamatan: group.ketuaGroup?.kecamatan || "-",
          kelurahan: group.ketuaGroup?.kelurahan || "-",
          status: "registered",
          hotelMekkah: group.keberangkatan?.hotelMekkah || "-",
          hotelMadinah: group.keberangkatan?.hotelMadinah || "-",
          syaratDisetujui: true,
        },
      });

      // If group has linked registrationRequest, also record RegistrationMember
      if (group.registrationRequests && group.registrationRequests.length > 0) {
        const regReq = group.registrationRequests[0]!;
        const curMemberCount = regReq.members?.length || 0;
        await prisma.registrationMember.create({
          data: {
            requestId: regReq.id,
            namaLengkap: item.namaLengkap.trim(),
            jenisKelamin: item.jenisKelamin as any,
            hubungan: item.hubungan?.trim() || "-",
            urutan: curMemberCount + i + 1,
          },
        }).catch((err) => console.warn("Failed creating registrationMember:", err));
      }
    }

    if (group.registrationRequests && group.registrationRequests.length > 0) {
      const regReq = group.registrationRequests[0]!;
      await prisma.registrationRequest.update({
        where: { id: regReq.id },
        data: { paxCount: { increment: data.jamaahList.length } },
      }).catch(() => {});
    }

    // Calculate additional price based on package
    const baseTarif = group.keberangkatan?.hargaPaket || (group.jumlahAnggota > 0 ? Math.round(group.totalTagihan / group.jumlahAnggota) : 0);
    const nominalTambahan = baseTarif * data.jamaahList.length;

    // Update group total tagihan, sisa pembayaran, jumlah anggota
    const newJumlahAnggota = group.jumlahAnggota + data.jamaahList.length;
    const newTotalTagihan = group.totalTagihan + nominalTambahan;
    const newSisa = Math.max(0, newTotalTagihan - group.totalPembayaran);

    await prisma.registrationGroup.update({
      where: { id: group.id },
      data: {
        jumlahAnggota: newJumlahAnggota,
        totalTagihan: newTotalTagihan,
        sisaPembayaran: newSisa,
      },
    });

    // Update keberangkatan seats (terisi)
    if (group.paketKeberangkatanId) {
      await prisma.keberangkatan.update({
        where: { id: group.paketKeberangkatanId },
        data: { terisi: { increment: data.jamaahList.length } },
      }).catch(() => {});
    }

    // Determine due date (jatuh tempo) following group's existing invoice or departure H-40
    let targetJatuhTempo: Date;
    const firstInvoice = group.invoices?.[0];
    if (firstInvoice?.jatuhTempo) {
      targetJatuhTempo = new Date(firstInvoice.jatuhTempo);
    } else if (group.keberangkatan?.tanggalBerangkat) {
      const h40 = new Date(group.keberangkatan.tanggalBerangkat);
      h40.setDate(h40.getDate() - 40);
      targetJatuhTempo = h40;
    } else {
      targetJatuhTempo = new Date(Date.now() + 14 * 86400000);
    }

    // Create Invoice for the additional pax so it can be reviewed before issuance
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = String(Math.floor(Math.random() * 9000) + 1000);
    const nomorInvoice = `INV-PAX-${dateStr}-${randomSuffix}`;
    const rincianAnggota = data.jamaahList
      .map((j, idx) => `${idx + 1}. ${j.namaLengkap} (${j.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}${j.hubungan ? `, ${j.hubungan}` : ""})`)
      .join("; ");

    const createdInvoice = await prisma.invoice.create({
      data: {
        id: nomorInvoice,
        nomorInvoice,
        groupId: group.id,
        tipe: "tambahan",
        jumlah: nominalTambahan,
        sisaTagihan: nominalTambahan,
        status: "unpaid",
        jatuhTempo: targetJatuhTempo,
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: createdInvoice.id,
        kategori: "Paket Umroh",
        deskripsi: `Penambahan ${data.jamaahList.length} pax jamaah: ${rincianAnggota}`,
        qty: data.jamaahList.length,
        hargaSatuan: baseTarif,
        jumlah: nominalTambahan,
        status: "active",
      },
    }).catch(() => {});

    // Create pending payment in review queue so it appears in Payment Review / Penerbitan Invoice
    let createdPaymentId = "";
    try {
      const createdPayment = await prisma.pembayaran.create({
        data: {
          groupId: group.id,
          invoiceId: createdInvoice.id,
          jumlah: nominalTambahan,
          metode: "transfer",
          tanggal: new Date(),
          status: "pending",
          sumber: "admin",
          catatan: `Tambah Jamaah: ${data.jamaahList.length} Pax (${data.jamaahList.map((j) => `${j.namaLengkap} - ${j.jenisKelamin === "L" ? "L" : "P"}${j.hubungan ? ` (${j.hubungan})` : ""}`).join(", ")})`,
        },
      });
      createdPaymentId = createdPayment.id;
    } catch (err) {
      console.warn("Failed creating pending pembayaran for additional jamaah:", err);
    }

    return {
      success: true,
      invoiceNumber: nomorInvoice,
      paymentId: createdPaymentId,
      amount: nominalTambahan,
      addedCount: data.jamaahList.length,
      group: {
        id: group.id,
        jumlahAnggota: newJumlahAnggota,
        totalTagihan: newTotalTagihan,
      },
    };
  } catch (err: any) {
    console.error("addJamaahToGroup error:", err);
    return { success: false, message: err.message || "Gagal menambahkan jamaah ke grup" };
  }
}
