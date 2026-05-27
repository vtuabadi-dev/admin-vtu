import { describe, it, expect } from "vitest";
import {
  computePaymentStats,
  getUnpaidSummaries,
  filterSummariesByStatus,
} from "../payment.service";
import type { GroupPaymentSummary } from "@/shared/types";

function makeSummary(overrides: Partial<GroupPaymentSummary> = {}): GroupPaymentSummary {
  return {
    groupId: "g1",
    kodeRegistrasi: "GRP-2025-00001",
    namaGroup: "Group A",
    totalTagihan: 50000000,
    totalPembayaran: 30000000,
    sisaPembayaran: 20000000,
    status: "cicilan",
    jumlahAnggota: 5,
    anggota: [],
    pembayaran: [],
    invoices: [],
    ...overrides,
  };
}

describe("computePaymentStats", () => {
  it("returns zero stats for empty summaries", () => {
    const stats = computePaymentStats([]);
    expect(stats).toEqual({
      totalTagihan: 0,
      totalPembayaran: 0,
      totalSisa: 0,
      overdueCount: 0,
      lunasCount: 0,
      groupCount: 0,
    });
  });

  it("aggregates totals correctly", () => {
    const summaries = [
      makeSummary({ totalTagihan: 100, totalPembayaran: 60, sisaPembayaran: 40 }),
      makeSummary({ groupId: "g2", totalTagihan: 200, totalPembayaran: 150, sisaPembayaran: 50 }),
    ];
    const stats = computePaymentStats(summaries);
    expect(stats.totalTagihan).toBe(300);
    expect(stats.totalPembayaran).toBe(210);
    expect(stats.totalSisa).toBe(90);
    expect(stats.groupCount).toBe(2);
  });

  it("counts overdue and lunas statuses", () => {
    const summaries = [
      makeSummary({ status: "lunas" }),
      makeSummary({ groupId: "g2", status: "overdue" }),
      makeSummary({ groupId: "g3", status: "lunas" }),
    ];
    const stats = computePaymentStats(summaries);
    expect(stats.lunasCount).toBe(2);
    expect(stats.overdueCount).toBe(1);
  });
});

describe("getUnpaidSummaries", () => {
  it("returns only summaries with sisaPembayaran > 0", () => {
    const summaries = [
      makeSummary({ sisaPembayaran: 100 }),
      makeSummary({ groupId: "g2", sisaPembayaran: 0 }),
      makeSummary({ groupId: "g3", sisaPembayaran: 50 }),
    ];
    const result = getUnpaidSummaries(summaries);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.sisaPembayaran > 0)).toBe(true);
  });
});

describe("filterSummariesByStatus", () => {
  it("returns all when filter is 'semua'", () => {
    const summaries = [makeSummary(), makeSummary({ groupId: "g2" })];
    expect(filterSummariesByStatus(summaries, "semua")).toHaveLength(2);
  });

  it("filters by status", () => {
    const summaries = [
      makeSummary({ status: "lunas" }),
      makeSummary({ groupId: "g2", status: "cicilan" }),
    ];
    const result = filterSummariesByStatus(summaries, "lunas");
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("lunas");
  });
});
