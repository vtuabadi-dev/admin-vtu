"use client";

import type { InvoiceOrderItem, InvoicePaymentRecord, InvoicePdfData } from "@/shared/lib/invoice-pdf";
import type {
  GroupPaymentSummary,
  Pembayaran,
  MetodePembayaran,
  InvoiceSplitConfig,
  InvoiceSplitItem,
} from "@/shared/types";
import {
  isBaseRoomType as ssotIsBaseRoomType,
  detectRoomTypeFromName as ssotDetectRoomTypeFromName,
  isRoomUpgradeItem as ssotIsRoomUpgradeItem,
  isHotelUpgradeItem as ssotIsHotelUpgradeItem,
  resolveKlasterNameFromSource,
  resolvePackageBillingConfig,
  resolveRoomUpgradeUnitPrice,
  getCanonicalItemDedupeKey,
  parseBillingItemAllocation,
  formatBillingItemDescriptionWithAllocation,
  shouldSkipNonBillingInvoiceItem as ssotShouldSkipNonBillingInvoiceItem,
  hasMaterializedRoomOrFullLedger,
} from "@/shared/lib/billing-ssot";

export {
  hasMaterializedRoomOrFullLedger,
  resolvePackageBillingConfig,
  resolveRoomUpgradeUnitPrice,
  parseBillingItemAllocation,
  formatBillingItemDescriptionWithAllocation,
};

// ============================================================
// INTERFACES
// ============================================================

export interface BillingItem {
  id: string;
  nama: string;
  kategori: "utama" | "tambahan" | "potongan";
  nominal: number;
  qty: number;
  satuan?: string;
  catatan?: string;
  isDefault?: boolean;
  allocatedJamaah?: string[];
  hotelMekkah?: string;
  hotelMadinah?: string;
}

export const DEFAULT_SATUAN_OPTIONS = [
  "Pax",
  "Kamar",
  "Pcs",
  "Set",
  "Box",
  "Kg",
  "Unit",
  "Hari",
  "Org",
  "Tiket",
];

// ============================================================
// CONSTANTS
// ============================================================

export const metodeOptions = [
  { value: "transfer", label: "Transfer" },
  { value: "cash", label: "Tunai" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "qris", label: "QRIS" },
];

export const ALASAN_REJECT = [
  { value: "Nominal tidak sesuai", label: "Nominal tidak sesuai" },
  { value: "Transfer tidak ditemukan", label: "Transfer tidak ditemukan" },
  { value: "Bukti transfer blur", label: "Bukti transfer blur" },
  { value: "Rekening tidak dikenal", label: "Rekening tidak dikenal" },
  { value: "Lainnya", label: "Lainnya" },
];

export const ROOM_TYPE_OPTIONS = [
  { value: "Quad", label: "Quad (4 Pax)", badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
  { value: "Quad Family", label: "Quad Family (4 Pax)", badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800" },
  { value: "Quad Infant", label: "Quad Infant", badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800" },
  { value: "Triple", label: "Triple (3 Pax)", badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { value: "Double", label: "Double (2 Pax)", badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800" },
  { value: "Mix", label: "Mix (Diatur Travel)", badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800" },
  { value: "Single", label: "Single (1 Pax)", badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" },
];

export const DEFAULT_TAMBAHAN_OPTIONS = [
  "Upgrade Kamar Double",
  "Upgrade Kamar Triple",
  "Upgrade Kamar Single",
  "Tiket Kereta Cepat Haramain (Mekkah - Madinah)",
  "Upgrade Hotel Bintang 5",
  "Paspor Express & Penanganan Dokumen",
  "Perlengkapan Tambahan & Handling",
  "Ongkos Jahit Seragam Batik",
  "Sewa Kursi Roda & Muthawwif Pendorong",
  "Pengurusan Visa Khusus / Single",
  "Biaya Overbagasi / Airport Handling",
];

export const DEFAULT_POTONGAN_OPTIONS = [
  "Diskon Promo Early Bird",
  "Voucher Potongan Khusus",
  "Potongan Group / Cashback",
  "Keringanan Biaya Anak / Balita",
  "Potongan Manajemen / Direksi",
  "Diskon Spesial Mitra",
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getRoomTypeBadgeStyle(roomType?: string): string {
  const norm = (roomType || "quad").toLowerCase().trim();
  if (norm.includes("double")) return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800";
  if (norm.includes("triple")) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800";
  if (norm.includes("family") || norm.includes("infant")) return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800";
  if (norm.includes("single")) return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800";
  if (norm.includes("mix")) return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800";
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
}

export function isHotelUpgradeItem(name: string): boolean {
  return ssotIsHotelUpgradeItem(name);
}

export const DEFAULT_MEKKAH_HOTELS = [
  "Pullman Zamzam Makkah",
  "Fairmont Makkah Clock Royal Tower",
  "Swissotel Makkah",
  "Swissotel Al Maqam Makkah",
  "Dar Al Eiman Royal",
  "Movenpick Hotel & Residence Hajar Tower",
  "Safwah Tower Makkah",
  "Hilton Suites Makkah",
  "Hilton Makkah Convention Hotel",
  "Grand Al Massa",
  "Rayyana Grand Plaza",
  "Le Meridien Makkah",
  "Jabal Omar Marriott",
  "Anjum Hotel Makkah",
  "Al Safwah Royale Orchid",
];

export const DEFAULT_MADINAH_HOTELS = [
  "Taiba Front Hotel Madinah",
  "Anwar Al Madinah Movenpick",
  "Pullman Zamzam Madinah",
  "Dallah Taibah Hotel",
  "Rove Al Madinah Hotel",
  "Madinah Hilton",
  "Frontel Al Harithia",
  "Al Aqeeq Madinah Hotel",
  "Grand Plaza Madinah",
  "Dar Al Taqwa Madinah",
  "Oberoi Madinah",
  "Saja Al Madinah",
  "Mirage Al Salam",
];

export function isRoomUpgradeItem(name: string): boolean {
  return ssotIsRoomUpgradeItem(name);
}

/**
 * Menentukan apakah tipe kamar merupakan kamar dasar (Base Room) paket umroh.
 * Kamar dasar (Quad, Quad Family, Quad Infant, Quad Fix, Mix) tidak dikenakan tambahan biaya upgrade (Rp 0).
 * Hanya Double, Triple, dan Single yang memiliki tambahan biaya upgrade.
 */
export function isBaseRoomType(roomType?: string): boolean {
  return ssotIsBaseRoomType(roomType);
}

export function detectRoomTypeFromName(name: string): string {
  return ssotDetectRoomTypeFromName(name);
}

export function resolveKlasterName(p: any): string {
  return resolveKlasterNameFromSource(p);
}

export function resolvePackageClusterDetails(paymentOrGroup: any): {
  clusterName: string;
  variantName?: string;
  hargaBase: number;
  upgradeDouble: number;
  upgradeTriple: number;
  upgradeSingle: number;
  hotelMekkah?: string;
  hotelMadinah?: string;
  isCustomCluster: boolean;
} {
  const kbr =
    paymentOrGroup?.group?.keberangkatan ||
    paymentOrGroup?.keberangkatan ||
    paymentOrGroup?.paketKeberangkatan;
  const groupObj = paymentOrGroup?.group || paymentOrGroup;
  const cfg = resolvePackageBillingConfig({
    activePackage: kbr,
    group: groupObj,
    member: paymentOrGroup,
  });

  return {
    clusterName: cfg.clusterName,
    variantName: cfg.variantName,
    hargaBase: cfg.hargaBase,
    upgradeDouble: cfg.upgradeDouble,
    upgradeTriple: cfg.upgradeTriple,
    upgradeSingle: cfg.upgradeSingle,
    hotelMekkah: cfg.hotelMekkah,
    hotelMadinah: cfg.hotelMadinah,
    isCustomCluster: cfg.isCustomCluster,
  };
}

export function getPackageUpgradePrice(paymentOrGroup: any, itemNameOrRoomType: string): number {
  if (!itemNameOrRoomType) return 0;
  const details = resolvePackageClusterDetails(paymentOrGroup);
  return resolveRoomUpgradeUnitPrice(details, itemNameOrRoomType);
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

export function getInitialTambahanOptions(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("vtu_master_tambahan_opts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Bersihkan item upgrade quad jika pernah tersimpan di cache browser
          return parsed.filter((opt: string) => !opt.toLowerCase().includes("quad"));
        }
      }
    } catch {}
  }
  return DEFAULT_TAMBAHAN_OPTIONS;
}

export function getInitialPotonganOptions(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("vtu_master_potongan_opts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_POTONGAN_OPTIONS;
}

// Module-level in-memory cache for Review Queue to avoid skeleton flicker on tab switch/revisit
export let cachedReviewQueue: any[] | null = null;

export function setCachedReviewQueue(data: any[]) {
  cachedReviewQueue = data;
}

export function getInitialReviewQueue(): any[] {
  if (cachedReviewQueue && cachedReviewQueue.length > 0) return cachedReviewQueue;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("vtu_review_queue_cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedReviewQueue = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function getClientInvoiceItemKey(it: { kategori?: string; deskripsi?: string; tipe?: string; hargaSatuan?: number; jumlah?: number }): string {
  return getCanonicalItemDedupeKey(it);
}

function shouldSkipNonBillingInvoiceItem(it: { kategori?: string; deskripsi?: string; status?: string }): boolean {
  return ssotShouldSkipNonBillingInvoiceItem(it);
}

/**
 * Extract saved active invoice items and merge them cleanly into initial BillingItem[].
 * Preserves manifest/room defaults and deduplicates items across multiple invoices.
 */
export function mergeSavedBillingItemsFromInvoices(
  baseItems: BillingItem[],
  invoices?: any[]
): BillingItem[] {
  if (!invoices || invoices.length === 0) return baseItems;

  const result = baseItems.map((it) => ({ ...it }));
  const seenKeys = new Set<string>(
    result.map((it) => getClientInvoiceItemKey({ kategori: it.kategori, deskripsi: it.nama }))
  );

  for (const inv of invoices) {
    if (!inv || inv.status === "cancelled") continue;
    for (const it of inv.items || []) {
      if (shouldSkipNonBillingInvoiceItem(it)) continue;
      const katLower = (it.kategori || "").toLowerCase();
      const isPotongan =
        katLower === "potongan" ||
        katLower === "pengurangan" ||
        (it.hargaSatuan || 0) < 0 ||
        (it.jumlah || 0) < 0;
      const qty = Math.max(1, Math.round(Number(it.qty) || 1));
      const rawUnit = Number(it.hargaSatuan);
      const unitNominal = Number.isFinite(rawUnit)
        ? Math.abs(Math.round(rawUnit))
        : Math.abs(Math.round((Number(it.jumlah) || 0) / qty));
      const parsedAlloc = parseBillingItemAllocation(it.deskripsi || it.kategori || "Item Tagihan");
      const cleanNama = parsedAlloc.cleanNama || it.deskripsi || it.kategori || "Item Tagihan";
      const key = getClientInvoiceItemKey(it);

      if (seenKeys.has(key)) {
        const idx = result.findIndex(
          (b) => getClientInvoiceItemKey({ kategori: b.kategori, deskripsi: b.nama }) === key
        );
        const existing = idx >= 0 ? result[idx] : undefined;
        if (existing && (unitNominal > 0 || parsedAlloc.allocatedJamaah.length > 0)) {
          result[idx] = {
            ...existing,
            nama: cleanNama,
            nominal: unitNominal > 0 ? unitNominal : existing.nominal,
            qty: unitNominal > 0 ? qty : existing.qty,
            allocatedJamaah:
              parsedAlloc.allocatedJamaah.length > 0
                ? parsedAlloc.allocatedJamaah
                : existing.allocatedJamaah,
          };
        }
        continue;
      }

      seenKeys.add(key);
      result.push({
        id: it.id ? `db-${it.id}` : `db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nama: cleanNama,
        kategori: isPotongan ? "potongan" : key === "__BASE_PACKAGE__" ? "utama" : "tambahan",
        nominal: unitNominal,
        qty,
        satuan: "Pax",
        isDefault: key === "__BASE_PACKAGE__",
        ...(parsedAlloc.allocatedJamaah.length > 0
          ? { allocatedJamaah: parsedAlloc.allocatedJamaah }
          : {}),
      });
    }
  }

  return result;
}

/**
 * Extract saved active invoice items and merge them into PaymentReviewTab InvoiceOrderItem[]
 * (where nominal = total = hargaSatuan * qty, and base package is rendered separately).
 */
export function mergeSavedOrderItemsFromInvoices(
  baseOrderItems: InvoiceOrderItem[],
  invoices?: any[]
): InvoiceOrderItem[] {
  if (!invoices || invoices.length === 0) return baseOrderItems;

  const result = baseOrderItems.map((it) => ({ ...it }));
  const seenKeys = new Set<string>(
    result.map((it) => getClientInvoiceItemKey({ kategori: it.kategori, deskripsi: it.nama, tipe: it.tipe }))
  );

  for (const inv of invoices) {
    if (!inv || inv.status === "cancelled") continue;
    for (const it of inv.items || []) {
      if (shouldSkipNonBillingInvoiceItem(it)) continue;
      const key = getClientInvoiceItemKey(it);
      if (key === "__BASE_PACKAGE__") continue;

      const katLower = (it.kategori || "").toLowerCase();
      const isPotongan =
        katLower === "potongan" ||
        katLower === "pengurangan" ||
        (it.hargaSatuan || 0) < 0 ||
        (it.jumlah || 0) < 0;
      const qty = Math.max(1, Math.round(Number(it.qty) || 1));
      const rawUnit = Number(it.hargaSatuan);
      const unitNominal = Number.isFinite(rawUnit)
        ? Math.abs(Math.round(rawUnit))
        : Math.abs(Math.round((Number(it.jumlah) || 0) / qty));
      const parsedAlloc = parseBillingItemAllocation(it.deskripsi || it.kategori || "Item Tagihan");
      const cleanNama = parsedAlloc.cleanNama || it.deskripsi || it.kategori || "Item Tagihan";
      const totalNominal = unitNominal * qty;

      if (seenKeys.has(key)) {
        const idx = result.findIndex(
          (o) => getClientInvoiceItemKey({ kategori: o.kategori, deskripsi: o.nama, tipe: o.tipe }) === key
        );
        const existing = idx >= 0 ? result[idx] : undefined;
        if (existing && (unitNominal > 0 || parsedAlloc.allocatedJamaah.length > 0)) {
          result[idx] = {
            ...existing,
            nama: cleanNama,
            hargaSatuan: unitNominal > 0 ? unitNominal : existing.hargaSatuan,
            qty: unitNominal > 0 ? qty : existing.qty,
            nominal: unitNominal > 0 ? totalNominal : existing.nominal,
            allocatedJamaah:
              parsedAlloc.allocatedJamaah.length > 0
                ? parsedAlloc.allocatedJamaah
                : existing.allocatedJamaah,
          };
        }
        continue;
      }

      seenKeys.add(key);
      result.push({
        id: it.id ? `db-${it.id}` : `db-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nama: cleanNama,
        kategori: isPotongan ? "potongan" : "tambahan",
        tipe: isPotongan ? "pengurangan" : "penambahan",
        qty,
        satuan: "Pax",
        hargaSatuan: unitNominal,
        nominal: totalNominal,
        ...(parsedAlloc.allocatedJamaah.length > 0
          ? { allocatedJamaah: parsedAlloc.allocatedJamaah }
          : {}),
      });
    }
  }

  return result;
}

export function mapBillingItemsToSyncPayload(items: BillingItem[]) {
  return items.map((b) => ({
    kategori: b.kategori,
    deskripsi: formatBillingItemDescriptionWithAllocation(b.nama, b.allocatedJamaah),
    qty: Math.max(1, b.qty || 1),
    hargaSatuan: b.nominal,
    jumlah: b.nominal * Math.max(1, b.qty || 1),
  }));
}

export function calculateBillingItemsNetTotal(items: BillingItem[]): number {
  return items.reduce((sum, i) => {
    const sub = (i.nominal || 0) * Math.max(1, i.qty || 1);
    return i.kategori === "potongan" ? sum - sub : sum + sub;
  }, 0);
}

export function buildInvoicePdfDataForGroup(params: {
  group: any;
  billingItems: BillingItem[];
  invoiceNumber: string;
  invoiceDate?: string;
  jatuhTempo?: string | Date;
  catatan?: string;
  nominalPembayaran?: number;
}): InvoicePdfData {
  const { group, billingItems, invoiceNumber, invoiceDate, jatuhTempo, catatan, nominalPembayaran } = params;
  const paxCount = Math.max(
    1,
    group?.jumlahAnggota || group?.anggota?.length || group?.anggotaIds?.length || 1
  );
  const pkg = group?.keberangkatan || group?.paketKeberangkatan;
  const pkgCfg = resolvePackageBillingConfig({
    activePackage: pkg,
    group,
    member: group?.anggota?.[0],
  });

  const utamaItems = billingItems.filter((i) => i.kategori === "utama");
  const totalUtama = utamaItems.reduce((s, i) => s + (i.nominal || 0) * Math.max(1, i.qty || 1), 0);
  const hargaSatuanPaket =
    utamaItems.length > 0 && utamaItems[0]
      ? utamaItems[0].nominal || Math.round(totalUtama / paxCount)
      : pkgCfg.hargaBase;

  const baseTotal = totalUtama > 0 ? totalUtama : hargaSatuanPaket * paxCount;
  const totalBebanTambahan = billingItems
    .filter((i) => i.kategori === "tambahan")
    .reduce((s, i) => s + (i.nominal || 0) * Math.max(1, i.qty || 1), 0);
  const totalPengurangan = billingItems
    .filter((i) => i.kategori === "potongan")
    .reduce((s, i) => s + (i.nominal || 0) * Math.max(1, i.qty || 1), 0);
  const netTotal = Math.max(0, baseTotal + totalBebanTambahan - totalPengurangan);

  const verifiedPayments = (group?.pembayaran || []).filter((p: any) => p.status === "verified");
  const totalPembayaran =
    verifiedPayments.length > 0
      ? verifiedPayments.reduce((s: number, p: any) => s + Number(p.jumlah || 0), 0)
      : Number(group?.totalPembayaran || 0);
  const sisaTagihan = Math.max(0, netTotal - totalPembayaran);

  const orderItems: InvoiceOrderItem[] = billingItems
    .filter((i) => i.kategori !== "utama")
    .map((i) => ({
      id: i.id,
      kategori: i.kategori,
      nama: i.nama,
      tipe: i.kategori === "potongan" ? "pengurangan" : "penambahan",
      nominal: (i.nominal || 0) * Math.max(1, i.qty || 1),
      qty: Math.max(1, i.qty || 1),
      hargaSatuan: i.nominal || 0,
      satuan: i.satuan || "Pax",
      allocatedJamaah: i.allocatedJamaah,
      hotelMekkah: i.hotelMekkah,
      hotelMadinah: i.hotelMadinah,
    }));

  const paymentHistory: InvoicePaymentRecord[] = verifiedPayments.map((p: any) => ({
    tanggal: p.tanggal
      ? new Date(p.tanggal).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-",
    metode: (p.metode || "transfer").toUpperCase(),
    nominal: Number(p.jumlah || 0),
  }));

  const memberNames = (group?.anggota || [])
    .map((a: any) => a?.namaLengkap)
    .filter(Boolean);

  return {
    invoiceNumber,
    invoiceDate:
      invoiceDate ||
      new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    kodeRegistrasi: group?.kodeRegistrasi || "-",
    namaGroup: group?.namaGroup || "Rombongan Jamaah",
    picName: group?.ketuaGroup?.namaLengkap || group?.kontakNama || group?.namaGroup,
    picPhone: group?.ketuaGroup?.telepon || group?.kontakHp || group?.anggota?.[0]?.nomorTelepon,
    telepon: group?.ketuaGroup?.telepon || group?.kontakHp || group?.anggota?.[0]?.nomorTelepon,
    namaPaket: pkg?.namaPaket || "Paket Umroh",
    jumlahPax: paxCount,
    hargaSatuanPaket,
    tanggalBerangkat: pkg?.tanggalBerangkat
      ? new Date(pkg.tanggalBerangkat).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : undefined,
    hotelMekkah: group?.anggota?.[0]?.hotelMekkah || pkgCfg.hotelMekkah || pkg?.hotelMekkah,
    hotelMadinah: group?.anggota?.[0]?.hotelMadinah || pkgCfg.hotelMadinah || pkg?.hotelMadinah,
    anggota: memberNames,
    orderItems,
    paymentHistory,
    totalTagihan: netTotal,
    totalBebanTambahan,
    totalPengurangan,
    totalTagihanDisesuaikan: netTotal,
    totalPembayaran,
    sisaTagihan,
    nominal: nominalPembayaran ?? 0,
    maksimalPelunasan: jatuhTempo
      ? new Date(jatuhTempo).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : undefined,
    dueDate: jatuhTempo ? new Date(jatuhTempo).toISOString() : undefined,
    catatan,
  };
}

// Re-export types for convenience
export type { InvoiceOrderItem, InvoicePaymentRecord, InvoicePdfData, GroupPaymentSummary, Pembayaran, MetodePembayaran, InvoiceSplitConfig, InvoiceSplitItem };
