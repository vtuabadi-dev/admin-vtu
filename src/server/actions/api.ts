"use server";

import { prisma } from "@/server/db/client";
import { packageService } from "@/server/services/package.service";
import { groupRepo, pembayaranRepo, invoiceRepo } from "@/server/repositories";
import { syncPackageDocumentFileNamesToDrive } from "@/server/services/manifest-drive-sync.service";
import {
  getCanonicalItemDedupeKey,
  isHotelUpgradeItem,
  resolvePackageBillingConfig,
  shouldSkipNonBillingInvoiceItem,
} from "@/shared/lib/billing-ssot";
import { revalidatePath } from "next/cache";

interface BillingItemInput {
  kategori?: string;
  deskripsi: string;
  qty: number;
  hargaSatuan: number;
  jumlah?: number;
}

function normalizeBillingItemInput(it: BillingItemInput) {
  const katRaw = (it.kategori || "tambahan").trim();
  const katLower = katRaw.toLowerCase();
  const isPotongan = katLower === "potongan" || katLower === "pengurangan";
  const qty = Math.max(1, Math.round(Number(it.qty) || 1));
  const rawHarga = Number(it.hargaSatuan);
  const baseAbsHarga = Number.isFinite(rawHarga)
    ? Math.abs(Math.round(rawHarga))
    : Math.abs(Math.round((Number(it.jumlah) || 0) / qty));
  const signedHarga = isPotongan ? -baseAbsHarga : baseAbsHarga;
  const signedJumlah = signedHarga * qty;
  return {
    kategori: katRaw || "tambahan",
    deskripsi: (it.deskripsi || "Item Tagihan").trim(),
    qty,
    hargaSatuan: signedHarga,
    jumlah: signedJumlah,
  };
}

async function revertGroupHotelsIfNoUpgradeItem(groupId: string) {
  try {
    const groupWithPkg = await prisma.registrationGroup.findUnique({
      where: { id: groupId },
      include: {
        keberangkatan: {
          include: { hotelMekkahMaster: true, hotelMadinahMaster: true },
        },
        anggota: true,
        invoices: {
          where: { status: { not: "cancelled" } },
          include: { items: true },
        },
      },
    });
    if (!groupWithPkg?.keberangkatan) return;

    const hasActiveHotelUpgrade = (groupWithPkg.invoices || []).some((inv) =>
      (inv.items || []).some(
        (it) => it.status !== "cancelled" && isHotelUpgradeItem(it.deskripsi || "")
      )
    );
    if (hasActiveHotelUpgrade) return;

    const pkgCfg = resolvePackageBillingConfig({
      activePackage: groupWithPkg.keberangkatan,
      group: groupWithPkg,
      member: groupWithPkg.anggota?.[0],
    });

    const rawMekkah = pkgCfg.hotelMekkah || groupWithPkg.keberangkatan.hotelMekkah;
    const rawMadinah = pkgCfg.hotelMadinah || groupWithPkg.keberangkatan.hotelMadinah;
    const defaultMekkah = (
      groupWithPkg.keberangkatan.hotelMekkahMaster?.name ||
      (rawMekkah && !rawMekkah.startsWith("cm") ? rawMekkah : "")
    ).trim();
    const defaultMadinah = (
      groupWithPkg.keberangkatan.hotelMadinahMaster?.name ||
      (rawMadinah && !rawMadinah.startsWith("cm") ? rawMadinah : "")
    ).trim();

    if ((defaultMekkah || defaultMadinah) && groupWithPkg.anggota && groupWithPkg.anggota.length > 0) {
      const updateData: Record<string, string> = {};
      if (defaultMekkah) updateData.hotelMekkah = defaultMekkah;
      if (defaultMadinah) updateData.hotelMadinah = defaultMadinah;
      await prisma.jamaah.updateMany({
        where: { groupId },
        data: updateData,
      });
    }
  } catch (revertErr) {
    console.warn("Revert jamaah hotels warning:", revertErr);
  }
}


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

/**
 * Synchronize group billing items directly to PostgreSQL (invoices + invoice_items + registration_groups.totalTagihan)
 * so any item addition, edit, or deletion persists immediately and reflects in Manifest Pembayaran.
 */
export async function syncGroupBillingItems(data: {
  groupId: string;
  totalTagihan?: number;
  items: BillingItemInput[];
}) {
  try {
    const group = await prisma.registrationGroup.findFirst({
      where: {
        OR: [{ id: data.groupId }, { kodeRegistrasi: data.groupId }],
      },
      include: {
        keberangkatan: true,
        anggota: true,
        invoices: {
          where: { status: { not: "cancelled" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
        pembayaran: true,
      },
    });

    if (!group) {
      return { success: false, message: "Group tidak ditemukan" };
    }

    const normalizedItems = (data.items || [])
      .filter((it) => it && (it.deskripsi || "").trim().length > 0)
      .map((it) => {
        const norm = normalizeBillingItemInput(it);
        return {
          ...norm,
          key: getCanonicalItemDedupeKey(norm),
        };
      });

    const itemsSum = normalizedItems.reduce((sum, it) => sum + it.jumlah, 0);
    const hasBaseItem = normalizedItems.some((it) => it.key === "__BASE_PACKAGE__");
    const paxCount = group.anggota?.length || group.jumlahAnggota || 1;
    const pkgConfig = resolvePackageBillingConfig({
      activePackage: group.keberangkatan,
      group,
      member: group.anggota?.[0],
    });
    const basePkgTotal = pkgConfig.hargaBase * paxCount;

    const netTotalTagihan =
      data.totalTagihan !== undefined && Number.isFinite(data.totalTagihan) && data.totalTagihan >= 0
        ? Math.round(data.totalTagihan)
        : Math.max(0, hasBaseItem ? itemsSum : basePkgTotal + itemsSum);

    const verifiedPaid = (group.pembayaran || [])
      .filter((p) => p.status === "verified")
      .reduce((sum, p) => sum + (p.jumlah || 0), 0);
    const sisaPembayaran = Math.max(0, netTotalTagihan - verifiedPaid);

    const draftId = `BILL-${group.id}`;
    const draftNomor = `TAG-${group.kodeRegistrasi || group.id.slice(-6).toUpperCase()}`;

    const activeInvoices = group.invoices || [];
    const officialInvoices = activeInvoices.filter((inv) => !inv.id.startsWith("BILL-"));
    const existingDraft = activeInvoices.find((inv) => inv.id === draftId);

    // Determine default due date: H-40 from departure or +14 days
    let defaultJatuhTempo = new Date(Date.now() + 14 * 86400000);
    if (group.keberangkatan?.tanggalBerangkat) {
      const h40 = new Date(group.keberangkatan.tanggalBerangkat);
      h40.setDate(h40.getDate() - 40);
      defaultJatuhTempo = h40;
    }

    await prisma.$transaction(async (tx) => {
      if (officialInvoices.length === 0) {
        // Case A: No formal invoice exists yet — manage the group billing ledger (BILL-...)
        if (existingDraft) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: draftId } });
        }

        await tx.invoice.upsert({
          where: { id: draftId },
          create: {
            id: draftId,
            nomorInvoice: draftNomor,
            groupId: group.id,
            tipe: "pelunasan",
            jumlah: netTotalTagihan,
            sisaTagihan: sisaPembayaran,
            status: verifiedPaid >= netTotalTagihan && netTotalTagihan > 0 ? "paid" : "unpaid",
            jatuhTempo: defaultJatuhTempo,
          },
          update: {
            jumlah: netTotalTagihan,
            sisaTagihan: sisaPembayaran,
            status: verifiedPaid >= netTotalTagihan && netTotalTagihan > 0 ? "paid" : "unpaid",
          },
        });

        for (const it of normalizedItems) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: draftId,
              kategori: it.kategori,
              deskripsi: it.deskripsi,
              qty: it.qty,
              hargaSatuan: it.hargaSatuan,
              jumlah: it.jumlah,
              status: "active",
            },
          });
        }
      } else {
        // Case B: Formal invoice(s) exist — update matching items or store un-invoiced delta items in BILL-...
        const incomingByKey = new Map<string, (typeof normalizedItems)[number]>();
        for (const it of normalizedItems) {
          // If duplicate keys appear in incoming list, sum or keep latest configured
          incomingByKey.set(it.key, it);
        }

        const matchedIncomingKeys = new Set<string>();

        for (const inv of officialInvoices) {
          for (const dbItem of inv.items || []) {
            if (shouldSkipNonBillingInvoiceItem(dbItem)) continue;

            const dbKey = getCanonicalItemDedupeKey(dbItem);
            // Never auto-cancel base package unless caller explicitly passed a base package item
            if (dbKey === "__BASE_PACKAGE__" && !incomingByKey.has("__BASE_PACKAGE__")) {
              continue;
            }
            const matched = incomingByKey.get(dbKey);

            if (!matched) {
              // Item was deleted by admin — cancel on the official invoice so manifest & ledger match
              await tx.invoiceItem.update({
                where: { id: dbItem.id },
                data: {
                  status: "cancelled",
                  cancelledAt: new Date(),
                  cancelledBy: "admin",
                  cancellationReason: "Dihapus dari rincian tagihan group",
                },
              });
            } else {
              matchedIncomingKeys.add(dbKey);
              // Update value/description if modified
              if (
                dbItem.deskripsi !== matched.deskripsi ||
                dbItem.qty !== matched.qty ||
                dbItem.hargaSatuan !== matched.hargaSatuan ||
                dbItem.jumlah !== matched.jumlah
              ) {
                await tx.invoiceItem.update({
                  where: { id: dbItem.id },
                  data: {
                    kategori: matched.kategori,
                    deskripsi: matched.deskripsi,
                    qty: matched.qty,
                    hargaSatuan: matched.hargaSatuan,
                    jumlah: matched.jumlah,
                  },
                });
              }
            }
          }
        }

        // Any newly added items not yet on official invoices go into BILL-... delta ledger
        const hasBaseInOfficial = officialInvoices.some((inv) =>
          (inv.items || []).some(
            (dbItem) => dbItem.status !== "cancelled" && getCanonicalItemDedupeKey(dbItem) === "__BASE_PACKAGE__"
          )
        );

        const deltaItems = normalizedItems.filter((it) => {
          if (matchedIncomingKeys.has(it.key)) return false;
          if (it.key === "__BASE_PACKAGE__" && hasBaseInOfficial) return false;
          // Also exclude base package if PaymentReviewTab didn't create a base item previously
          return true;
        });

        if (deltaItems.length > 0) {
          const deltaTotal = Math.max(
            0,
            deltaItems.reduce((s, it) => s + it.jumlah, 0)
          );
          if (existingDraft) {
            await tx.invoiceItem.deleteMany({ where: { invoiceId: draftId } });
          }

          await tx.invoice.upsert({
            where: { id: draftId },
            create: {
              id: draftId,
              nomorInvoice: draftNomor,
              groupId: group.id,
              tipe: "tambahan",
              jumlah: deltaTotal,
              sisaTagihan: deltaTotal,
              status: "unpaid",
              jatuhTempo: officialInvoices[0]?.jatuhTempo || defaultJatuhTempo,
            },
            update: {
              jumlah: deltaTotal,
              sisaTagihan: deltaTotal,
              status: "unpaid",
            },
          });

          for (const it of deltaItems) {
            await tx.invoiceItem.create({
              data: {
                invoiceId: draftId,
                kategori: it.kategori,
                deskripsi: it.deskripsi,
                qty: it.qty,
                hargaSatuan: it.hargaSatuan,
                jumlah: it.jumlah,
                status: "active",
              },
            });
          }
        } else if (existingDraft) {
          await tx.pembayaran.updateMany({
            where: { invoiceId: draftId },
            data: { invoiceId: officialInvoices[0]?.id ?? null },
          });
          await tx.invoiceItem.deleteMany({ where: { invoiceId: draftId } });
          await tx.invoice.delete({ where: { id: draftId } });
        }
      }

      await tx.registrationGroup.update({
        where: { id: group.id },
        data: {
          totalTagihan: netTotalTagihan,
          totalPembayaran: verifiedPaid,
          sisaPembayaran,
        },
      });
    });

    try {
      revalidatePath("/admin/manifest");
      revalidatePath("/admin/pembayaran/laporan");
      revalidatePath(`/admin/pembayaran/${group.id}`);
    } catch {}

    const updatedGroup = await groupRepo.findById(group.id).catch(() => null);

    return {
      success: true,
      totalTagihan: netTotalTagihan,
      sisaPembayaran,
      group: updatedGroup,
    };
  } catch (err: any) {
    console.error("syncGroupBillingItems error:", err);
    return { success: false, message: err?.message || "Gagal menyinkronkan item tagihan" };
  }
}

export async function createInvoice(data: {
  groupId: string;
  nomorInvoice?: string;
  pembayaranId?: string;
  nominal: number;
  jatuhTempo?: string;
  catatan?: string;
  kategori?: "PEMBAYARAN" | "PEMBARUAN_INVOICE" | "PINDAH_PAKET" | "TAMBAH_JAMAAH" | "PEMBATALAN" | "REFUND_MURNI";
  subKategori?: string;
  scopePembatalan?: "SEBAGIAN" | "SELURUH";
  refundStatus?: "NON_REFUND" | "WITH_REFUND";
  jamaahTargetIds?: string[];
  totalTagihan?: number;
  items?: BillingItemInput[];
}) {
  const isRevision = data.kategori === "PEMBARUAN_INVOICE";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = String(Math.floor(Math.random() * 9000) + 1000);
  
  let prefix = "INV";
  if (data.kategori === "PEMBATALAN") prefix = "CN-CANCEL";
  else if (data.kategori === "REFUND_MURNI") prefix = "REF";
  else if (data.kategori === "PINDAH_PAKET") prefix = "INV-PAKET";
  else if (data.kategori === "TAMBAH_JAMAAH") prefix = "INV-PAX";
  else if (data.kategori === "PEMBARUAN_INVOICE") prefix = "INV-UPD";

  const nomorInvoice = data.nomorInvoice || `${prefix}-${dateStr}-${randomSuffix}`;
  const safeInvoiceId = nomorInvoice.replace(/[^A-Za-z0-9_-]/g, "-");
  
  // Normalize tipe strictly to valid Prisma enum TipeInvoice: "dp" | "cicilan" | "pelunasan" | "tambahan"
  let normalizedTipe: "dp" | "cicilan" | "pelunasan" | "tambahan" = "pelunasan";
  const rawTipe = (data.subKategori || (data.kategori ? data.kategori.toLowerCase() : "") || "").toLowerCase();
  const rawCatatan = (data.catatan || "").toLowerCase();

  if (rawTipe === "dp" || rawCatatan.includes("dp") || rawCatatan.includes("uang muka")) {
    normalizedTipe = "dp";
  } else if (rawTipe === "cicilan" || rawCatatan.includes("cicilan") || rawCatatan.includes("angsuran")) {
    normalizedTipe = "cicilan";
  } else if (
    rawTipe === "tambahan" ||
    data.kategori === "PEMBARUAN_INVOICE" ||
    data.kategori === "TAMBAH_JAMAAH" ||
    data.kategori === "PINDAH_PAKET" ||
    data.kategori === "PEMBATALAN"
  ) {
    normalizedTipe = "tambahan";
  } else {
    normalizedTipe = "pelunasan";
  }

  // For Pembaruan Invoice (without incoming payment), sync billing items first so edits/cancellations apply cleanly
  let syncRes: { success?: boolean; totalTagihan?: number; sisaPembayaran?: number } | null = null;
  if (isRevision && data.items && data.items.length > 0) {
    syncRes = await syncGroupBillingItems({
      groupId: data.groupId,
      totalTagihan: data.totalTagihan,
      items: data.items,
    });
  }

  // Gather existing official invoices BEFORE creating the new one so we don't duplicate items in manifest
  const draftId = `BILL-${data.groupId}`;
  const existingOfficialInvoices = await prisma.invoice.findMany({
    where: {
      groupId: data.groupId,
      status: { not: "cancelled" },
      id: { not: draftId },
    },
    include: { items: true },
  });

  const existingOfficialKeys = new Set<string>();
  for (const inv of existingOfficialInvoices) {
    for (const it of inv.items || []) {
      if (it.status !== "cancelled") {
        existingOfficialKeys.add(getCanonicalItemDedupeKey(it));
      }
    }
  }

  let invoiceAmount = data.nominal;
  let invoiceSisa = data.nominal;
  let invoiceStatus: "unpaid" | "partial" | "paid" = "unpaid";

  if (isRevision) {
    const groupForRevision = await prisma.registrationGroup.findUnique({
      where: { id: data.groupId },
      include: { pembayaran: true },
    });
    const hasPaymentRecords = (groupForRevision?.pembayaran || []).length > 0;
    const verifiedPaid = hasPaymentRecords
      ? (groupForRevision?.pembayaran || [])
          .filter((p) => p.status === "verified")
          .reduce((sum, p) => sum + Number(p.jumlah || 0), 0)
      : Number(groupForRevision?.totalPembayaran || 0);

    invoiceAmount = Math.max(
      0,
      syncRes?.totalTagihan ?? data.totalTagihan ?? groupForRevision?.totalTagihan ?? data.nominal ?? 0
    );
    invoiceSisa = Math.max(0, invoiceAmount - verifiedPaid);
    invoiceStatus =
      invoiceAmount > 0 && verifiedPaid >= invoiceAmount
        ? "paid"
        : verifiedPaid > 0
          ? "partial"
          : "unpaid";
  }

  // Reuse existing invoice id with suffix if collision happens on safeInvoiceId
  const existingSameId = await prisma.invoice.findFirst({
    where: { OR: [{ id: safeInvoiceId }, { nomorInvoice }] },
  });
  const finalId = existingSameId ? `${safeInvoiceId}-${randomSuffix}` : safeInvoiceId;
  const finalNomor = existingSameId ? `${nomorInvoice}-${randomSuffix}` : nomorInvoice;

  const created = await prisma.invoice.create({
    data: {
      id: finalId,
      groupId: data.groupId,
      nomorInvoice: finalNomor,
      tipe: normalizedTipe,
      jumlah: invoiceAmount,
      sisaTagihan: invoiceSisa,
      status: invoiceStatus,
      jatuhTempo: data.jatuhTempo ? new Date(data.jatuhTempo) : new Date(Date.now() + 14 * 86400000),
    },
  });

  // Remove/promote any pre-issuance billing ledger (BILL-...) cleanly to avoid duplicating items
  try {
    const existingDraft = await prisma.invoice.findUnique({ where: { id: draftId } });
    if (existingDraft) {
      await prisma.pembayaran.updateMany({
        where: { invoiceId: draftId },
        data: { invoiceId: created.id },
      });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: draftId } });
      await prisma.invoice.delete({ where: { id: draftId } });
    }
  } catch (draftErr) {
    console.warn("Promote draft billing ledger warning:", draftErr);
  }

  // Persist invoice items if provided (deduplicating against already-recorded official invoice items)
  if (data.items && data.items.length > 0) {
    let insertedCount = 0;
    for (const rawItem of data.items) {
      const item = normalizeBillingItemInput(rawItem);
      const itemKey = getCanonicalItemDedupeKey(item);
      // Avoid creating duplicate active items across official invoices if already recorded
      if (existingOfficialInvoices.length > 0 && existingOfficialKeys.has(itemKey)) {
        continue;
      }
      try {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: created.id,
            kategori: item.kategori || "Tagihan",
            deskripsi: item.deskripsi,
            qty: item.qty,
            hargaSatuan: item.hargaSatuan,
            jumlah: item.jumlah,
            status: "active",
          },
        });
        insertedCount++;
      } catch (itemErr) {
        console.warn("Failed creating invoiceItem:", itemErr);
      }
    }

    // If all items were already stored on prior invoices, add a clear non-duplicating marker or installment receipt
    if (insertedCount === 0 && isRevision) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: created.id,
          kategori: "Pembaruan Invoice",
          deskripsi: data.catatan || "Pembaruan rincian tagihan & potongan invoice (tanpa pembayaran masuk)",
          qty: 1,
          hargaSatuan: 0,
          jumlah: 0,
          status: "active",
        },
      }).catch(() => {});
    } else if (insertedCount === 0 && data.nominal > 0) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: created.id,
          kategori: "Pembayaran Invoice",
          deskripsi: data.catatan || `Tagihan Pembayaran (${normalizedTipe.toUpperCase()})`,
          qty: 1,
          hargaSatuan: data.nominal,
          jumlah: data.nominal,
          status: "active",
        },
      }).catch(() => {});
    }

    // If no upgrade hotel item exists in this invoice, revert jamaah hotels to package default when no other upgrade exists
    const hasHotelUpgradeInItems = data.items.some((i) =>
      isHotelUpgradeItem(i.deskripsi || "")
    );
    if (!hasHotelUpgradeInItems) {
      await revertGroupHotelsIfNoUpgradeItem(data.groupId);
    }
  }

  // Link existing payment if called during approval; skip creating payment for Pembaruan Invoice (no incoming payment)
  if (data.pembayaranId) {
    await prisma.pembayaran.update({
      where: { id: data.pembayaranId },
      data: { invoiceId: created.id },
    }).catch((err) => console.warn("Link pembayaran to invoice warning:", err));
  } else if (!isRevision) {
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
                : `Tagihan Invoice: ${normalizedTipe}`);

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

  // Update group totalTagihan if provided and different, and sync canonical SSOT totals for revisions
  if (isRevision || (data.items && data.items.length > 0)) {
    await invoiceRepo.syncGroupTotals(data.groupId).catch((err) => {
      console.warn("Sync group totals after invoice creation warning:", err);
    });
  } else if (data.totalTagihan && data.totalTagihan > 0) {
    try {
      const group = await prisma.registrationGroup.findUnique({ where: { id: data.groupId } });
      if (group && group.totalTagihan !== data.totalTagihan) {
        await prisma.registrationGroup.update({
          where: { id: data.groupId },
          data: {
            totalTagihan: data.totalTagihan,
            sisaPembayaran: Math.max(0, data.totalTagihan - group.totalPembayaran),
          },
        });
      }
    } catch (err) {
      console.warn("Update group total tagihan warning:", err);
    }
  }

  try {
    revalidatePath("/admin/manifest");
    revalidatePath("/admin/pembayaran/laporan");
    revalidatePath(`/admin/pembayaran/${data.groupId}`);
  } catch {}

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

export async function cancelInvoiceItem(_invoiceId: string, itemId: string, reason: string, user: string) {
  try {
    const existingItem = await prisma.invoiceItem.findUnique({
      where: { id: itemId },
    });
    const updatedInvoice = await invoiceRepo.cancelItem(itemId, user || "Admin", reason || "Dibatalkan admin");

    if (existingItem && isHotelUpgradeItem(existingItem.deskripsi || "")) {
      await revertGroupHotelsIfNoUpgradeItem(updatedInvoice.groupId);
    }

    try {
      revalidatePath("/admin/manifest");
      revalidatePath("/admin/pembayaran/laporan");
      revalidatePath(`/admin/pembayaran/${updatedInvoice.groupId}`);
    } catch {}

    return updatedInvoice;
  } catch (err) {
    console.error("cancelInvoiceItem error:", err);
    throw err;
  }
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

    // ADR-0030: Trigger non-blocking background re-sync of Google Drive file names
    // strictly isolated to this specific departure package (paketKeberangkatanId)
    if (group.paketKeberangkatanId) {
      const pkgId = group.paketKeberangkatanId;
      syncPackageDocumentFileNamesToDrive(pkgId)
        .then((res) => {
          if (!res.success && res.errors.length > 0) {
            console.warn(`[ADR-0030 Drive Re-Sync Warning for Paket ${pkgId}]:`, res.errors);
          }
        })
        .catch((driveErr) => {
          console.warn(`[ADR-0030 Drive Re-Sync Background Error for Paket ${pkgId}]:`, driveErr);
        });
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

/**
 * Update data hotel (Makkah & Madinah) jamaah di manifest / database saat upgrade hotel dipilih
 */
export async function updateJamaahHotels(data: {
  jamaahIds?: string[];
  jamaahNames?: string[];
  groupId?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
}) {
  try {
    const { jamaahIds, jamaahNames, groupId, hotelMekkah, hotelMadinah } = data;
    const updateData: Record<string, string> = {};
    if (hotelMekkah && hotelMekkah.trim()) updateData.hotelMekkah = hotelMekkah.trim();
    if (hotelMadinah && hotelMadinah.trim()) updateData.hotelMadinah = hotelMadinah.trim();

    if (Object.keys(updateData).length === 0) {
      return { success: false, message: "Tidak ada data hotel yang diperbarui" };
    }

    if (jamaahIds && jamaahIds.length > 0) {
      await prisma.jamaah.updateMany({
        where: { id: { in: jamaahIds } },
        data: updateData,
      });
    } else if (jamaahNames && jamaahNames.length > 0 && groupId) {
      await prisma.jamaah.updateMany({
        where: {
          groupId,
          namaLengkap: { in: jamaahNames },
        },
        data: updateData,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateJamaahHotels error:", err);
    return { success: false, message: err?.message || "Gagal mengupdate hotel jamaah" };
  }
}

/**
 * Mengambil daftar hotel master Mekkah dan Madinah
 */
export async function getMasterHotels(): Promise<{ mekkah: string[]; madinah: string[] }> {
  try {
    const hotels = await prisma.masterHotel.findMany({
      include: { city: true },
      orderBy: { name: "asc" },
    });

    const mekkah = hotels
      .filter((h) => {
        const cCode = (h.city?.code || "").toLowerCase();
        const cName = (h.city?.name || "").toLowerCase();
        const hName = h.name.toLowerCase();
        return (
          cCode === "mek" ||
          cCode === "mkh" ||
          cCode === "mak" ||
          cName.includes("mekkah") ||
          cName.includes("makkah") ||
          hName.includes("makkah") ||
          hName.includes("mekkah")
        );
      })
      .map((h) => h.name);

    const madinah = hotels
      .filter((h) => {
        const cCode = (h.city?.code || "").toLowerCase();
        const cName = (h.city?.name || "").toLowerCase();
        const hName = h.name.toLowerCase();
        return (
          cCode === "med" ||
          cCode === "mdn" ||
          cName.includes("madinah") ||
          cName.includes("medina") ||
          hName.includes("madinah") ||
          hName.includes("medina")
        );
      })
      .map((h) => h.name);

    return { mekkah, madinah };
  } catch (err) {
    console.warn("getMasterHotels error:", err);
    return { mekkah: [], madinah: [] };
  }
}
