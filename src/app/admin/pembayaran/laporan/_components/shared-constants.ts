"use client";

import type { InvoiceOrderItem } from "@/shared/lib/invoice-pdf";
import type {
  GroupPaymentSummary,
  Pembayaran,
  MetodePembayaran,
  InvoiceSplitConfig,
  InvoiceSplitItem,
} from "@/shared/types";

// ============================================================
// INTERFACES
// ============================================================

export interface BillingItem {
  id: string;
  nama: string;
  kategori: "utama" | "tambahan" | "potongan";
  nominal: number;
  qty: number;
  catatan?: string;
  isDefault?: boolean;
  allocatedJamaah?: string[];
}

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
  { value: "Triple", label: "Triple (3 Pax)", badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { value: "Double", label: "Double (2 Pax)", badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800" },
  { value: "Mix", label: "Mix (Diatur Travel)", badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800" },
  { value: "Single", label: "Single (1 Pax)", badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" },
];

export const DEFAULT_TAMBAHAN_OPTIONS = [
  "Upgrade Kamar Double",
  "Upgrade Kamar Triple",
  "Upgrade Kamar Single",
  "Upgrade Kamar Quad Family",
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
  if (norm.includes("family")) return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800";
  if (norm.includes("single")) return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800";
  if (norm.includes("mix")) return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800";
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
}

export function isRoomUpgradeItem(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("kamar") ||
    lower.includes("upgrade kamar") ||
    lower.includes("double") ||
    lower.includes("triple") ||
    lower.includes("single") ||
    lower.includes("room")
  );
}

export function detectRoomTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("double")) return "Double";
  if (lower.includes("triple")) return "Triple";
  if (lower.includes("single")) return "Single";
  if (lower.includes("family")) return "Quad Family";
  if (lower.includes("mix")) return "Mix";
  if (lower.includes("quad")) return "Quad";
  return "Double";
}

export function resolveKlasterName(p: any): string {
  if (!p) return "Standard / Non-Cluster";
  const kbr = p.group?.keberangkatan;
  const hotelM = kbr?.hotelMekkah || p.hotelMekkah || "";
  const hotelN = kbr?.hotelMadinah || p.hotelMadinah || "";

  // Detect if package has multiple cluster variants (multi-hotel with slashes or cluster configs)
  const isMultiClusterPackage =
    hotelM.includes("/") ||
    hotelN.includes("/") ||
    Boolean(kbr?.clusterConfigs && Object.keys(kbr.clusterConfigs).length > 0) ||
    Boolean(kbr?.isAdaKlaster === "ya");

  const candidates = [
    p.group?.packageTypeName,
    p.group?.klasterName,
    p.group?.klaster,
    p.group?.clusterName,
    p.group?.selectedCluster,
    p.group?.keberangkatan?.packageType?.name,
    p.group?.keberangkatan?.tipePaket,
    p.packageType,
    p.tipePaket,
    p.klaster,
    p.clusterName,
    p.selectedCluster,
  ];

  for (const cand of candidates) {
    if (cand && typeof cand === "string") {
      const trimmed = cand.trim();
      if (
        trimmed &&
        !/^paket\s+umroh/i.test(trimmed) &&
        !/^standar\s+paket/i.test(trimmed) &&
        !/^non-cluster/i.test(trimmed)
      ) {
        return trimmed;
      }
    }
  }

  const pkgName = p.group?.keberangkatan?.namaPaket || p.namaPaket || "";
  const groupCode = p.group?.kodeRegistrasi || p.kodeRegistrasi || "";
  const combined = `${pkgName} ${groupCode}`.toUpperCase();
  if (combined.includes("PLATINUM")) return "PLATINUM";
  if (combined.includes("GOLD") || combined.includes("VIP")) return "GOLD";
  if (combined.includes("BRONZE") || combined.includes("PROMO")) return "BRONZE";
  if (combined.includes("TURKI") || combined.includes("TURKEY")) return "TURKIYE";
  if (combined.includes("SILVER")) return "SILVER";
  if (combined.includes("REG") || combined.includes("REGULER")) return "REGULER";

  // If package is Single Hotel (no cluster variants available), label as Standard / Non-Cluster
  if (!isMultiClusterPackage) {
    return "Standard / Non-Cluster";
  }

  return "SILVER";
}

export function getPackageUpgradePrice(paymentOrGroup: any, itemNameOrRoomType: string): number {
  if (!itemNameOrRoomType) return 0;
  const lower = itemNameOrRoomType.toLowerCase().trim();

  // Resolve keberangkatan / package info
  const kbr = paymentOrGroup?.keberangkatan || paymentOrGroup?.group?.keberangkatan || paymentOrGroup?.paketKeberangkatan;
  const targetKlaster = resolveKlasterName(paymentOrGroup);

  let upgradeDouble = 2500000;
  let upgradeTriple = 1500000;
  let foundInPackage = false;

  // Cek hotelOptions (array of clusters)
  let hotelOptions = kbr?.hotelOptions || paymentOrGroup?.hotelOptions || paymentOrGroup?.group?.hotelOptions;
  if (typeof hotelOptions === "string") {
    try {
      hotelOptions = JSON.parse(hotelOptions);
    } catch {}
  }

  if (Array.isArray(hotelOptions) && hotelOptions.length > 0) {
    // Cari cluster yang sesuai dengan pilihan jamaah/grup
    let activeCluster = hotelOptions.find(
      (c: any) => c && targetKlaster && c.clusterName && c.clusterName.toLowerCase() === targetKlaster.toLowerCase()
    );
    if (!activeCluster) {
      // Fallback ke cluster pertama yang punya upgradeDouble / upgradeTriple
      activeCluster = hotelOptions.find((c: any) => c && (Number(c.upgradeDouble) > 0 || Number(c.upgradeTriple) > 0)) || hotelOptions[0];
    }
    if (activeCluster) {
      if (activeCluster.upgradeDouble !== undefined && activeCluster.upgradeDouble !== null && Number(activeCluster.upgradeDouble) > 0) {
        upgradeDouble = Number(activeCluster.upgradeDouble);
        foundInPackage = true;
      }
      if (activeCluster.upgradeTriple !== undefined && activeCluster.upgradeTriple !== null && Number(activeCluster.upgradeTriple) > 0) {
        upgradeTriple = Number(activeCluster.upgradeTriple);
        foundInPackage = true;
      }
    }
  }

  // Cek direct properties jika ada (cth: kbr.upgradeDouble, group.upgradeDouble, dsb)
  if (!foundInPackage) {
    if (kbr?.upgradeDouble && Number(kbr.upgradeDouble) > 0) upgradeDouble = Number(kbr.upgradeDouble);
    if (kbr?.upgradeTriple && Number(kbr.upgradeTriple) > 0) upgradeTriple = Number(kbr.upgradeTriple);
    if (paymentOrGroup?.group?.upgradeDouble && Number(paymentOrGroup.group.upgradeDouble) > 0) upgradeDouble = Number(paymentOrGroup.group.upgradeDouble);
    if (paymentOrGroup?.group?.upgradeTriple && Number(paymentOrGroup.group.upgradeTriple) > 0) upgradeTriple = Number(paymentOrGroup.group.upgradeTriple);
  }

  if (lower.includes("double") || lower === "double") {
    return upgradeDouble;
  }
  if (lower.includes("triple") || lower === "triple") {
    return upgradeTriple;
  }
  if (lower.includes("single") || lower === "single") {
    return Math.round(upgradeDouble * 1.5);
  }
  if (lower.includes("family") || lower === "quad family") {
    return Math.round(upgradeTriple * 0.8);
  }

  return 0;
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

// Re-export types for convenience
export type { InvoiceOrderItem, GroupPaymentSummary, Pembayaran, MetodePembayaran, InvoiceSplitConfig, InvoiceSplitItem };
