import { describe, it, expect } from "vitest";
import { groupHotelOptionsIntoVariants } from "../hotel-utils";

describe("groupHotelOptionsIntoVariants", () => {
  it("should group multi-cluster Varian 2 items into a single variant entry", () => {
    const rawOptions = [
      {
        hargaBase: 37900000,
        clusterName: "Reguler",
        hotelMekkah: "JUMEIRAH JABAL OMAR",
        hotelMadinah: "ODST AL MADINAH",
        isVarianUtama: true,
      },
      {
        clusterName: "Silver",
        variantName: "Varian 2",
        isVarian2: true,
        hargaBase: 36900000,
        hotelMekkah: "GRAND AL MASSA",
        hotelMadinah: "DURRAT AL EIMAN",
        isPublishedKatalog: true,
      },
      {
        clusterName: "Gold",
        variantName: "Varian 2",
        isVarian2: true,
        hargaBase: 38900000,
        hotelMekkah: "RAYYANA GRAND PLAZA",
        hotelMadinah: "GRAND PLAZA MADINAH",
        isPublishedKatalog: false,
      },
      {
        clusterName: "Platinum",
        variantName: "Varian 2",
        isVarian2: true,
        hargaBase: 42900000,
        hotelMekkah: "SAFWAH TOWER",
        hotelMadinah: "AL AQEEQ MADINAH",
      },
    ];

    const result = groupHotelOptionsIntoVariants(rawOptions, true);

    // Harus terbagi menjadi 2 grup saja (Varian Utama dan Varian 2), BUKAN 4
    expect(result).toHaveLength(2);

    // Group 1: Varian Utama (V1)
    expect(result[0]!.variantName).toBe("Varian Utama (V1)");
    expect(result[0]!.isV2).toBe(false);
    expect(result[0]!.indices).toEqual([0]);
    expect(result[0]!.minPrice).toBe(37900000);
    expect(result[0]!.isPublished).toBe(true);

    // Group 2: Varian 2
    expect(result[1]!.variantName).toBe("Varian 2");
    expect(result[1]!.isV2).toBe(true);
    expect(result[1]!.indices).toEqual([1, 2, 3]);
    expect(result[1]!.minPrice).toBe(36900000);
    expect(result[1]!.isPublished).toBe(true);
    expect(result[1]!.clusterSummary).toBe("Silver, Gold, Platinum");
  });

  it("should not create multiple variants if package has clusters without Varian 2", () => {
    const rawOptions = [
      {
        clusterName: "SILVER",
        hotelMekkah: "GRAND AL MASSA",
        hotelMadinah: "DURRAT AL EIMAN",
        hargaBase: 35900000,
      },
      {
        clusterName: "GOLD",
        hotelMekkah: "RAYYANA GRAND PLAZA",
        hotelMadinah: "GRAND PLAZA MADINAH",
        hargaBase: 37900000,
      },
      {
        clusterName: "PLATINUM",
        hotelMekkah: "SAFWAH TOWER",
        hotelMadinah: "AL HARAM HOTEL",
        hargaBase: 41900000,
      },
    ];

    const result = groupHotelOptionsIntoVariants(rawOptions, true);

    // Hanya 1 grup varian (Varian Utama) yang memuat ketiga klaster
    expect(result).toHaveLength(1);
    expect(result[0]!.isV2).toBe(false);
    expect(result[0]!.indices).toEqual([0, 1, 2]);
    expect(result[0]!.minPrice).toBe(35900000);
    expect(result[0]!.clusterSummary).toBe("SILVER, GOLD, PLATINUM");
  });
});
