import { describe, it, expect } from "vitest";
import {
  buildGroupInvoiceAuditTimeline,
  buildQueueItemFromInvoiceLog,
  buildUnifiedPaymentHistory,
  computeBillingItemsDiff,
  inferManifestImpactLabels,
  isReviewLogOnlyEntry,
  parseAuditEntryToInvoiceLog,
  synthesizeInvoiceHistoryLogs,
} from "../invoice-audit-log";
import type { Invoice, Pembayaran } from "@/shared/types";

describe("invoice-audit-log", () => {
  it("computes added, updated, removed, and discount diffs accurately", () => {
    const before = [
      { kategori: "utama", deskripsi: "PAKET UMROH 9 H JKT", qty: 3, hargaSatuan: 29900000, jumlah: 89700000, status: "active" },
      { kategori: "tambahan", deskripsi: "Kursi Roda", qty: 1, hargaSatuan: 500000, jumlah: 500000, status: "active" },
      { kategori: "tambahan", deskripsi: "Paspor Kilat", qty: 1, hargaSatuan: 1000000, jumlah: 1000000, status: "active" },
    ];
    const after = [
      { kategori: "utama", deskripsi: "PAKET UMROH 9 H JKT", qty: 3, hargaSatuan: 29900000, jumlah: 89700000, status: "active" },
      { kategori: "tambahan", deskripsi: "Upgrade Hotel Makkah: SAFWAH TOWER", qty: 3, hargaSatuan: 4500000, jumlah: 13500000, status: "active" },
      { kategori: "tambahan", deskripsi: "Kursi Roda", qty: 2, hargaSatuan: 500000, jumlah: 1000000, status: "active" },
      { kategori: "potongan", deskripsi: "Diskon Promo", qty: 1, hargaSatuan: 1500000, jumlah: 1500000, status: "active" },
    ];

    const diff = computeBillingItemsDiff(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.addedCount).toBe(2);
    expect(diff.updatedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
    // +13,500,000 (hotel) - 1,500,000 (diskon) + 500,000 (kursi roda qty 1->2) - 1,000,000 (paspor removed) = +11,500,000
    expect(diff.deltaTotal).toBe(11500000);
  });

  it("infers manifest impact labels for hotel, room, add-ons, and pax changes", () => {
    const tags = inferManifestImpactLabels(
      [
        { kategori: "tambahan", deskripsi: "Upgrade Hotel Makkah SAFWAH TOWER" },
        { kategori: "tambahan", deskripsi: "Upgrade Kamar Double" },
        { kategori: "tambahan", deskripsi: "Kereta Cepat Haramain" },
      ],
      "PEMBARUAN_INVOICE"
    );
    expect(tags).toEqual(expect.arrayContaining(["Upgrade Hotel", "Upgrade Kamar", "Kereta Cepat"]));
  });

  it("synthesizes historical INV-UPD-* and cancelled items when AuditEntry does not exist yet", () => {
    const invUpd: Invoice = {
      id: "INV-UPD-20261111-4821",
      nomorInvoice: "INV-UPD-20261111-4821",
      groupId: "grp-012",
      tipe: "tambahan",
      jumlah: 103200000,
      sisaTagihan: 103200000,
      status: "unpaid",
      jatuhTempo: "2026-11-20T00:00:00.000Z",
      createdAt: "2026-11-11T08:13:00.000Z",
      updatedAt: "2026-11-11T08:13:00.000Z",
      items: [
        {
          id: "ii-1",
          invoiceId: "INV-UPD-20261111-4821",
          kategori: "tambahan",
          deskripsi: "Upgrade Hotel Makkah: SAFWAH TOWER",
          qty: 3,
          hargaSatuan: 4500000,
          jumlah: 13500000,
          status: "active",
        },
        {
          id: "ii-2",
          invoiceId: "INV-UPD-20261111-4821",
          kategori: "tambahan",
          deskripsi: "City Tour Thoif",
          qty: 3,
          hargaSatuan: 500000,
          jumlah: 1500000,
          status: "cancelled",
          cancelledAt: "2026-11-11T09:00:00.000Z",
          cancelledBy: "Super Admin",
          cancellationReason: "Jamaah batal thoif",
        },
      ],
    };

    const draftBill: Invoice = {
      id: "BILL-grp-012",
      nomorInvoice: "TAG-GRP-2026-0012",
      groupId: "grp-012",
      tipe: "tambahan",
      jumlah: 89700000,
      sisaTagihan: 89700000,
      status: "unpaid",
      jatuhTempo: "2026-11-20T00:00:00.000Z",
      createdAt: "2026-10-23T00:00:00.000Z",
      updatedAt: "2026-10-23T00:00:00.000Z",
      items: [],
    };

    const logs = synthesizeInvoiceHistoryLogs({
      id: "grp-012",
      kodeRegistrasi: "GRP-2026-0012",
      namaGroup: "GRUP ARDI",
      invoices: [invUpd, draftBill],
      pembayaran: [],
    });

    // Should synthesize INV-UPD and the cancelled item, and ignore plain BILL-* draft ledger
    expect(logs.length).toBe(2);
    const updLog = logs.find((l) => l.eventKind === "PEMBARUAN_INVOICE");
    const cancelLog = logs.find((l) => l.eventKind === "PEMBATALAN_ITEM");
    expect(updLog).toBeDefined();
    expect(updLog?.cashInAmount).toBe(0);
    expect(updLog?.isLogOnly).toBe(true);
    expect(cancelLog?.actorName).toBe("Super Admin");
  });

  it("merges AuditEntry and deduplicates synthetic invoices covered by AuditEntry", () => {
    const auditRow = {
      id: "aud-1",
      timestamp: "2026-11-11T08:13:05.000Z",
      userId: "u-1",
      userName: "Super Admin",
      role: "super_admin",
      module: "pembayaran",
      action: "invoice.pembaruan",
      detail: "Pembaruan Invoice INV-UPD-20261111-4821 (Rp 0 kas masuk)",
      entityId: "grp-012",
      entityType: "invoice_revision",
      before: JSON.stringify({ groupId: "grp-012", totalTagihan: 89700000 }),
      after: JSON.stringify({
        groupId: "grp-012",
        invoiceId: "INV-UPD-20261111-4821",
        nomorInvoice: "INV-UPD-20261111-4821",
        eventKind: "PEMBARUAN_INVOICE",
        totalTagihan: 103200000,
        deltaTotal: 13500000,
        itemsDiff: [
          {
            type: "added",
            deskripsi: "Upgrade Hotel Makkah: SAFWAH TOWER",
            kategori: "tambahan",
            deltaJumlah: 13500000,
          },
        ],
      }),
    };

    const parsed = parseAuditEntryToInvoiceLog(auditRow);
    expect(parsed?.totalBefore).toBe(89700000);
    expect(parsed?.totalAfter).toBe(103200000);
    expect(parsed?.deltaTotal).toBe(13500000);

    const timeline = buildGroupInvoiceAuditTimeline({
      group: {
        id: "grp-012",
        kodeRegistrasi: "GRP-2026-0012",
        namaGroup: "GRUP ARDI",
        invoices: [
          {
            id: "INV-UPD-20261111-4821",
            nomorInvoice: "INV-UPD-20261111-4821",
            groupId: "grp-012",
            tipe: "tambahan",
            jumlah: 103200000,
            sisaTagihan: 103200000,
            status: "unpaid",
            jatuhTempo: "2026-11-20T00:00:00.000Z",
            createdAt: "2026-11-11T08:13:00.000Z",
            updatedAt: "2026-11-11T08:13:00.000Z",
            items: [],
          },
        ],
        pembayaran: [],
      },
      auditEntries: [auditRow],
      order: "desc",
    });

    // Deduplicated to 1 canonical entry from audit_entry
    expect(timeline.length).toBe(1);
    expect(timeline[0]?.source).toBe("audit_entry");

    const queueItem = buildQueueItemFromInvoiceLog(timeline[0]!);
    expect(isReviewLogOnlyEntry(queueItem)).toBe(true);
    expect(queueItem.jumlah).toBe(0);
    expect(queueItem.status).toBe("logged");
  });

  it("ignores non-invoice pembayaran.approve audit rows to avoid duplicating verified payments", () => {
    const parsedApprove = parseAuditEntryToInvoiceLog({
      id: "aud-approve",
      timestamp: "2026-11-11T09:00:00.000Z",
      userName: "Admin Keuangan",
      module: "pembayaran",
      action: "pembayaran.approve",
      detail: "Menyetujui pembayaran",
      entityId: "grp-012",
      entityType: "Pembayaran",
    });
    expect(parsedApprove).toBeNull();
  });

  it("merges payments and invoiceLogs chronologically into UnifiedPaymentHistory without inflating cash", () => {
    const payments: Pembayaran[] = [
      {
        id: "pay-1",
        groupId: "grp-012",
        invoiceId: "INV-1",
        jumlah: 15000000,
        metode: "transfer",
        tanggal: "2026-10-23T10:00:00.000Z",
        status: "pending",
        sumber: "admin",
        alokasi: [],
      },
    ];
    const logs = synthesizeInvoiceHistoryLogs({
      id: "grp-012",
      invoices: [
        {
          id: "INV-UPD-1",
          nomorInvoice: "INV-UPD-20261111-1001",
          groupId: "grp-012",
          tipe: "tambahan",
          jumlah: 103200000,
          sisaTagihan: 103200000,
          status: "unpaid",
          jatuhTempo: "2026-11-20T00:00:00.000Z",
          createdAt: "2026-11-11T08:13:00.000Z",
          updatedAt: "2026-11-11T08:13:00.000Z",
          items: [],
        },
      ],
      pembayaran: payments,
    });

    const unified = buildUnifiedPaymentHistory(payments, logs, "desc");
    expect(unified.length).toBe(2);
    expect(unified[0]?.isLogOnly).toBe(true);
    expect(unified[0]?.cashInAmount).toBe(0);
    expect(unified[1]?.isLogOnly).toBe(false);
    expect(unified[1]?.cashInAmount).toBe(15000000);
  });

  it("treats Peruntukan-only edits on an existing item as updated instead of removed+added (ADR-0034)", () => {
    const before = [
      {
        kategori: "tambahan",
        deskripsi: "Sewa Kursi Roda",
        qty: 1,
        hargaSatuan: 250000,
        jumlah: 250000,
        status: "active",
      },
    ];
    const after = [
      {
        kategori: "tambahan",
        deskripsi: "Sewa Kursi Roda (Peruntukan: ARDI)",
        qty: 1,
        hargaSatuan: 250000,
        jumlah: 250000,
        status: "active",
      },
    ];

    const diff = computeBillingItemsDiff(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.updatedCount).toBe(1);
    expect(diff.deltaTotal).toBe(0);
  });
});

