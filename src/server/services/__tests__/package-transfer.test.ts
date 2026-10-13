import { describe, it, expect, vi, beforeEach } from "vitest";
import { transferPackageGroup } from "../package-transfer.service";
import { prisma } from "@/server/db/client";

// Mock dependencies
vi.mock("@/server/db/client", () => {
  const mockTx = {
    $executeRaw: vi.fn(),
    penghuniKamar: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    manifest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    manifestRow: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
    },
    invoiceItem: {
      create: vi.fn(),
    },
    pembayaran: {
      create: vi.fn(),
    },
    registrationGroup: {
      update: vi.fn(),
    },
    activityEvent: {
      create: vi.fn().mockResolvedValue({ id: "event-1" }),
    },
    keberangkatan: {
      findUnique: vi.fn(),
    },
  };

  return {
    prisma: {
      registrationGroup: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      keberangkatan: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockTx)),
      _mockTx: mockTx,
    },
  };
});

vi.mock("@/server/storage/google-drive", () => ({
  provisionPackageStorage: vi.fn().mockResolvedValue({}),
  moveAndRenameDriveFile: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/shared/lib/file-standardization", () => ({
  hasPackageTourLeader: vi.fn().mockReturnValue(false),
  formatStandardDocumentFileName: vi.fn().mockReturnValue("001-3575-JAMAAH.jpg"),
}));

describe("WP-TRF-2026-001: Package Transfer Integrity & Invariants Suite", () => {
  const mockTx = (prisma as any)._mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Scenario A: HARGA_LAMA Tanpa Upgrade Hotel", () => {
    it("preserves original agreed package bill without issuing zero-amount invoices", async () => {
      // Setup mock data: 2 pax, Rp 30.000.000 / pax, totalTagihan Rp 60.000.000
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        kodeRegistrasi: "GRP-2026-0001",
        namaGroup: "Keluarga Ahmad",
        jumlahAnggota: 2,
        totalTagihan: 60000000,
        totalPembayaran: 40000000,
        sisaPembayaran: 20000000,
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", namaPaket: "Paket Silver 9H", hargaPaket: 30000000, kuota: 45, terisi: 10 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-new",
        namaPaket: "Paket Gold 12H",
        hargaPaket: 35000000, // More expensive destination
        kuota: 45,
        terisi: 20,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      mockTx.$executeRaw.mockResolvedValue(1); // Capacity update success
      mockTx.manifest.findFirst.mockResolvedValue({ id: "man-1", kode: "MAN/001" });
      mockTx.manifestRow.findFirst.mockResolvedValue(null);

      const result = await transferPackageGroup({
        groupId: "grp-1",
        targetPaketId: "keb-new",
        pricingOption: "HARGA_LAMA",
      });

      expect(result.success).toBe(true);
      expect(result.pricingOption).toBe("HARGA_LAMA");
      expect(result.totalAdditionalBill).toBe(0);
      expect(result.invoice).toBeNull();

      // Verify no invoice was created in transaction
      expect(mockTx.invoice.create).not.toHaveBeenCalled();
      expect(mockTx.invoiceItem.create).not.toHaveBeenCalled();

      // Verify group totalTagihan was NOT modified
      expect(mockTx.registrationGroup.update).toHaveBeenCalledWith({
        where: { id: "grp-1" },
        data: {
          paketKeberangkatanId: "keb-new",
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe("Scenario B: HARGA_LAMA Dengan Upgrade Hotel Eksplisit", () => {
    it("adds strictly the manual upgrade nominal entered by admin and creates itemized invoice", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        kodeRegistrasi: "GRP-2026-0001",
        namaGroup: "Keluarga Ahmad",
        jumlahAnggota: 2,
        totalTagihan: 60000000,
        totalPembayaran: 40000000,
        sisaPembayaran: 20000000,
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", namaPaket: "Paket Silver 9H", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-new",
        namaPaket: "Paket Gold 12H",
        hargaPaket: 35000000,
        kuota: 45,
        terisi: 10,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.manifest.findFirst.mockResolvedValue({ id: "man-1" });
      mockTx.manifestRow.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue({
        id: "INV-UPGRADE-1",
        nomorInvoice: "PINDAH-GRP-2026-0001-TEST",
        jumlah: 4000000,
      });

      const result = await transferPackageGroup({
        groupId: "grp-1",
        targetPaketId: "keb-new",
        pricingOption: "HARGA_LAMA",
        hotelUpgrade: {
          hotelName: "Pullman Zamzam Makkah",
          nominal: 4000000, // Rp 2.000.000 / pax * 2 pax
        },
      });

      expect(result.success).toBe(true);
      expect(result.totalAdditionalBill).toBe(4000000);
      expect(result.invoice).toBeDefined();

      // Verify invoice created once
      expect(mockTx.invoice.create).toHaveBeenCalledTimes(1);
      expect(mockTx.invoiceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kategori: "HOTEL_UPGRADE",
            jumlah: 4000000,
            hargaSatuan: 2000000,
            qty: 2,
          }),
        })
      );

      // Verify group totalTagihan updated from 60M to 64M
      expect(mockTx.registrationGroup.update).toHaveBeenCalledWith({
        where: { id: "grp-1" },
        data: expect.objectContaining({
          paketKeberangkatanId: "keb-new",
          totalTagihan: 64000000,
          sisaPembayaran: 24000000,
        }),
      });
    });
  });

  describe("Scenario C: HARGA_BARU Lebih Mahal", () => {
    it("creates price difference invoice exactly once and updates group obligation consistently", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        kodeRegistrasi: "GRP-2026-0001",
        namaGroup: "Keluarga Ahmad",
        jumlahAnggota: 2,
        totalTagihan: 60000000,
        totalPembayaran: 40000000,
        sisaPembayaran: 20000000,
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", namaPaket: "Paket Silver 9H", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-new",
        namaPaket: "Paket Gold 12H",
        hargaPaket: 35000000, // Diff: +5.000.000/pax -> +10.000.000 total
        kuota: 45,
        terisi: 10,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.manifest.findFirst.mockResolvedValue({ id: "man-1" });
      mockTx.manifestRow.findFirst.mockResolvedValue(null);
      mockTx.invoice.create.mockResolvedValue({
        id: "INV-DIFF-1",
        nomorInvoice: "PINDAH-GRP-2026-0001-DIFF",
        jumlah: 10000000,
      });

      const result = await transferPackageGroup({
        groupId: "grp-1",
        targetPaketId: "keb-new",
        pricingOption: "HARGA_BARU",
      });

      expect(result.success).toBe(true);
      expect(result.totalAdditionalBill).toBe(10000000);
      expect(mockTx.invoiceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kategori: "PINDAH_PAKET",
            jumlah: 10000000,
            hargaSatuan: 5000000,
            qty: 2,
          }),
        })
      );

      // Verify new obligation: 60M + 10M = 70M, sisa = 70M - 40M = 30M
      expect(mockTx.registrationGroup.update).toHaveBeenCalledWith({
        where: { id: "grp-1" },
        data: expect.objectContaining({
          totalTagihan: 70000000,
          sisaPembayaran: 30000000,
        }),
      });
    });
  });

  describe("Scenario D: HARGA_BARU Lebih Murah (Blocked Scope)", () => {
    it("strictly blocks destination cheaper scenario and prevents corrupted financial records", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        kodeRegistrasi: "GRP-2026-0001",
        namaGroup: "Keluarga Ahmad",
        jumlahAnggota: 2,
        totalTagihan: 60000000,
        totalPembayaran: 60000000,
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", namaPaket: "Paket Gold 12H", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-cheaper",
        namaPaket: "Paket Silver 9H",
        hargaPaket: 28000000, // Cheaper: -2M/pax -> -4M total
        kuota: 45,
        terisi: 5,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      // Attempting HARGA_BARU to cheaper package must throw explicit domain error
      await expect(
        transferPackageGroup({
          groupId: "grp-1",
          targetPaketId: "keb-cheaper",
          pricingOption: "HARGA_BARU",
        })
      ).rejects.toThrow("BLOCKED_FINANCIAL_DECISION");

      // Verify database transaction was NOT executed
      expect(mockTx.registrationGroup.update).not.toHaveBeenCalled();
      expect(mockTx.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe("Capacity Safety & Overbooking Prevention", () => {
    it("aborts transaction and throws CAPACITY_EXCEEDED when destination capacity is full", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-full",
        hargaPaket: 30000000,
        kuota: 45,
        terisi: 44, // Only 1 seat left for 2 pax
        tanggalBerangkat: new Date("2026-11-20"),
      });

      // Conditional update returns 0 affected rows
      mockTx.$executeRaw.mockResolvedValue(0);
      mockTx.keberangkatan.findUnique.mockResolvedValue({ kuota: 45, terisi: 44 });

      await expect(
        transferPackageGroup({
          groupId: "grp-1",
          targetPaketId: "keb-full",
          pricingOption: "HARGA_LAMA",
        })
      ).rejects.toThrow("CAPACITY_EXCEEDED");
    });
  });

  describe("Idempotency Guard", () => {
    it("rejects transfer request if group is already registered in target package", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        paketKeberangkatanId: "keb-same",
        anggota: [{ id: "jam-1", status: "registered", dokumen: [] }],
      });

      await expect(
        transferPackageGroup({
          groupId: "grp-1",
          targetPaketId: "keb-same",
          pricingOption: "HARGA_LAMA",
        })
      ).rejects.toThrow("Grup sudah terdaftar pada paket tujuan tersebut");
    });
  });

  describe("Operational Rooming Cleanup", () => {
    it("cleans up old room occupancy records (PenghuniKamar) for transferring members", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", status: "registered", dokumen: [] },
          { id: "jam-2", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-new",
        hargaPaket: 30000000,
        kuota: 45,
        terisi: 10,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.manifest.findFirst.mockResolvedValue({ id: "man-1" });
      mockTx.manifestRow.findFirst.mockResolvedValue(null);

      await transferPackageGroup({
        groupId: "grp-1",
        targetPaketId: "keb-new",
        pricingOption: "HARGA_LAMA",
      });

      expect(mockTx.penghuniKamar.deleteMany).toHaveBeenCalledWith({
        where: { jamaahId: { in: ["jam-1", "jam-2"] } },
      });
    });
  });

  describe("Manifest Re-sequencing & No Duplicate nomorUrut", () => {
    it("assigns sequential nomorUrut strictly greater than existing rows in target manifest", async () => {
      (prisma.registrationGroup.findUnique as any).mockResolvedValue({
        id: "grp-1",
        paketKeberangkatanId: "keb-old",
        keberangkatan: { id: "keb-old", hargaPaket: 30000000 },
        anggota: [
          { id: "jam-1", namaLengkap: "Ahmad", status: "registered", dokumen: [] },
          { id: "jam-2", namaLengkap: "Fatimah", status: "registered", dokumen: [] },
        ],
      });

      (prisma.keberangkatan.findUnique as any).mockResolvedValue({
        id: "keb-new",
        hargaPaket: 30000000,
        kuota: 45,
        terisi: 10,
        tanggalBerangkat: new Date("2026-11-20"),
      });

      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.manifest.findFirst.mockResolvedValue({ id: "man-target" });
      // Existing max nomorUrut is 15
      mockTx.manifestRow.findFirst.mockImplementation(({ where }: any) => {
        if (where?.manifestId === "man-target") {
          return Promise.resolve({ nomorUrut: 15 });
        }
        return Promise.resolve(null);
      });

      await transferPackageGroup({
        groupId: "grp-1",
        targetPaketId: "keb-new",
        pricingOption: "HARGA_LAMA",
      });

      // First member gets 16, second member gets 17
      expect(mockTx.manifestRow.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            manifestId: "man-target",
            jamaahId: "jam-1",
            nomorUrut: 16,
          }),
        })
      );
      expect(mockTx.manifestRow.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            manifestId: "man-target",
            jamaahId: "jam-2",
            nomorUrut: 17,
          }),
        })
      );
    });
  });
});
