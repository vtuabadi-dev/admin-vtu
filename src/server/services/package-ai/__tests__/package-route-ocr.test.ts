import { describe, it, expect } from "vitest";
import { parseCaption, extractLandingRoute } from "../caption-parser";

/**
 * HARDENED REGRESSION TEST SUITE: Package AI OCR & Route Parsing
 * Status: FROZEN & HARDENED (EEOS Baseline v1.2 / ADR-0009)
 * 
 * Invariants:
 * 1. Initial after '-' in Saudi Arabia route is always OUT (Takeoff/Kepulangan dari Saudi):
 *    - 'J' -> Jeddah (JED)
 *    - 'M' -> Madinah (MED)
 * 2. In-Out pair strictly resolves J and M.
 * 3. Package title and category normalizations.
 */
describe("Package OCR & Route Resolution — Hardened Suite", () => {
  describe("Invariant 1: Saudi In-Out Route Resolution (J and M initials)", () => {
    it("correctly identifies 'J-M' as IN: Jeddah, OUT: Madinah (JED.C-M)", () => {
      const route = extractLandingRoute("Paket Umroh Reguler 12 Hari rute J-M by Lion Air");
      expect(route).toBe("JED.C-M");
    });

    it("correctly identifies 'M-J' as IN: Madinah, OUT: Jeddah (MED-J)", () => {
      const route = extractLandingRoute("Umroh Plus Turki 16 Hari Rute M-J Saudia Airlines");
      expect(route).toBe("MED-J");
    });

    it("resolves full IATA codes SUB-JED // MED-SUB to IN: Jeddah, OUT: Madinah (JED.C-M)", () => {
      const route = extractLandingRoute("Flight: SUB-JED // MED-SUB SV3887");
      expect(route).toBe("JED.C-M");
    });

    it("resolves full IATA codes SUB-MED // JED-SUB to IN: Madinah, OUT: Jeddah (MED-J)", () => {
      const route = extractLandingRoute("Flight: SUB-MED // JED-SUB SV3887");
      expect(route).toBe("MED-J");
    });

    it("extracts route code embedded in flyer title or flyer tags e.g. 'UMROH REGULER 12H (M-J)'", () => {
      const route = extractLandingRoute("HOT PROMO UMROH REGULER 12 HARI (M-J) PROGRAM SYAWAL");
      expect(route).toBe("MED-J");
    });

    it("handles explicit JED.TH-M and JED.TH-J routes", () => {
      expect(extractLandingRoute("Rute JED.TH-M keberangkatan Surabaya")).toBe("JED.TH-M");
      expect(extractLandingRoute("Rute JED.TH-J keberangkatan Surabaya")).toBe("JED.TH-J");
    });
  });

  describe("Invariant 2: Full Caption Parsing with Route Invariants", () => {
    it("parses caption with J-M route and extracts matching landingRoute", () => {
      const parsed = parseCaption(`
        PAKET UMROH REGULER 12 HARI
        RUTE J-M (LION AIR)
        BERANGKAT SURABAYA
        HOTEL MEKKAH: SWISSOTEL
        HOTEL MADINAH: DAR AL TAQWA
        JADWAL: 15 JULI 2026
      `);
      expect(parsed.landingRoute).toBe("JED.C-M");
      expect(parsed.durationDays).toBe(12);
      expect(parsed.packageType).toBe("umroh_reguler");
    });

    it("parses caption with M-J route and extracts matching landingRoute", () => {
      const parsed = parseCaption(`
        PAKET UMROH REGULER 16 HARI
        RUTE M-J (SAUDIA AIRLINES)
        BERANGKAT JAKARTA
        HOTEL MEKKAH: MOVENPICK
        HOTEL MADINAH: DALLAH TAIBAH
        JADWAL: 20 AGUSTUS 2026
      `);
      expect(parsed.landingRoute).toBe("MED-J");
      expect(parsed.durationDays).toBe(16);
      expect(parsed.packageType).toBe("umroh_reguler");
    });
  });

  describe("Invariant 3: Package Type Classification", () => {
    it("classifies regular umroh correctly", () => {
      const parsed = parseCaption("UMROH REGULER 9 HARI PROMO");
      expect(parsed.packageType).toBe("umroh_reguler");
    });

    it("classifies umroh plus destination correctly", () => {
      const parsed = parseCaption("UMROH PLUS TURKI 16 HARI CAPPADOCIA");
      expect(parsed.packageType).toBe("umroh_plus");
    });
  });
});
