import { describe, it, expect } from "vitest";
import { resolvePackageInclusionFlags } from "@/shared/lib/manifest-billing-utils";
import {
  resolvePackageBillingConfig,
  resolveRoomUpgradeUnitPrice,
  hasMaterializedRoomOrFullLedger,
  resolveCanonicalGroupBilling,
  shouldSkipNonBillingInvoiceItem,
  extractActiveLedgerItems,
} from "@/shared/lib/billing-ssot";
import {
  mergeSavedBillingItemsFromInvoices,
  mergeSavedOrderItemsFromInvoices,
  mapBillingItemsToSyncPayload,
  calculateBillingItemsNetTotal,
  buildInvoicePdfDataForGroup,
  type BillingItem,
} from "@/app/admin/pembayaran/laporan/_components/shared-constants";
import type { InvoiceOrderItem } from "@/shared/lib/invoice-pdf";

describe("Manifest Pembayaran & Billing Sync Regression Suite (ADR-0032 SSOT)", () => {
  describe("resolvePackageInclusionFlags (ADR-0032 Rule 2 Guard)", () => {
    it("identifies package-included Thoif and never auto-charges default Thoif/Kereta flags", () => {
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

    it("does NOT charge Thoif silently on non-include package without an InvoiceItem", () => {
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
      expect(flags.shouldChargeDefaultThoif).toBe(false);
    });

    it("respects hotelOptions variant flags while keeping silent auto-surcharge disabled", () => {
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
      expect(hematFlags.shouldChargeDefaultThoif).toBe(false);
      expect(hematFlags.shouldChargeDefaultKereta).toBe(false);
    });
  });

  describe("ADR-0032 SSOT Engine (Rule 1, Rule 2, Parity & Cancelled Item Safety)", () => {
    it("Keputusan Bisnis 1: uses package creation room upgrade prices and returns Rp 0 when unconfigured", () => {
      const unconfiguredPkg = {
        id: "pkg-noupgrade",
        hargaPaket: 29900000,
        hotelMekkah: "LE MERIDIEN TOWERS",
        hotelMadinah: "DURRAT AL EIMAN",
      };
      const cfgUnconf = resolvePackageBillingConfig({ activePackage: unconfiguredPkg });
      expect(cfgUnconf.hargaBase).toBe(29900000);
      expect(cfgUnconf.upgradeDouble).toBe(0);
      expect(cfgUnconf.upgradeTriple).toBe(0);
      expect(cfgUnconf.upgradeSingle).toBe(0);
      expect(resolveRoomUpgradeUnitPrice(cfgUnconf, "Double")).toBe(0);
      expect(resolveRoomUpgradeUnitPrice(cfgUnconf, "Triple")).toBe(0);
      expect(resolveRoomUpgradeUnitPrice(cfgUnconf, "Single")).toBe(0);

      const configuredPkg = {
        id: "pkg-conf",
        hargaPaket: 29900000,
        hotelOptions: [
          {
            clusterName: "GOLD",
            hargaBase: 32500000,
            upgradeDouble: 3100000,
            hargaTriple: 34200000, // 34.2M - 32.5M = 1.7M
          },
        ],
      };
      const cfgConf = resolvePackageBillingConfig({
        activePackage: configuredPkg,
        targetKlaster: "GOLD",
      });
      expect(cfgConf.hargaBase).toBe(32500000);
      expect(cfgConf.upgradeDouble).toBe(3100000);
      expect(cfgConf.upgradeTriple).toBe(1700000);
      expect(resolveRoomUpgradeUnitPrice(cfgConf, "Double")).toBe(3100000);
      expect(resolveRoomUpgradeUnitPrice(cfgConf, "Triple")).toBe(1700000);
      expect(resolveRoomUpgradeUnitPrice(cfgConf, "Quad")).toBe(0);
    });

    it("Keputusan Bisnis 2: charges Rp 0 for non-include Thoif, Kereta Cepat & Ongkos Jahit unless active InvoiceItem exists", () => {
      const pkg = {
        id: "pkg-1",
        hargaPaket: 29900000,
        hotelMekkah: "LE MERIDIEN TOWERS",
        hotelMadinah: "DURRAT AL EIMAN",
        include: ["Tiket PP"],
      };
      const members = [
        {
          id: "j-1",
          namaLengkap: "ARDI",
          hotelMekkah: "LE MERIDIEN TOWERS",
          hotelMadinah: "DURRAT AL EIMAN",
          isCityTourThoif: true,
          isKeretaCepat: true,
          catatanPerlengkapan: "seragam jadi ukuran L",
          detailPengambilan: [{ status: "SUDAH", kodeUkuran: "L", name: "Seragam Batik" }],
        },
        {
          id: "j-2",
          namaLengkap: "IRDA",
          hotelMekkah: "LE MERIDIEN TOWERS",
          hotelMadinah: "DURRAT AL EIMAN",
          isCityTourThoif: true,
          isKeretaCepat: true,
        },
      ];
      const group = {
        id: "grp-1",
        kodeRegistrasi: "GRP-2026-0012",
        jumlahAnggota: 2,
        isCityTourThoif: true,
        isKeretaCepat: true,
        roomUpgrade: "Double", // Package unconfigured -> 0 under Rule 1
        invoices: [],
      };

      const res = resolveCanonicalGroupBilling({ group, activePackage: pkg, members });
      expect(res.groupTotals.biayaPaket).toBe(59800000);
      expect(res.groupTotals.upgradeKamar).toBe(0);
      expect(res.groupTotals.cityTourThoif).toBe(0);
      expect(res.groupTotals.keretaCepat).toBe(0);
      expect(res.groupTotals.ongkosJahit).toBe(0);
      expect(res.groupTotals.netTotalTagihan).toBe(59800000);
    });

    it("maintains exact rupiah parity between Invoice UI and Manifest Pembayaran with hotel upgrade & discounts", () => {
      const pkg = {
        id: "pkg-qr",
        namaPaket: "PAKET UMROH 9 H JKT",
        hargaPaket: 29900000,
        hotelMekkah: "LE MERIDIEN TOWERS",
        hotelMadinah: "DURRAT AL EIMAN",
      };
      const members = [
        { id: "j-1", namaLengkap: "ARDI", hotelMekkah: "SAFWAH TOWER", hotelMadinah: "DURRAT AL EIMAN" },
        { id: "j-2", namaLengkap: "IRDA", hotelMekkah: "SAFWAH TOWER", hotelMadinah: "DURRAT AL EIMAN" },
        { id: "j-3", namaLengkap: "KADRI", hotelMekkah: "LE MERIDIEN TOWERS", hotelMadinah: "DURRAT AL EIMAN" },
      ];
      const invoices = [
        {
          id: "BILL-grp-1",
          status: "unpaid",
          items: [
            {
              id: "it-base",
              kategori: "utama",
              deskripsi: "PAKET UMROH 9 H JKT (3 Pax)",
              qty: 3,
              hargaSatuan: 29900000,
              jumlah: 89700000,
              status: "active",
            },
            {
              id: "it-hotel",
              kategori: "tambahan",
              deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
              qty: 2,
              hargaSatuan: 1500000,
              jumlah: 3000000,
              status: "active",
            },
            {
              id: "it-thoif",
              kategori: "tambahan",
              deskripsi: "City Tour Thoif",
              qty: 3,
              hargaSatuan: 750000,
              jumlah: 2250000,
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
          ],
        },
      ];

      // 1. Invoice UI net calculation
      const uiItems = mergeSavedBillingItemsFromInvoices([], invoices);
      const uiNetTotal = calculateBillingItemsNetTotal(uiItems);

      // 2. Manifest & Excel SSOT calculation
      const manifestBilling = resolveCanonicalGroupBilling({
        group: { id: "grp-1", invoices },
        activePackage: pkg,
        members,
      });

      expect(uiNetTotal).toBe(89700000 + 3000000 + 2250000 - 500000);
      expect(manifestBilling.groupTotals.netTotalTagihan).toBe(uiNetTotal);
      expect(manifestBilling.groupTotals.upgradeHotel).toBe(3000000);
      expect(manifestBilling.groupTotals.cityTourThoif).toBe(2250000);
      expect(manifestBilling.groupTotals.totalPotongan).toBe(500000);

      // Sum across members equals group total without rounding drift
      const memberSumNet = manifestBilling.memberBreakdowns.reduce((s, m) => s + m.netTagihan, 0);
      expect(memberSumNet).toBe(uiNetTotal);

      // Only ARDI and IRDA (who have SAFWAH TOWER) carry upgradeHotel; KADRI gets 0
      expect(manifestBilling.memberBreakdowns[0]?.upgradeHotel).toBe(1500000);
      expect(manifestBilling.memberBreakdowns[1]?.upgradeHotel).toBe(1500000);
      expect(manifestBilling.memberBreakdowns[2]?.upgradeHotel).toBe(0);
    });

    it("does NOT resurrect cancelled Upgrade Kamar or cancelled Upgrade Hotel items from group.roomUpgrade", () => {
      const pkg = {
        id: "pkg-room",
        hargaPaket: 30000000,
        upgradeDouble: 2500000,
        hotelMekkah: "LE MERIDIEN TOWERS",
        hotelMadinah: "DURRAT AL EIMAN",
      };
      const invoices = [
        {
          id: "INV-2026-001",
          status: "unpaid",
          items: [
            {
              id: "it-base",
              kategori: "utama",
              deskripsi: "PAKET UMROH (2 Pax)",
              qty: 2,
              hargaSatuan: 30000000,
              jumlah: 60000000,
              status: "active",
            },
            {
              id: "it-room-cancelled",
              kategori: "tambahan",
              deskripsi: "Upgrade Kamar Double (2 Pax)",
              qty: 2,
              hargaSatuan: 2500000,
              jumlah: 5000000,
              status: "cancelled",
            },
            {
              id: "it-hotel-cancelled",
              kategori: "tambahan",
              deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
              qty: 2,
              hargaSatuan: 2000000,
              jumlah: 4000000,
              status: "cancelled",
            },
          ],
        },
      ];

      expect(hasMaterializedRoomOrFullLedger(invoices)).toBe(true);

      const billing = resolveCanonicalGroupBilling({
        group: { id: "grp-2", roomUpgrade: "Double", invoices },
        activePackage: pkg,
        members: [
          { id: "m-1", namaLengkap: "A" },
          { id: "m-2", namaLengkap: "B" },
        ],
      });

      expect(billing.groupTotals.upgradeKamar).toBe(0);
      expect(billing.groupTotals.upgradeHotel).toBe(0);
      expect(billing.groupTotals.netTotalTagihan).toBe(60000000);
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

  describe("Pembaruan Invoice Tanpa Pembayaran Masuk (SSOT & Zero-Payment Revision)", () => {
    it("skips Pembaruan Invoice / Revisi Invoice audit marker items in both SSOT engine and Invoice UI merger", () => {
      const markerRevision = {
        kategori: "Pembaruan Invoice",
        deskripsi: "Pembaruan rincian tagihan & potongan invoice (tanpa pembayaran masuk)",
        qty: 1,
        hargaSatuan: 0,
        jumlah: 0,
        status: "active",
      };
      const markerRevisiAlt = {
        kategori: "Revisi Invoice",
        deskripsi: "Pengurangan item upgrade hotel",
        qty: 1,
        hargaSatuan: 2500000,
        jumlah: 2500000,
        status: "active",
      };

      expect(shouldSkipNonBillingInvoiceItem(markerRevision)).toBe(true);
      expect(shouldSkipNonBillingInvoiceItem(markerRevisiAlt)).toBe(true);

      const pkg = {
        id: "pkg-umroh-9h",
        hargaPaket: 29900000,
        hotelMekkah: "LE MERIDIEN TOWERS",
        hotelMadinah: "DURRAT AL EIMAN",
      };
      const members = [
        { id: "m1", namaLengkap: "ARDI", hotelMekkah: "LE MERIDIEN TOWERS", hotelMadinah: "DURRAT AL EIMAN" },
        { id: "m2", namaLengkap: "IRDA", hotelMekkah: "LE MERIDIEN TOWERS", hotelMadinah: "DURRAT AL EIMAN" },
        { id: "m3", namaLengkap: "KADRI", hotelMekkah: "LE MERIDIEN TOWERS", hotelMadinah: "DURRAT AL EIMAN" },
      ];
      const group = {
        id: "grp-ardi",
        kodeRegistrasi: "GRP-2026-0012",
        jumlahAnggota: 3,
        keberangkatan: pkg,
        invoices: [
          {
            id: "INV-20261110-1001",
            nomorInvoice: "INV-20261110-1001",
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
                id: "it-hotel-cancelled",
                kategori: "tambahan",
                deskripsi: "Upgrade Hotel (Mekkah: SAFWAH TOWER)",
                qty: 3,
                hargaSatuan: 2000000,
                jumlah: 6000000,
                status: "cancelled",
              },
            ],
          },
          {
            id: "INV-UPD-20261111-2002",
            nomorInvoice: "INV-UPD-20261111-2002",
            status: "unpaid",
            items: [
              markerRevision,
              {
                id: "it-thoif",
                kategori: "tambahan",
                deskripsi: "City Tour Thoif",
                qty: 3,
                hargaSatuan: 750000,
                jumlah: 2250000,
                status: "active",
              },
              {
                id: "it-diskon",
                kategori: "potongan",
                deskripsi: "Diskon Rombongan",
                qty: 1,
                hargaSatuan: -1000000,
                jumlah: -1000000,
                status: "active",
              },
            ],
          },
        ],
      };

      const extracted = extractActiveLedgerItems(group.invoices);
      expect(extracted).toHaveLength(3);

      const canonical = resolveCanonicalGroupBilling({ group, activePackage: pkg, members });
      expect(canonical.groupTotals.biayaPaket).toBe(89700000);
      expect(canonical.groupTotals.upgradeHotel).toBe(0);
      expect(canonical.groupTotals.cityTourThoif).toBe(2250000);
      expect(canonical.groupTotals.diskonPromo).toBe(1000000);
      expect(canonical.groupTotals.netTotalTagihan).toBe(89700000 + 2250000 - 1000000);

      const mergedUi = mergeSavedBillingItemsFromInvoices([], group.invoices);
      expect(mergedUi).toHaveLength(3);
      expect(calculateBillingItemsNetTotal(mergedUi)).toBe(89700000 + 2250000 - 1000000);
    });

    it("builds PDF revision payload with zero incoming payment and empty verified payment history", () => {
      const billingItems: BillingItem[] = [
        {
          id: "base-1",
          nama: "PAKET UMROH 9 H (3 Pax)",
          kategori: "utama",
          nominal: 29900000,
          qty: 3,
          satuan: "Pax",
          isDefault: true,
        },
        {
          id: "add-1",
          nama: "City Tour Thoif",
          kategori: "tambahan",
          nominal: 750000,
          qty: 3,
          satuan: "Pax",
        },
        {
          id: "disc-1",
          nama: "Potongan Promo",
          kategori: "potongan",
          nominal: 500000,
          qty: 1,
          satuan: "Pax",
        },
      ];

      const group = {
        groupId: "grp-ardi",
        kodeRegistrasi: "GRP-2026-0012",
        namaGroup: "GRUP ARDI",
        jumlahAnggota: 3,
        totalPembayaran: 0,
        anggota: [{ namaLengkap: "ARDI", hotelMekkah: "LE MERIDIEN TOWERS", hotelMadinah: "DURRAT AL EIMAN" }],
        pembayaran: [{ id: "p-pending", status: "pending", jumlah: 15000000, metode: "transfer", tanggal: "2026-10-23" }],
        keberangkatan: {
          namaPaket: "PAKET UMROH 9 H",
          hargaPaket: 29900000,
          hotelMekkah: "LE MERIDIEN TOWERS",
          hotelMadinah: "DURRAT AL EIMAN",
        },
      };

      const pdfData = buildInvoicePdfDataForGroup({
        group,
        billingItems,
        invoiceNumber: "INV-UPD-20261111-1234",
        jatuhTempo: "2026-11-13",
        catatan: "Penambahan City Tour Thoif tanpa pembayaran masuk",
        nominalPembayaran: 0,
      });

      expect(pdfData.invoiceNumber).toBe("INV-UPD-20261111-1234");
      expect(pdfData.totalTagihanDisesuaikan).toBe(89700000 + 2250000 - 500000);
      expect(pdfData.totalBebanTambahan).toBe(2250000);
      expect(pdfData.totalPengurangan).toBe(500000);
      expect(pdfData.totalPembayaran).toBe(0);
      expect(pdfData.sisaTagihan).toBe(91450000);
      expect(pdfData.paymentHistory).toEqual([]);
      expect(pdfData.orderItems).toHaveLength(2);
      expect(pdfData.orderItems?.[0]?.tipe).toBe("penambahan");
      expect(pdfData.orderItems?.[1]?.tipe).toBe("pengurangan");
    });
  });
});

