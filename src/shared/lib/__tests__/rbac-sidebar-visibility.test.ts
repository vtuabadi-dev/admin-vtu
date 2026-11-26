import { describe, it, expect } from "vitest";
import { isSidebarItemVisible } from "@/shared/lib/rbac-utils";
import type { OperationalRole } from "@/shared/types";

const ALL_ROLES: OperationalRole[] = [
  "super_admin",
  "admin_operasional",
  "admin_pembayaran",
  "admin_manifest",
  "admin_dokumen",
  "admin_badal",
  "tour_leader",
  "jamaah",
];

// All 15 section+label combinations in adminNav (Sidebar.tsx)
const ADMIN_NAV_ITEMS = [
  { section: "UTAMA", label: "Dashboard", key: "UTAMA-Dashboard" },
  { section: "MASTER DATA", label: "Master Data", key: "MASTER DATA-Master Data" },
  { section: "PAKET UMROH", label: "Paket Umroh", key: "PAKET UMROH-Paket Umroh" },
  { section: "BADAL & WAKAF", label: "Badal Umroh & Wakaf", key: "BADAL & WAKAF-Badal Umroh & Wakaf" },
  { section: "JAMAAH", label: "Jamaah", key: "JAMAAH-Jamaah" },
  { section: "PEMBAYARAN", label: "Pembayaran & Keuangan", key: "PEMBAYARAN-Pembayaran & Keuangan" },
  { section: "MANIFEST", label: "Manifest", key: "MANIFEST-Manifest" },
  { section: "PERLENGKAPAN", label: "Perlengkapan", key: "PERLENGKAPAN-Perlengkapan" },
  { section: "LAINNYA", label: "Manajemen User", key: "LAINNYA-Manajemen User" },
  { section: "LAINNYA", label: "Laporan", key: "LAINNYA-Laporan" },
  { section: "LAINNYA", label: "Pengaturan", key: "LAINNYA-Pengaturan" },
  { section: "LAINNYA", label: "Aturan Operasional", key: "LAINNYA-Aturan Operasional" },
  { section: "LAINNYA", label: "Audit Trail", key: "LAINNYA-Audit Trail" },
  { section: "LAINNYA", label: "Kesehatan Sistem", key: "LAINNYA-Kesehatan Sistem" },
  { section: "LAINNYA", label: "Maintenance", key: "LAINNYA-Maintenance" },
] as const;

/**
 * Expected baseline values before the change (TUGAS 3):
 * The only item whose visibility changes is "LAINNYA-Manajemen User" for non-super_admin roles.
 */
const BASELINE_BEFORE_CHANGE: Record<OperationalRole, Record<string, boolean>> = {
  super_admin: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": true,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": true,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": true,
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": true,
    "LAINNYA-Aturan Operasional": true,
    "LAINNYA-Audit Trail": true,
    "LAINNYA-Kesehatan Sistem": true,
    "LAINNYA-Maintenance": true,
  },
  admin_operasional: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": true,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": true,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": true, // was true before change
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": true,
    "LAINNYA-Aturan Operasional": true,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  admin_pembayaran: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": true,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": true,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": true, // was true before change
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": true,
    "LAINNYA-Aturan Operasional": true,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  admin_manifest: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": true,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": true,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": true, // was true before change
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": true,
    "LAINNYA-Aturan Operasional": true,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  admin_dokumen: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": true,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": true,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": true, // was true before change
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": true,
    "LAINNYA-Aturan Operasional": true,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  admin_badal: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": false,
    "PAKET UMROH-Paket Umroh": false,
    "BADAL & WAKAF-Badal Umroh & Wakaf": true,
    "JAMAAH-Jamaah": false,
    "PEMBAYARAN-Pembayaran & Keuangan": false,
    "MANIFEST-Manifest": false,
    "PERLENGKAPAN-Perlengkapan": false,
    "LAINNYA-Manajemen User": false, // already false due to badalAllowedKeys
    "LAINNYA-Laporan": false,
    "LAINNYA-Pengaturan": false,
    "LAINNYA-Aturan Operasional": false,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  tour_leader: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": false,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": false,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": false,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": false, // false due to viewer restriction
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": false,
    "LAINNYA-Aturan Operasional": false,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
  jamaah: {
    "UTAMA-Dashboard": true,
    "MASTER DATA-Master Data": false,
    "PAKET UMROH-Paket Umroh": true,
    "BADAL & WAKAF-Badal Umroh & Wakaf": false,
    "JAMAAH-Jamaah": true,
    "PEMBAYARAN-Pembayaran & Keuangan": false,
    "MANIFEST-Manifest": true,
    "PERLENGKAPAN-Perlengkapan": true,
    "LAINNYA-Manajemen User": false, // false due to viewer restriction
    "LAINNYA-Laporan": true,
    "LAINNYA-Pengaturan": false,
    "LAINNYA-Aturan Operasional": false,
    "LAINNYA-Audit Trail": false,
    "LAINNYA-Kesehatan Sistem": false,
    "LAINNYA-Maintenance": false,
  },
};

describe("RBAC Sidebar Visibility Matrix Suite (isSidebarItemVisible)", () => {
  describe("1) super_admin visibility", () => {
    it("super_admin can view all 15 items in adminNav, including Manajemen User", () => {
      for (const item of ADMIN_NAV_ITEMS) {
        const visible = isSidebarItemVisible("super_admin", item.section, item.label);
        expect(visible, `Expected super_admin to see ${item.key}`).toBe(true);
      }
    });
  });

  describe("2) Manajemen User visibility across non-super_admin roles", () => {
    const nonSuperAdminRoles = ALL_ROLES.filter((r) => r !== "super_admin");

    it.each(nonSuperAdminRoles)(
      "role %s cannot view 'LAINNYA-Manajemen User'",
      (role) => {
        const visible = isSidebarItemVisible(role, "LAINNYA", "Manajemen User");
        expect(visible).toBe(false);
      }
    );
  });

  describe("3) Full regression matrix for all roles x all other adminNav keys", () => {
    for (const role of ALL_ROLES) {
      describe(`Role: ${role}`, () => {
        for (const item of ADMIN_NAV_ITEMS) {
          if (item.key === "LAINNYA-Manajemen User") {
            it(`'${item.key}' visibility matches new security rule`, () => {
              const expected = role === "super_admin";
              const visible = isSidebarItemVisible(role, item.section, item.label);
              expect(visible).toBe(expected);
            });
          } else {
            it(`'${item.key}' visibility remains strictly identical to baseline before change`, () => {
              const expected = BASELINE_BEFORE_CHANGE[role][item.key];
              const visible = isSidebarItemVisible(role, item.section, item.label);
              expect(visible).toBe(expected);
            });
          }
        }
      });
    }
  });
});
