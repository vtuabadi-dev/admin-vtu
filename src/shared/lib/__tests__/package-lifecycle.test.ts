import { describe, it, expect } from "vitest";
import {
  isPackageArchived,
  isPackageInProgress,
  isPackageUpcoming,
  isPackageSeatFull,
  isEligibleForKatalog,
  getStartOfToday,
} from "../package-lifecycle";

describe("ADR-0031 Package Lifecycle & Catalog Eligibility", () => {
  const today = getStartOfToday();

  // Helper create relative date
  const addDays = (days: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  describe("isPackageArchived", () => {
    it("returns true when tanggalPulang is in the past", () => {
      const pastPkg = {
        tanggalBerangkat: addDays(-20),
        tanggalPulang: addDays(-10),
      };
      expect(isPackageArchived(pastPkg)).toBe(true);
    });

    it("returns false when tanggalPulang is in the future", () => {
      const activePkg = {
        tanggalBerangkat: addDays(5),
        tanggalPulang: addDays(15),
      };
      expect(isPackageArchived(activePkg)).toBe(false);
    });

    it("returns true when status is completed even if date is missing", () => {
      expect(isPackageArchived({ status: "completed" })).toBe(true);
      expect(isPackageArchived({ status: "COMPLETED" })).toBe(true);
    });
  });

  describe("isPackageInProgress", () => {
    it("returns true when departed but not yet returned", () => {
      const inTripPkg = {
        tanggalBerangkat: addDays(-3),
        tanggalPulang: addDays(7),
      };
      expect(isPackageInProgress(inTripPkg)).toBe(true);
      expect(isPackageArchived(inTripPkg)).toBe(false);
      expect(isPackageUpcoming(inTripPkg)).toBe(false);
    });

    it("returns false when package has not departed yet", () => {
      const futurePkg = {
        tanggalBerangkat: addDays(5),
        tanggalPulang: addDays(15),
      };
      expect(isPackageInProgress(futurePkg)).toBe(false);
      expect(isPackageUpcoming(futurePkg)).toBe(true);
    });
  });

  describe("isPackageSeatFull", () => {
    it("returns true when terisi >= maxSeat", () => {
      expect(isPackageSeatFull({ terisi: 45, maxSeat: 45 })).toBe(true);
      expect(isPackageSeatFull({ terisi: 46, maxSeat: 45 })).toBe(true);
    });

    it("returns false when terisi < maxSeat", () => {
      expect(isPackageSeatFull({ terisi: 30, maxSeat: 45 })).toBe(false);
    });

    it("uses kuota as fallback if maxSeat is not specified", () => {
      expect(isPackageSeatFull({ terisi: 50, kuota: 50 })).toBe(true);
      expect(isPackageSeatFull({ terisi: 49, kuota: 50 })).toBe(false);
    });
  });

  describe("isEligibleForKatalog (Tiga Syarat Mutlak)", () => {
    it("returns true ONLY when all 3 conditions are satisfied", () => {
      const eligiblePkg = {
        tanggalBerangkat: addDays(10), // Syarat 1: Belum berangkat (Upcoming)
        tanggalPulang: addDays(20),
        kuota: 45,
        terisi: 20, // Syarat 2: Belum penuh seatnya
        isPublishedKatalog: true, // Syarat 3: Saklar aktif
      };
      expect(isEligibleForKatalog(eligiblePkg)).toBe(true);
    });

    it("fails when package has already departed (in-progress)", () => {
      const inTripPkg = {
        tanggalBerangkat: addDays(-2),
        tanggalPulang: addDays(8),
        kuota: 45,
        terisi: 20,
        isPublishedKatalog: true,
      };
      expect(isEligibleForKatalog(inTripPkg)).toBe(false);
    });

    it("fails when package is in archive (past return date)", () => {
      const archivedPkg = {
        tanggalBerangkat: addDays(-25),
        tanggalPulang: addDays(-15),
        kuota: 45,
        terisi: 20,
        isPublishedKatalog: true,
      };
      expect(isEligibleForKatalog(archivedPkg)).toBe(false);
    });

    it("fails when seat is full even if upcoming and switch ON", () => {
      const fullPkg = {
        tanggalBerangkat: addDays(10),
        tanggalPulang: addDays(20),
        kuota: 45,
        terisi: 45, // Full!
        isPublishedKatalog: true,
      };
      expect(isEligibleForKatalog(fullPkg)).toBe(false);
    });

    it("fails when catalog switch is OFF even if upcoming and seats available", () => {
      const switchOffPkg = {
        tanggalBerangkat: addDays(10),
        tanggalPulang: addDays(20),
        kuota: 45,
        terisi: 20,
        isPublishedKatalog: false, // Switch off!
      };
      expect(isEligibleForKatalog(switchOffPkg)).toBe(false);
    });
  });
});

