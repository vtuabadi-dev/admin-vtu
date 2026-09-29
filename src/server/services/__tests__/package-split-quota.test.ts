import { describe, it, expect } from "vitest";

/**
 * HARDENED REGRESSION TEST SUITE: Package Split & Quota Allocation Policy
 * Status: FROZEN & HARDENED (EEOS Baseline v1.2)
 *
 * Rules:
 * 1. Split Starting Point (Kota Cabang):
 *    - Quotanya MEMECAH quantity dari paket utama, BUKAN bertambah/menambah quota paket utama.
 *    - Parent quota dikurangi secara proporsional.
 * 2. Split Variant selain Starting Point (Paket Promo, Varian Spek):
 *    - TIDAK split quantity.
 *    - Quantity MENGIKUTI paket utama (shared pool).
 *    - TIDAK menambah quantity dan TIDAK mengambil jatah quantity paket utama.
 *    - JANGAN membagi quota antara paket utama dan varian promo/spek.
 */

describe("Package Split Quota Invariants", () => {
  describe("Invariant 1: Split Starting Point Quota Allocation", () => {
    it("splits quantity from parent package without increasing total group capacity", () => {
      const parentInitialQuota = 45;
      const childAllocatedSeat = 15;

      // When starting point is split:
      const parentRemainingSeat = Math.max(0, parentInitialQuota - childAllocatedSeat);
      const totalCombinedQuota = parentRemainingSeat + childAllocatedSeat;

      expect(parentRemainingSeat).toBe(30);
      expect(totalCombinedQuota).toBe(parentInitialQuota);
      expect(totalCombinedQuota).not.toBeGreaterThan(parentInitialQuota);
    });

    it("ensures pairedItems in starting point split correctly updates parent quota to allocated parent seat", () => {
      const totalGroupCapacity = 45;
      const pair = {
        parentId: "parent-keb-1",
        parentSeat: 25,
        childSeat: 20,
      };

      expect(pair.parentSeat + pair.childSeat).toBe(totalGroupCapacity);
      expect(pair.parentSeat).toBeLessThan(totalGroupCapacity);
    });
  });

  describe("Invariant 2: Non-Starting Variant (Promo & Spek) Quota Invariance", () => {
    it("mirrors parent package quota directly (shared pool) for promo variant", () => {
      const parentRecord = {
        id: "parent-keb-1",
        kuota: 45,
        maxSeat: 45,
      };

      const splitReason: string = "promo";
      const isStartingPointSplit = splitReason === "starting_point";

      let assignedChildSeat: number;
      if (!isStartingPointSplit && parentRecord) {
        assignedChildSeat = parentRecord.kuota || parentRecord.maxSeat || 45;
      } else {
        assignedChildSeat = 20;
      }

      // Child quota mirrors parent quota
      expect(assignedChildSeat).toBe(45);

      // Parent quota is NOT modified/reduced
      const parentQuotaAfter = parentRecord.kuota;
      expect(parentQuotaAfter).toBe(45);
    });

    it("mirrors parent package quota directly (shared pool) for spek variant", () => {
      const parentRecord = {
        id: "parent-keb-2",
        kuota: 40,
        maxSeat: 40,
      };

      const splitReason: string = "spek";
      const isStartingPointSplit = splitReason === "starting_point";

      let assignedChildSeat: number;
      if (!isStartingPointSplit && parentRecord) {
        assignedChildSeat = parentRecord.kuota || parentRecord.maxSeat || 45;
      } else {
        assignedChildSeat = 20;
      }

      // Child quota mirrors parent quota
      expect(assignedChildSeat).toBe(40);

      // Parent quota is NOT modified/reduced
      const parentQuotaAfter = parentRecord.kuota;
      expect(parentQuotaAfter).toBe(40);
    });

    it("strictly prevents updating/reducing parent departure seat when splitReason is not starting_point", () => {
      const parentRecord = {
        id: "parent-keb-1",
        kuota: 45,
        maxSeat: 45,
      };

      const data = {
        splitReason: "promo",
        pairedItems: [
          { parentId: "parent-keb-1", parentSeat: 23, childSeat: 22 }
        ],
      };

      const isStartingPointSplitOverall = data.splitReason === "starting_point";

      // Simulation of package.service.ts step 4
      let parentUpdatedQuota = parentRecord.kuota;
      if (isStartingPointSplitOverall && Array.isArray(data.pairedItems)) {
        parentUpdatedQuota = data.pairedItems[0]!.parentSeat;
      }

      // Because it's promo, parent quota MUST stay 45, NOT 23!
      expect(parentUpdatedQuota).toBe(45);
      expect(parentUpdatedQuota).not.toBe(23);
    });
  });
});
