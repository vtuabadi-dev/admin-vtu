import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockAuditCreate, mockAuditFindMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockAuditCreate: vi.fn(),
  mockAuditFindMany: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/server/repositories/audit.repository", () => ({
  auditRepo: {
    create: mockAuditCreate,
  },
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    auditEntry: {
      findMany: mockAuditFindMany,
    },
  },
}));

import { recordInvoiceAuditLog } from "../invoice-audit.service";

describe("invoice-audit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes structured before/after snapshot and diff to AuditEntry", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "usr-1", name: "Super Admin", role: "super_admin" },
    });
    mockAuditCreate.mockResolvedValue({ id: "aud-123" });

    const res = await recordInvoiceAuditLog({
      groupId: "grp-012",
      kodeRegistrasi: "GRP-2026-0012",
      namaGroup: "GRUP ARDI",
      invoiceId: "INV-UPD-20261111-1234",
      nomorInvoice: "INV-UPD-20261111-1234",
      eventKind: "PEMBARUAN_INVOICE",
      action: "invoice.pembaruan",
      beforeTotal: 89700000,
      afterTotal: 103200000,
      beforeItems: [
        { kategori: "utama", deskripsi: "PAKET UMROH", qty: 3, hargaSatuan: 29900000, jumlah: 89700000 },
      ],
      afterItems: [
        { kategori: "utama", deskripsi: "PAKET UMROH", qty: 3, hargaSatuan: 29900000, jumlah: 89700000 },
        { kategori: "tambahan", deskripsi: "Upgrade Hotel Makkah: SAFWAH TOWER", qty: 3, hargaSatuan: 4500000, jumlah: 13500000 },
      ],
    });

    expect(res).toEqual({ id: "aud-123" });
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const arg = mockAuditCreate.mock.calls[0]?.[0];
    expect(arg.module).toBe("pembayaran");
    expect(arg.entityId).toBe("grp-012");
    expect(arg.entityType).toBe("invoice_revision");
    expect(arg.userName).toBe("Super Admin");
    const afterParsed = JSON.parse(arg.after);
    expect(afterParsed.deltaTotal).toBe(13500000);
    expect(afterParsed.itemsDiff).toHaveLength(1);
    expect(afterParsed.manifestImpact).toContain("Upgrade Hotel");
  });

  it("returns null gracefully when auditRepo.create fails (non-blocking)", async () => {
    mockAuth.mockResolvedValue(null);
    mockAuditCreate.mockRejectedValue(new Error("DB timeout"));

    const res = await recordInvoiceAuditLog({
      groupId: "grp-012",
      eventKind: "SYNC_ITEM_TAGIHAN",
      action: "billing.sync_items",
      detail: "Ubah item tagihan",
    });

    expect(res).toBeNull();
  });
});

