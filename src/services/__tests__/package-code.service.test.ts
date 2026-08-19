import { describe, it, expect } from "vitest";
import { generateNamaPaket } from "../../server/services/package-code.service";

describe("generateNamaPaket", () => {
  it("should generate correct date-specific names for multiple departure dates", () => {
    const params1 = {
      packageTypeCode: "REG",
      packageTypeName: "Paket Umroh",
      durasiHari: 12,
      startingPointCode: "JKT",
      routeCode: "JED.C-M",
      tanggalBerangkat: new Date("2026-09-06"),
      maskapaiCode: "SV",
      maskapaiName: "SAUDIA AIRLINES",
    };

    const params2 = {
      ...params1,
      tanggalBerangkat: new Date("2026-09-15"),
    };

    const name1 = generateNamaPaket(params1);
    const name2 = generateNamaPaket(params2);

    expect(name1).toContain("06 Sep 2026");
    expect(name2).toContain("15 Sep 2026");
    expect(name1).not.toBe(name2);
  });
});
