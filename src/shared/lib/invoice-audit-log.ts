import type {
  BillingItemDelta,
  BillingItemSnapshot,
  Invoice,
  InvoiceAuditEventKind,
  InvoiceAuditLogEntry,
  Pembayaran,
} from "@/shared/types";

const formatRp = (n: number): string =>
  `Rp ${Math.abs(Math.round(n || 0)).toLocaleString("id-ID")}`;

const formatSignedRp = (n: number): string => {
  const rounded = Math.round(n || 0);
  if (rounded === 0) return "Rp 0";
  return `${rounded > 0 ? "+" : "-"}${formatRp(rounded)}`;
};

export function normalizeBillingItemKey(item: { kategori?: string; deskripsi?: string }): string {
  const kat = (item.kategori || "").toLowerCase().trim();
  const desc = (item.deskripsi || "").toLowerCase().trim();
  return `${kat}::${desc}`;
}

export function isDiscountBillingItem(item: {
  kategori?: string;
  deskripsi?: string;
  hargaSatuan?: number;
  jumlah?: number;
}): boolean {
  const kat = (item.kategori || "").toLowerCase();
  const desc = (item.deskripsi || "").toLowerCase();
  return (
    kat.includes("potongan") ||
    kat.includes("diskon") ||
    desc.includes("diskon") ||
    desc.includes("potongan") ||
    desc.includes("promo") ||
    desc.includes("voucher") ||
    (item.jumlah ?? 0) < 0 ||
    (item.hargaSatuan ?? 0) < 0
  );
}

/**
 * Normalizes an item's effective net financial contribution (discounts negative, charges positive).
 */
export function getSignedBillingItemAmount(item: {
  kategori?: string;
  deskripsi?: string;
  qty?: number;
  hargaSatuan?: number;
  jumlah?: number;
  status?: string;
}): number {
  if (item.status === "cancelled") return 0;
  const raw = Number(item.jumlah ?? (Number(item.qty || 1) * Number(item.hargaSatuan || 0)));
  if (raw < 0) return raw;
  if (isDiscountBillingItem(item) && raw > 0) return -raw;
  return raw;
}

export function inferManifestImpactLabels(
  inputs: Array<{ kategori?: string; deskripsi?: string }> | string,
  eventKind?: InvoiceAuditEventKind
): string[] {
  const text =
    typeof inputs === "string"
      ? inputs.toLowerCase()
      : inputs
          .map((i) => `${i.kategori || ""} ${i.deskripsi || ""}`)
          .join(" ")
          .toLowerCase();

  const tags = new Set<string>();

  if (
    text.includes("hotel") ||
    text.includes("mekkah") ||
    text.includes("madinah") ||
    text.includes("safwah") ||
    text.includes("movenpick") ||
    text.includes("pullman") ||
    text.includes("hilton") ||
    text.includes("dar al eiman") ||
    text.includes("fairmont") ||
    eventKind === "UPGRADE_HOTEL"
  ) {
    tags.add("Upgrade Hotel");
  }
  if (
    text.includes("kamar") ||
    text.includes("room") ||
    text.includes("double") ||
    text.includes("triple") ||
    text.includes("quad") ||
    text.includes("quint")
  ) {
    tags.add("Upgrade Kamar");
  }
  if (text.includes("kereta cepat") || text.includes("haramain")) {
    tags.add("Kereta Cepat");
  }
  if (text.includes("thoif") || text.includes("taif")) {
    tags.add("City Tour Thoif");
  }
  if (
    text.includes("paspor") ||
    text.includes("kursi roda") ||
    text.includes("ongkir") ||
    text.includes("ongkos jahit") ||
    text.includes("perlengkapan") ||
    text.includes("batik") ||
    text.includes("koper")
  ) {
    tags.add("Perlengkapan & Add-on");
  }
  if (
    text.includes("diskon") ||
    text.includes("potongan") ||
    text.includes("promo") ||
    text.includes("voucher")
  ) {
    tags.add("Diskon / Potongan");
  }
  if (
    eventKind === "TAMBAH_JAMAAH" ||
    text.includes("tambah jamaah") ||
    text.includes("penambahan jamaah") ||
    text.includes("inv-pax")
  ) {
    tags.add("Data Jamaah & Kuota");
  }
  if (
    eventKind === "PINDAH_PAKET" ||
    text.includes("pindah paket") ||
    text.includes("pindah-")
  ) {
    tags.add("Manifest Paket Keberangkatan");
  }
  if (
    eventKind === "PEMBATALAN_ITEM" ||
    eventKind === "REFUND" ||
    text.includes("batal") ||
    text.includes("cancel") ||
    text.includes("refund")
  ) {
    tags.add("Pembatalan / Penyesuaian");
  }

  if (tags.size === 0) {
    tags.add("Manifest Pembayaran");
  }

  return Array.from(tags);
}

export function computeBillingItemsDiff(
  beforeItems: BillingItemSnapshot[],
  afterItems: BillingItemSnapshot[]
): {
  itemsDiff: BillingItemDelta[];
  deltaTotal: number;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  hasChanges: boolean;
} {
  const activeBefore = beforeItems.filter((i) => i.status !== "cancelled");
  const activeAfter = afterItems.filter((i) => i.status !== "cancelled");

  const beforeBuckets = new Map<string, BillingItemSnapshot[]>();
  for (const item of activeBefore) {
    const key = normalizeBillingItemKey(item);
    const list = beforeBuckets.get(key) || [];
    list.push(item);
    beforeBuckets.set(key, list);
  }

  const itemsDiff: BillingItemDelta[] = [];

  for (const afterItem of activeAfter) {
    const key = normalizeBillingItemKey(afterItem);
    const bucket = beforeBuckets.get(key);
    const matchedBefore = bucket && bucket.length > 0 ? bucket.shift() : undefined;

    const afterSigned = getSignedBillingItemAmount(afterItem);
    if (!matchedBefore) {
      itemsDiff.push({
        type: "added",
        deskripsi: afterItem.deskripsi,
        kategori: afterItem.kategori || "Tagihan",
        afterQty: afterItem.qty,
        afterHargaSatuan: afterItem.hargaSatuan,
        afterJumlah: afterSigned,
        deltaJumlah: afterSigned,
      });
      continue;
    }

    const beforeSigned = getSignedBillingItemAmount(matchedBefore);
    if (
      matchedBefore.qty !== afterItem.qty ||
      matchedBefore.hargaSatuan !== afterItem.hargaSatuan ||
      beforeSigned !== afterSigned
    ) {
      itemsDiff.push({
        type: "updated",
        deskripsi: afterItem.deskripsi,
        kategori: afterItem.kategori || matchedBefore.kategori || "Tagihan",
        beforeQty: matchedBefore.qty,
        afterQty: afterItem.qty,
        beforeHargaSatuan: matchedBefore.hargaSatuan,
        afterHargaSatuan: afterItem.hargaSatuan,
        beforeJumlah: beforeSigned,
        afterJumlah: afterSigned,
        deltaJumlah: afterSigned - beforeSigned,
      });
    }
  }

  for (const [, leftovers] of Array.from(beforeBuckets.entries())) {
    for (const removedItem of leftovers) {
      const beforeSigned = getSignedBillingItemAmount(removedItem);
      itemsDiff.push({
        type: "removed",
        deskripsi: removedItem.deskripsi,
        kategori: removedItem.kategori || "Tagihan",
        beforeQty: removedItem.qty,
        beforeHargaSatuan: removedItem.hargaSatuan,
        beforeJumlah: beforeSigned,
        afterJumlah: 0,
        deltaJumlah: -beforeSigned,
      });
    }
  }

  const deltaTotal = itemsDiff.reduce((sum, d) => sum + d.deltaJumlah, 0);
  const addedCount = itemsDiff.filter((d) => d.type === "added").length;
  const updatedCount = itemsDiff.filter((d) => d.type === "updated").length;
  const removedCount = itemsDiff.filter((d) => d.type === "removed" || d.type === "cancelled").length;

  return {
    itemsDiff,
    deltaTotal,
    addedCount,
    updatedCount,
    removedCount,
    hasChanges: itemsDiff.length > 0,
  };
}

export function formatBillingDiffSummary(
  itemsDiff: BillingItemDelta[],
  totalBefore?: number,
  totalAfter?: number
): string {
  const parts: string[] = [];
  for (const d of itemsDiff.slice(0, 3)) {
    const prefix =
      d.type === "added"
        ? "+"
        : d.type === "updated"
          ? "~"
          : d.type === "cancelled"
            ? "Batal"
            : "-";
    parts.push(`${prefix} ${d.deskripsi} (${formatSignedRp(d.deltaJumlah)})`);
  }
  if (itemsDiff.length > 3) {
    parts.push(`+${itemsDiff.length - 3} item lainnya`);
  }
  if (
    typeof totalBefore === "number" &&
    typeof totalAfter === "number" &&
    totalBefore !== totalAfter
  ) {
    parts.push(`Total Tagihan: ${formatRp(totalBefore)} -> ${formatRp(totalAfter)}`);
  } else if (typeof totalAfter === "number" && parts.length === 0) {
    parts.push(`Total Tagihan: ${formatRp(totalAfter)}`);
  }
  return parts.join(" • ") || "Pembaruan rincian tagihan & invoice";
}

export function getEventKindDisplay(eventKind: InvoiceAuditEventKind): {
  label: string;
  badgeClass: string;
  tone: "amber" | "blue" | "purple" | "emerald" | "red" | "cyan" | "slate";
} {
  switch (eventKind) {
    case "PEMBARUAN_INVOICE":
      return {
        label: "Pembaruan Invoice",
        badgeClass:
          "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        tone: "blue",
      };
    case "SYNC_ITEM_TAGIHAN":
      return {
        label: "Ubah Rincian Tagihan",
        badgeClass:
          "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        tone: "amber",
      };
    case "PENERBITAN_INVOICE":
      return {
        label: "Invoice Terbit",
        badgeClass:
          "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
        tone: "cyan",
      };
    case "TAMBAH_JAMAAH":
      return {
        label: "Tambah Jamaah",
        badgeClass:
          "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        tone: "purple",
      };
    case "PINDAH_PAKET":
      return {
        label: "Pindah Paket",
        badgeClass:
          "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        tone: "blue",
      };
    case "UPGRADE_HOTEL":
      return {
        label: "Update Hotel Jamaah",
        badgeClass:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        tone: "emerald",
      };
    case "PEMBATALAN_ITEM":
      return {
        label: "Pembatalan Item",
        badgeClass:
          "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        tone: "red",
      };
    case "REFUND":
      return {
        label: "Refund Tagihan",
        badgeClass:
          "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        tone: "red",
      };
    case "APPROVAL_PEMBAYARAN":
      return {
        label: "Verifikasi Pembayaran",
        badgeClass:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        tone: "emerald",
      };
    case "PENOLAKAN_PEMBAYARAN":
      return {
        label: "Penolakan Pembayaran",
        badgeClass:
          "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
        tone: "red",
      };
    default:
      return {
        label: "Log Invoice",
        badgeClass:
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        tone: "slate",
      };
  }
}

export function safeJsonParse<T = Record<string, any>>(raw?: string | null): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function isInvoiceRelatedAuditAction(action: string, entityType?: string | null): boolean {
  const a = (action || "").toLowerCase();
  const et = (entityType || "").toLowerCase();
  return (
    et === "invoice_revision" ||
    et === "invoice" ||
    a.startsWith("invoice.") ||
    a.startsWith("billing.") ||
    a === "jamaah.add_pax" ||
    a === "jamaah.hotel_update" ||
    a === "paket.transfer"
  );
}

function mapActionToEventKind(action: string, fallback?: InvoiceAuditEventKind): InvoiceAuditEventKind {
  if (fallback) return fallback;
  const a = (action || "").toLowerCase();
  if (a.includes("pembaruan") || a.includes("revision")) return "PEMBARUAN_INVOICE";
  if (a.includes("sync_items") || a.includes("billing")) return "SYNC_ITEM_TAGIHAN";
  if (a.includes("tambah_jamaah") || a.includes("add_pax")) return "TAMBAH_JAMAAH";
  if (a.includes("pindah") || a.includes("transfer")) return "PINDAH_PAKET";
  if (a.includes("hotel")) return "UPGRADE_HOTEL";
  if (a.includes("cancel") || a.includes("batal")) return "PEMBATALAN_ITEM";
  if (a.includes("refund")) return "REFUND";
  if (a.includes("approve")) return "APPROVAL_PEMBAYARAN";
  if (a.includes("reject")) return "PENOLAKAN_PEMBAYARAN";
  return "PENERBITAN_INVOICE";
}

export function parseAuditEntryToInvoiceLog(
  entry: {
    id: string;
    timestamp: string | Date;
    userId?: string;
    userName: string;
    role?: string;
    module: string;
    action: string;
    detail: string;
    before?: string | null;
    after?: string | null;
    entityId?: string | null;
    entityType?: string | null;
  },
  groupMeta?: {
    groupId?: string;
    kodeRegistrasi?: string;
    namaGroup?: string;
    namaPaket?: string;
  }
): InvoiceAuditLogEntry | null {
  if (!isInvoiceRelatedAuditAction(entry.action, entry.entityType)) {
    return null;
  }

  const beforeSnap = safeJsonParse<Record<string, any>>(entry.before);
  const afterSnap = safeJsonParse<Record<string, any>>(entry.after);

  const eventKind = mapActionToEventKind(entry.action, afterSnap?.eventKind);
  const itemsDiff: BillingItemDelta[] | undefined = Array.isArray(afterSnap?.itemsDiff)
    ? afterSnap.itemsDiff
    : undefined;
  const totalBefore =
    typeof beforeSnap?.totalTagihan === "number" ? beforeSnap.totalTagihan : undefined;
  const totalAfter =
    typeof afterSnap?.totalTagihan === "number" ? afterSnap.totalTagihan : undefined;
  const deltaTotal =
    typeof afterSnap?.deltaTotal === "number"
      ? afterSnap.deltaTotal
      : typeof totalBefore === "number" && typeof totalAfter === "number"
        ? totalAfter - totalBefore
        : undefined;

  const manifestImpact: string[] =
    Array.isArray(afterSnap?.manifestImpact) && afterSnap.manifestImpact.length > 0
      ? afterSnap.manifestImpact
      : inferManifestImpactLabels(entry.detail, eventKind);

  const display = getEventKindDisplay(eventKind);

  return {
    id: entry.id,
    groupId: afterSnap?.groupId || beforeSnap?.groupId || entry.entityId || groupMeta?.groupId || "",
    kodeRegistrasi: afterSnap?.kodeRegistrasi || groupMeta?.kodeRegistrasi,
    namaGroup: afterSnap?.namaGroup || groupMeta?.namaGroup,
    namaPaket: afterSnap?.namaPaket || groupMeta?.namaPaket,
    invoiceId: afterSnap?.invoiceId || beforeSnap?.invoiceId,
    nomorInvoice: afterSnap?.nomorInvoice || beforeSnap?.nomorInvoice,
    timestamp:
      entry.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry.timestamp),
    actorName: entry.userName || "Admin",
    actorRole: entry.role,
    eventKind,
    action: entry.action,
    title: afterSnap?.title || display.label,
    summary: entry.detail,
    manifestImpact,
    totalBefore,
    totalAfter,
    deltaTotal,
    itemsDiff,
    catatan: afterSnap?.catatan,
    source: "audit_entry",
    isLogOnly: true,
    cashInAmount: 0,
  };
}

export function synthesizeInvoiceHistoryLogs(group: {
  id?: string;
  groupId?: string;
  kodeRegistrasi?: string;
  namaGroup?: string;
  namaPaket?: string;
  keberangkatan?: { namaPaket?: string };
  invoices?: Invoice[];
  pembayaran?: Pembayaran[];
}): InvoiceAuditLogEntry[] {
  const groupId = group.groupId || group.id || "";
  const namaPaket = group.namaPaket || group.keberangkatan?.namaPaket;
  const invoices = group.invoices || [];
  const payments = group.pembayaran || [];

  const linkedInvoiceRefs = new Set<string>();
  for (const p of payments) {
    if (p.invoiceId) linkedInvoiceRefs.add(String(p.invoiceId).toLowerCase());
  }

  const logs: InvoiceAuditLogEntry[] = [];

  for (const inv of invoices) {
    const nomor = String(inv.nomorInvoice || inv.id || "");
    const upperNomor = nomor.toUpperCase();
    const isInternalLedger = upperNomor.startsWith("BILL-") || String(inv.id).startsWith("BILL-");
    const activeItems = (inv.items || []).filter((it) => it.status !== "cancelled");
    const cancelledItems = (inv.items || []).filter((it) => it.status === "cancelled");

    // 1. Emit cancellation logs for any cancelled item (including inside BILL-* ledger)
    for (const ci of cancelledItems) {
      const ts = ci.cancelledAt || inv.updatedAt || inv.createdAt;
      logs.push({
        id: `hist-cancel-${ci.id}`,
        groupId,
        kodeRegistrasi: group.kodeRegistrasi,
        namaGroup: group.namaGroup,
        namaPaket,
        invoiceId: inv.id,
        nomorInvoice: nomor,
        timestamp: ts,
        actorName: ci.cancelledBy || "Admin",
        eventKind: "PEMBATALAN_ITEM",
        action: "invoice.cancel_item",
        title: "Pembatalan Item Tagihan",
        summary: `Membatalkan item "${ci.deskripsi}" (${formatRp(ci.jumlah)})${ci.cancellationReason ? ` — ${ci.cancellationReason}` : ""}`,
        manifestImpact: inferManifestImpactLabels([ci], "PEMBATALAN_ITEM"),
        deltaTotal: -Math.abs(ci.jumlah || 0),
        itemsDiff: [
          {
            type: "cancelled",
            deskripsi: ci.deskripsi,
            kategori: ci.kategori || "Tagihan",
            beforeQty: ci.qty,
            beforeHargaSatuan: ci.hargaSatuan,
            beforeJumlah: ci.jumlah,
            afterJumlah: 0,
            deltaJumlah: -getSignedBillingItemAmount({ ...ci, status: "active" }),
          },
        ],
        catatan: ci.cancellationReason,
        source: "invoice_history",
        isLogOnly: true,
        cashInAmount: 0,
      });
    }

    if (isInternalLedger) continue;

    // Determine eventKind by invoice prefix or whether linked to a cash Pembayaran
    let eventKind: InvoiceAuditEventKind | null = null;
    if (upperNomor.startsWith("INV-UPD-")) {
      eventKind = "PEMBARUAN_INVOICE";
    } else if (upperNomor.startsWith("INV-PAX-")) {
      eventKind = "TAMBAH_JAMAAH";
    } else if (upperNomor.startsWith("PINDAH-") || upperNomor.startsWith("INV-PAKET-")) {
      eventKind = "PINDAH_PAKET";
    } else if (upperNomor.startsWith("CN-CANCEL-")) {
      eventKind = "PEMBATALAN_ITEM";
    } else if (upperNomor.startsWith("REF-")) {
      eventKind = "REFUND";
    } else {
      const hasLinkedPayment =
        linkedInvoiceRefs.has(String(inv.id).toLowerCase()) ||
        linkedInvoiceRefs.has(upperNomor.toLowerCase());
      if (!hasLinkedPayment && inv.status !== "cancelled") {
        eventKind = "PENERBITAN_INVOICE";
      }
    }

    if (!eventKind) continue;

    const display = getEventKindDisplay(eventKind);
    const nonMetaItems = activeItems.filter((it) => {
      const k = (it.kategori || "").toLowerCase();
      return k !== "cicilan_dibayar" && k !== "pembayaran" && k !== "dp";
    });
    const previewDesc = nonMetaItems
      .slice(0, 3)
      .map((i) => `${i.deskripsi} (${formatRp(i.jumlah)})`)
      .join(", ");

    const summary =
      eventKind === "PEMBARUAN_INVOICE"
        ? `Pembaruan Invoice ${nomor} tanpa kas masuk (Rp 0)${previewDesc ? ` • Item: ${previewDesc}` : ""} • Net: ${formatRp(inv.jumlah)}`
        : `${display.label} ${nomor}${previewDesc ? ` • ${previewDesc}` : ""} • Nilai: ${formatRp(inv.jumlah)}`;

    logs.push({
      id: `hist-inv-${inv.id}`,
      groupId,
      kodeRegistrasi: group.kodeRegistrasi,
      namaGroup: group.namaGroup,
      namaPaket,
      invoiceId: inv.id,
      nomorInvoice: nomor,
      timestamp: inv.createdAt,
      actorName: "Sistem / Admin",
      eventKind,
      action: `invoice.${eventKind.toLowerCase()}`,
      title: display.label,
      summary,
      manifestImpact: inferManifestImpactLabels(
        nonMetaItems.length > 0 ? nonMetaItems : nomor,
        eventKind
      ),
      totalAfter: inv.jumlah,
      deltaTotal: eventKind === "PEMBARUAN_INVOICE" ? undefined : inv.jumlah,
      itemsDiff: nonMetaItems.map((it) => ({
        type: "added",
        deskripsi: it.deskripsi,
        kategori: it.kategori || "Tagihan",
        afterQty: it.qty,
        afterHargaSatuan: it.hargaSatuan,
        afterJumlah: getSignedBillingItemAmount(it),
        deltaJumlah: getSignedBillingItemAmount(it),
      })),
      source: "invoice_history",
      isLogOnly: true,
      cashInAmount: 0,
    });
  }

  return logs;
}

export function buildGroupInvoiceAuditTimeline(params: {
  group?: {
    id?: string;
    groupId?: string;
    kodeRegistrasi?: string;
    namaGroup?: string;
    namaPaket?: string;
    keberangkatan?: { namaPaket?: string };
    invoices?: Invoice[];
    pembayaran?: Pembayaran[];
  };
  auditEntries?: any[];
  order?: "asc" | "desc";
}): InvoiceAuditLogEntry[] {
  const { group, auditEntries = [], order = "desc" } = params;
  const groupId = group?.groupId || group?.id || "";
  const groupMeta = group
    ? {
        groupId,
        kodeRegistrasi: group.kodeRegistrasi,
        namaGroup: group.namaGroup,
        namaPaket: group.namaPaket || group.keberangkatan?.namaPaket,
      }
    : undefined;

  const parsedAuditLogs: InvoiceAuditLogEntry[] = [];
  for (const row of auditEntries) {
    const parsed = parseAuditEntryToInvoiceLog(row, groupMeta);
    if (!parsed) continue;
    if (groupId && parsed.groupId && parsed.groupId !== groupId) continue;
    parsedAuditLogs.push(parsed);
  }

  const syntheticLogs = group ? synthesizeInvoiceHistoryLogs(group) : [];

  // Deduplicate synthetic logs already backed by a matching AuditEntry
  const coveredInvoiceRefs = new Set<string>();
  const coveredCancellations = new Set<string>();

  for (const log of parsedAuditLogs) {
    if (log.invoiceId) coveredInvoiceRefs.add(String(log.invoiceId).toLowerCase());
    if (log.nomorInvoice) coveredInvoiceRefs.add(String(log.nomorInvoice).toLowerCase());
    if (log.eventKind === "PEMBATALAN_ITEM" && log.itemsDiff) {
      for (const d of log.itemsDiff) {
        coveredCancellations.add(d.deskripsi.toLowerCase().trim());
      }
    }
  }

  const merged = [...parsedAuditLogs];
  for (const synth of syntheticLogs) {
    if (synth.eventKind === "PEMBATALAN_ITEM") {
      const desc = synth.itemsDiff?.[0]?.deskripsi?.toLowerCase().trim();
      if (desc && coveredCancellations.has(desc)) continue;
    } else {
      const refId = synth.invoiceId?.toLowerCase();
      const refNomor = synth.nomorInvoice?.toLowerCase();
      if ((refId && coveredInvoiceRefs.has(refId)) || (refNomor && coveredInvoiceRefs.has(refNomor))) {
        continue;
      }
    }
    merged.push(synth);
  }

  merged.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return order === "asc" ? ta - tb : tb - ta;
  });

  return merged;
}

export function isReviewLogOnlyEntry(item: any): boolean {
  if (!item) return false;
  return Boolean(
    item.isLogOnly === true ||
      item.recordType === "invoice_log" ||
      String(item.id || "").startsWith("invlog-") ||
      item.status === "logged"
  );
}

export function buildQueueItemFromInvoiceLog(
  log: InvoiceAuditLogEntry,
  groupData?: any
): any {
  const display = getEventKindDisplay(log.eventKind);
  return {
    id: `invlog-${log.id}`,
    recordType: "invoice_log" as const,
    isLogOnly: true as const,
    groupId: log.groupId,
    invoiceId: log.nomorInvoice || log.invoiceId || undefined,
    invoiceDbId: log.invoiceId || undefined,
    jumlah: 0,
    metode: "LOG INVOICE",
    tanggal: log.timestamp,
    status: "logged",
    sumber: log.eventKind,
    verifiedBy: log.actorName,
    catatan: `[${display.label}] ${log.summary}`,
    alokasi: [],
    kodeRegistrasi: log.kodeRegistrasi || groupData?.kodeRegistrasi,
    namaGroup: log.namaGroup || groupData?.namaGroup,
    ketuaGroup: groupData?.ketuaGroup,
    auditLog: log,
    group: groupData || undefined,
  };
}

export interface UnifiedPaymentHistoryItem {
  id: string;
  timestamp: string;
  recordType: "payment" | "invoice_log";
  isLogOnly: boolean;
  groupId: string;
  kodeRegistrasi?: string;
  namaGroup?: string;
  invoiceRef?: string;
  title: string;
  description: string;
  metode: string;
  status: string;
  cashInAmount: number;
  actorName?: string;
  deltaTotal?: number;
  totalBefore?: number;
  totalAfter?: number;
  manifestImpact?: string[];
  rawPayment?: Pembayaran;
  rawLog?: InvoiceAuditLogEntry;
}

export function buildUnifiedPaymentHistory(
  payments: Pembayaran[] = [],
  invoiceLogs: InvoiceAuditLogEntry[] = [],
  order: "asc" | "desc" = "desc"
): UnifiedPaymentHistoryItem[] {
  const items: UnifiedPaymentHistoryItem[] = [];

  for (const p of payments) {
    if (isReviewLogOnlyEntry(p)) {
      const log = p.auditLog;
      if (log) {
        const display = getEventKindDisplay(log.eventKind);
        items.push({
          id: p.id,
          timestamp: log.timestamp || p.tanggal,
          recordType: "invoice_log",
          isLogOnly: true,
          groupId: log.groupId || p.groupId,
          kodeRegistrasi: log.kodeRegistrasi || (p as any).kodeRegistrasi,
          namaGroup: log.namaGroup || (p as any).namaGroup,
          invoiceRef: log.nomorInvoice || p.invoiceId,
          title: log.title || display.label,
          description: log.summary || p.catatan || display.label,
          metode: "Log Invoice",
          status: "logged",
          cashInAmount: 0,
          actorName: log.actorName || p.verifiedBy,
          deltaTotal: log.deltaTotal,
          totalBefore: log.totalBefore,
          totalAfter: log.totalAfter,
          manifestImpact: log.manifestImpact,
          rawLog: log,
        });
      }
      continue;
    }

    items.push({
      id: p.id,
      timestamp: p.tanggal || (p as any).createdAt || new Date().toISOString(),
      recordType: "payment",
      isLogOnly: false,
      groupId: p.groupId,
      kodeRegistrasi: (p as any).kodeRegistrasi,
      namaGroup: (p as any).namaGroup,
      invoiceRef: p.invoiceId,
      title:
        p.sumber === "jamaah"
          ? (p as any).catatan || "Pembayaran DP Jamaah"
          : (p as any).catatan || "Pembayaran Masuk",
      description: p.bankPengirim
        ? `${p.bankPengirim}${p.nomorRekening ? ` (${p.nomorRekening})` : ""}${p.catatan ? ` — ${p.catatan}` : ""}`
        : p.catatan || "-",
      metode: p.metode || "transfer",
      status: p.status,
      cashInAmount: Number(p.jumlah || 0),
      actorName: p.verifiedBy || p.reviewedBy,
      rawPayment: p,
    });
  }

  const seenLogIds = new Set(items.filter((i) => i.isLogOnly).map((i) => i.id));
  for (const log of invoiceLogs) {
    const key = `invlog-${log.id}`;
    if (seenLogIds.has(log.id) || seenLogIds.has(key)) continue;
    const display = getEventKindDisplay(log.eventKind);
    items.push({
      id: key,
      timestamp: log.timestamp,
      recordType: "invoice_log",
      isLogOnly: true,
      groupId: log.groupId,
      kodeRegistrasi: log.kodeRegistrasi,
      namaGroup: log.namaGroup,
      invoiceRef: log.nomorInvoice || log.invoiceId,
      title: log.title || display.label,
      description: log.summary,
      metode: "Log Invoice",
      status: "logged",
      cashInAmount: 0,
      actorName: log.actorName,
      deltaTotal: log.deltaTotal,
      totalBefore: log.totalBefore,
      totalAfter: log.totalAfter,
      manifestImpact: log.manifestImpact,
      rawLog: log,
    });
  }

  items.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return order === "asc" ? ta - tb : tb - ta;
  });

  return items;
}
