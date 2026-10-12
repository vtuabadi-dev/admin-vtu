import { describe, it, expect } from "vitest";
import {
  isBaseRoomType,
  detectRoomTypeFromName,
  getPackageUpgradePrice,
  isRoomUpgradeItem,
} from "../shared-constants";

describe("Room Upgrade Pricing & Type Detection Standard", () => {
  it("identifies base room variants correctly (Quad, Quad Family, Quad Infant, Quad Fix, Mix)", () => {
    expect(isBaseRoomType("Quad")).toBe(true);
    expect(isBaseRoomType("quad")).toBe(true);
    expect(isBaseRoomType("Quad Family")).toBe(true);
    expect(isBaseRoomType("Quad Family (4 Pax)")).toBe(true);
    expect(isBaseRoomType("Quad Infant")).toBe(true);
    expect(isBaseRoomType("Quad Fix")).toBe(true);
    expect(isBaseRoomType("Mix")).toBe(true);
    expect(isBaseRoomType("Mix (Diatur Travel)")).toBe(true);
  });

  it("identifies upgrade room variants correctly (Double, Triple, Single)", () => {
    expect(isBaseRoomType("Double")).toBe(false);
    expect(isBaseRoomType("Double (2 Pax)")).toBe(false);
    expect(isBaseRoomType("Triple")).toBe(false);
    expect(isBaseRoomType("Triple (3 Pax)")).toBe(false);
    expect(isBaseRoomType("Single")).toBe(false);
    expect(isBaseRoomType("Single (1 Pax)")).toBe(false);
  });

  it("detects room type names consistently", () => {
    expect(detectRoomTypeFromName("Quad Family (4 Pax)")).toBe("Quad Family");
    expect(detectRoomTypeFromName("Quad Infant")).toBe("Quad Infant");
    expect(detectRoomTypeFromName("quinf")).toBe("Quad Infant");
    expect(detectRoomTypeFromName("Triple (3 Pax)")).toBe("Triple");
    expect(detectRoomTypeFromName("Double (2 Pax)")).toBe("Double");
    expect(detectRoomTypeFromName("Mix (Diatur Travel)")).toBe("Mix");
    expect(detectRoomTypeFromName("Fix")).toBe("Quad");
    expect(detectRoomTypeFromName("")).toBe("Quad");
  });

  it("returns Rp 0 upgrade price for all Quad and Mix rooms", () => {
    const mockPayment = {
      keberangkatan: {
        upgradeDouble: 2500000,
        upgradeTriple: 1500000,
      },
    };

    expect(getPackageUpgradePrice(mockPayment, "Quad")).toBe(0);
    expect(getPackageUpgradePrice(mockPayment, "Quad Family")).toBe(0);
    expect(getPackageUpgradePrice(mockPayment, "Quad Family (4 Pax)")).toBe(0);
    expect(getPackageUpgradePrice(mockPayment, "Quad Infant")).toBe(0);
    expect(getPackageUpgradePrice(mockPayment, "Mix")).toBe(0);
    expect(getPackageUpgradePrice(mockPayment, "Upgrade Kamar Quad Family")).toBe(0);
  });

  it("returns configured upgrade price for Double and Triple rooms", () => {
    const mockPayment = {
      keberangkatan: {
        upgradeDouble: 2500000,
        upgradeTriple: 1500000,
      },
    };

    expect(getPackageUpgradePrice(mockPayment, "Double")).toBe(2500000);
    expect(getPackageUpgradePrice(mockPayment, "Triple")).toBe(1500000);
    expect(getPackageUpgradePrice(mockPayment, "Upgrade Kamar Double")).toBe(2500000);
    expect(getPackageUpgradePrice(mockPayment, "Upgrade Kamar Triple")).toBe(1500000);
  });

  it("detects room upgrade item titles correctly", () => {
    expect(isRoomUpgradeItem("Upgrade Kamar Double")).toBe(true);
    expect(isRoomUpgradeItem("Upgrade Kamar Quad Family")).toBe(true);
    expect(isRoomUpgradeItem("Tiket Kereta Cepat")).toBe(false);
    expect(isRoomUpgradeItem("Diskon Early Bird")).toBe(false);
  });
});
