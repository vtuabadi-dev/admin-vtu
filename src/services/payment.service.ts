import type {
  GroupPaymentSummary,
  Keberangkatan,
} from "@/shared/types";
import type {
  PaymentStats,
  EnrichedPaymentSummary,
} from "./contracts";

export function enrichSummariesWithPackage(
  summaries: GroupPaymentSummary[],
  kbrList: Keberangkatan[]
): EnrichedPaymentSummary[] {
  return summaries.map((s) => {
    const groupKbr = kbrList.find((k) =>
      k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid))
    );
    return {
      ...s,
      packageName: groupKbr?.paketUmroh?.namaPaket ?? "-",
      packageCode: groupKbr?.kode ?? "-",
    };
  });
}

export function computePaymentStats(
  summaries: GroupPaymentSummary[]
): PaymentStats {
  const totalTagihan = summaries.reduce((sum, s) => sum + s.totalTagihan, 0);
  const totalPembayaran = summaries.reduce((sum, s) => sum + s.totalPembayaran, 0);
  const totalSisa = summaries.reduce((sum, s) => sum + s.sisaPembayaran, 0);
  const overdueCount = summaries.filter((s) => s.status === "overdue").length;
  const lunasCount = summaries.filter((s) => s.status === "lunas").length;

  return {
    totalTagihan,
    totalPembayaran,
    totalSisa,
    overdueCount,
    lunasCount,
    groupCount: summaries.length,
  };
}

export function filterSummariesByPackage(
  enriched: EnrichedPaymentSummary[],
  kbrList: Keberangkatan[],
  paketFilter: string
): EnrichedPaymentSummary[] {
  if (paketFilter === "semua") return enriched;
  return enriched.filter((s) => {
    const groupKbr = kbrList.find((k) =>
      k.jamaahIds.some((jid) => s.anggota.some((a) => a.id === jid))
    );
    return groupKbr?.id === paketFilter;
  });
}

export function filterSummariesByStatus(
  summaries: GroupPaymentSummary[],
  statusFilter: string
): GroupPaymentSummary[] {
  if (statusFilter === "semua") return summaries;
  return summaries.filter((s) => s.status === statusFilter);
}

export function getUnpaidSummaries(
  summaries: GroupPaymentSummary[]
): GroupPaymentSummary[] {
  return summaries.filter((s) => s.sisaPembayaran > 0);
}

export function buildPaketOptions(kbrList: Keberangkatan[]) {
  const unique = new Map<string, string>();
  for (const k of kbrList) unique.set(k.id, k.paketUmroh?.namaPaket ?? k.kode);
  return [
    { value: "semua", label: "Semua Paket" },
    ...Array.from(unique.entries()).map(([id, nama]) => ({ value: id, label: nama })),
  ];
}
