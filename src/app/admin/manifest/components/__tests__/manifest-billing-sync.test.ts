import { describe, it, expect } from "vitest";
import { resolvePackageInclusionFlags } from "@/shared/lib/manifest-billing-utils";
import {
  mergeSavedBillingItemsFromInvoices,
  mergeSavedOrderItemsFromInvoices,
  mapBillingItemsToSyncPayload,
  calculateBillingItemsNetTotal,
  type BillingItem,
} from "@/app/admin/pembayaran/laporan/_components/shared-constants";
import type { InvoiceOrderItem } from "@/shared/lib/invoice-pdf";

describe("Manifest Pembayaran & Billing Sync Regression Suite", () => {
  describe("resolvePackageInclusionFlags (Phantom Thoif & Kereta Cepat Guard)", () => {
    it("does NOT charge extra Thoif when package already includes City Tour Thoif", () => {
      const pkg = {
        id: "cmv3ijmy5000311nu1dxxu057",
        kode: "#2026_9H_JKT_QR_DEC03",
        namaPaket: "PAKET UMROH 9 H JKT ( JED.C-J ) - 03 Des 2026 (QATAR AIRWAYS)",
        include: ["City Tour Thoif", "Makan 3x Sehari (Full Board / FB)"],
      };
      const group = { isCityTourThoif: true, isKeretaCepat: false };
      const jamaah = { isCityTourThoif: true, isKeretaCepat: false };

      const flags = resolvePackageInclusionFlags({ activePackage: pkg, group, jamaah });
      expect(flags.pkgIncludesThoif).toBe(true);
      expect(flags.shouldChargeDefaultThoif).toBe(false);
      expect(flags.shouldChargeDefaultKereta).toBe(false);
    });

    it("DOES charge Thoif when package does not include Thoif and group opted in", () => {
      const pkg = {
        id: "pkg-basic",
        kode: "#2026_9H_JKT_SV_DEC10",
        namaPaket: "PAKET UMROH REGULER 9 H",
        include: ["Tiket PP", "Visa Umroh"],
      };
      const flags = resolvePackageInclusionFlags({
        activePackage: pkg,
        group: { isCityTourThoif: true, isKeretaCepat: false },
      });

      expect(flags.pkgIncludesThoif).toBe(false);
      expect(flags.shouldChargeDefaultThoif).toBe(true);
    });

    it("respects hotelOptions variant flags over base package defaults", () => {
      const pkg = {
        id: "pkg-multi",
        kode: "#2026_9H_MULTI",
        namaPaket: "PAKET UMROH SPECIAL",
        include: [],
        hotelOptions: [
          {
            variantName: "VIP",
            isAdaThoif: "ya",
            isAdaKeretaCepat: "ya",
          },
          {
            variantName: "Hemat",
            isAdaThoif: "tidak",
            isAdaKeretaCepat: "tidak",
          },
        ],
      };

      const vipFlags = resolvePackageInclusionFlags({
        activePackage: pkg,
        group: { hotelUpgrade: "VIP", isCityTourThoif: true, isKeretaCepat: true },
      });
      expect(vipFlags.pkgIncludesThoif).toBe(true);
      expect(vipFlags.shouldChargeDefaultThoif).toBe(false);
      expect(vipFlags.shouldChargeDefaultKereta).toBe(false);

      const hematFlags = resolvePackageInclusionFlags({
        activePackage: pkg,
        group: { hotelUpgrade: "Hemat", isCityTourThoif: true, isKeretaCepat: true },
      });
      expect(hematFlags.pkgIncludesThoif).toBe(false);
      expect(hematFlags.shouldChargeDefaultThoif).toBe(true);
      expect(hematFlags.shouldChargeDefaultKereta).toBe(true);
    });
  });

  describe("Saved Invoice Item Hydration & Deduplication", () => {
    it("merges saved Upgrade Hotel nominal, additions, and negative potongan into BillingItem[]", () => {
      const baseItems: BillingItem[] = [
        {
          id: "base-package",
          nama: "PAKET UMROH 9 H (3 Pax)",
          kategori: "utama",
          nominal: 29900000,
          qty: 3,
          satuan: "Pax",
          isDefault: true,
        },
        {
          id: "hotel-upgrade-manifest",
          nama: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
          kategori: "tambahan",
          nominal: 0,
          qty: 3,
          satuan: "Pax",
          isDefault: false,
        },
      ];

      const mockInvoices = [
        {
          id: "BILL-grp-1",
          status: "unpaid",
          items: [
            {
              id: "it-base",
              kategori: "utama",
              deskripsi: "PAKET UMROH 9 H (3 Pax)",
              qty: 3,
              hargaSatuan: 29900000,
              jumlah: 89700000,
              status: "active",
            },
            {
              id: "it-hotel",
              kategori: "tambahan",
              deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
              qty: 3,
              hargaSatuan: 1500000,
              jumlah: 4500000,
              status: "active",
            },
            {
              id: "it-disc",
              kategori: "potongan",
              deskripsi: "Diskon Promo Keluarga",
              qty: 1,
              hargaSatuan: -500000,
              jumlah: -500000,
              status: "active",
            },
            {
              id: "it-receipt",
              kategori: "Pembayaran Invoice",
              deskripsi: "Tagihan Pembayaran (DP)",
              qty: 1,
              hargaSatuan: 15000000,
              jumlah: 15000000,
              status: "active",
            },
          ],
        },
        {
          id: "INV-CANCELLED",
          status: "cancelled",
          items: [
            {
              id: "it-old",
              kategori: "tambahan",
              deskripsi: "Biaya Paspor",
              qty: 3,
              hargaSatuan: 400000,
              jumlah: 1200000,
              status: "active",
            },
          ],
        },
      ];

      const merged = mergeSavedBillingItemsFromInvoices(baseItems, mockInvoices);

      expect(merged).toHaveLength(3);
      expect(merged.find((i) => i.id === "hotel-upgrade-manifest")?.nominal).toBe(1500000);
      const disc = merged.find((i) => i.nama === "Diskon Promo Keluarga");
      expect(disc?.kategori).toBe("potongan");
      expect(disc?.nominal).toBe(500000);
      expect(merged.find((i) => i.nama === "Biaya Paspor")).toBeUndefined();
      expect(calculateBillingItemsNetTotal(merged)).toBe(89700000 + 4500000 - 500000);

      const syncPayload = mapBillingItemsToSyncPayload(merged);
      expect(syncPayload).toHaveLength(3);
      expect(syncPayload[1]).toEqual({
        kategori: "tambahan",
        deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
        qty: 3,
        hargaSatuan: 1500000,
        jumlah: 4500000,
      });
    });

    it("hydrates PaymentReviewTab InvoiceOrderItem[] with total nominal = unit * qty and skips base package", () => {
      const baseOrders: InvoiceOrderItem[] = [
        {
          id: "hotel-upgrade-manifest",
          nama: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
          kategori: "tambahan",
          nominal: 0,
          hargaSatuan: 0,
          qty: 3,
          satuan: "Pax",
          tipe: "penambahan",
        },
      ];

      const mockInvoices = [
        {
          id: "BILL-grp-1",
          status: "unpaid",
          items: [
            {
              id: "it-base",
              kategori: "utama",
              deskripsi: "PAKET UMROH 9 H (3 Pax)",
              qty: 3,
              hargaSatuan: 29900000,
              jumlah: 89700000,
              status: "active",
            },
            {
              id: "it-hotel",
              kategori: "tambahan",
              deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
              qty: 3,
              hargaSatuan: 2000000,
              jumlah: 6000000,
              status: "active",
            },
            {
              id: "it-pot",
              kategori: "potongan",
              deskripsi: "Cashback Pendaftaran",
              qty: 1,
              hargaSatuan: -1000000,
              jumlah: -1000000,
              status: "active",
            },
          ],
        },
      ];

      const merged = mergeSavedOrderItemsFromInvoices(baseOrders, mockInvoices);
      expect(merged).toHaveLength(2);
      expect(merged[0]?.hargaSatuan).toBe(2000000);
      expect(merged[0]?.nominal).toBe(6000000);
      expect(merged[1]?.tipe).toBe("pengurangan");
      expect(merged[1]?.hargaSatuan).toBe(1000000);
      expect(merged[1]?.nominal).toBe(1000000);
    });
  });
});

