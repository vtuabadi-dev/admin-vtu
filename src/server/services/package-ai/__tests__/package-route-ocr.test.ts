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

  describe("Invariant 4: Equipment (Perlengkapan) Negation & Inclusion Resolution", () => {
    it("strictly resolves 'tanpa perlengkapan' as 'tidak'", () => {
      const caption = `
        Umroh New Season 1448 H
        Tidak Termasuk :
        • Paspor Pribadi
        • Tanpa Perlengkapan
        Note : paket di atas tidak termasuk perlengkapan.
      `;
      const parsed = parseCaption(caption);
      expect(parsed.isAdaPerlengkapan).toBe("tidak");
    });

    it("resolves 'termasuk perlengkapan' as 'ya' when no negations are present", () => {
      const caption = `
        Umroh Reguler 9 Hari
        Termasuk :
        • Tiket PP
        • Free Perlengkapan Umroh
      `;
      const parsed = parseCaption(caption);
      expect(parsed.isAdaPerlengkapan).toBe("ya");
    });
  });

  describe("Invariant 5: Cluster Seat vs Non-Cluster Guarantee", () => {
    it("does NOT create dummy clusters when caption has no cluster keywords", () => {
      const caption = `
        Umroh New Season 1448 H
        Harga Rp. 35.900.000
        Hotel Makkah : Makkah Tower 4 malam
        Hotel Madinah : ODST Al Madinah 3 malam
      `;
      const parsed = parseCaption(caption);
      expect(parsed.clusters).toBeUndefined();
    });

    it("correctly extracts genuine clusters when Silver, Gold, Platinum are explicitly present", () => {
      const caption = `
        Umroh Bintang 5
        Silver Rp. 38.900.000
        Gold Rp. 40.900.000
        Platinum Rp. 44.900.000
      `;
      const parsed = parseCaption(caption);
      expect(parsed.clusters).toBeDefined();
      expect(parsed.clusters?.length).toBe(3);
      expect(parsed.clusters?.map(c => c.clusterName)).toEqual([
        "Silver Package",
        "Gold Package",
        "Platinum Package"
      ]);
    });
  });

  describe("Invariant 6: Header Itinerary HARI-1 & HARI-2 Resolution (Jeddah -> Makkah vs Thaif)", () => {
    it("strictly resolves header HARI-1 'JAKARTA-DOHA-JEDDAH-MAKKAH' as JED.C-M even when Day 4 has Ziarah Kota Thaif", () => {
      const caption = `
        9 HARI PERJALANAN | STARTING JAKARTA
        HARI-1 | JAKARTA-DOHA-JEDDAH-MAKKAH
        • Tiba di Bandara Jeddah lalu melanjutkan ke Kota Makkah
        HARI-2 | MAKKAH
        HARI-4 | MAKKAH
        • Ziarah Kota Thaif, wisata kuliner & pasar buah
        Out Madinah - Jakarta
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.C-M");
    });

    it("strictly resolves header HARI-1 'JAKARTA-DOHA-JEDDAH-MAKKAH' with out Jeddah as JED.C-J", () => {
      const caption = `
        9 HARI PERJALANAN
        HARI-1 | JAKARTA-DOHA-JEDDAH-MAKKAH
        HARI-2 | MAKKAH
        Kepulangan Take Off Bandara Jeddah
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.C-J");
    });

    it("only assigns JED.TH when itinerary header explicitly states transit to Thaif first", () => {
      const caption = `
        HARI-1 | JAKARTA-JEDDAH-THAIF
        HARI-2 | THAIF
        Out Madinah
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.TH-M");
    });
  });

  describe("Invariant 7: Regular Package 6 Routes & Two-Arrow Semantics (Gambar 4)", () => {
    it("resolves Landing Madinah directly to MED-J (Madinah → Jeddah) without first arrow", () => {
      const caption = `
        PAKET UMROH REGULER 9 HARI
        HARI 1 | JAKARTA - MADINAH
        HARI 2 | MADINAH
        HARI 5 | MAKKAH
        HARI 9 | JEDDAH - JAKARTA
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("MED-J");
    });

    it("resolves Landing Jeddah with First Destination Madinah to JED.D-J (Jeddah -> Madinah → Jeddah)", () => {
      const caption = `
        PAKET REGULER 12 HARI
        HARI 1: SURABAYA - JEDDAH - MADINAH
        HARI 2: MADINAH
        HARI 6: MAKKAH
        HARI 12: KEPULANGAN VIA BANDARA JEDDAH
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.D-J");
    });

    it("resolves Landing Jeddah with First Destination Makkah and Out Madinah to JED.C-M (Jeddah -> Makkah → Madinah)", () => {
      const caption = `
        AGENDA PERJALANAN UMROH REGULER
        HARI 01: JAKARTA - JEDDAH - MAKKAH
        HARI 02: MAKKAH
        HARI 06: MADINAH
        HARI 09: BANDARA PRINCE MOHAMMAD MADINAH - JAKARTA
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.C-M");
    });

    it("resolves Landing Jeddah with First Destination Makkah and Out Jeddah to JED.C-J (Jeddah -> Makkah → Jeddah)", () => {
      const caption = `
        AGENDA PERJALANAN UMROH REGULER
        HARI 01: JAKARTA - JEDDAH - MAKKAH
        HARI 02: MAKKAH
        HARI 06: MADINAH
        HARI 09: TAKE OFF BANDARA JEDDAH
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.C-J");
    });

    it("resolves Landing Jeddah with First Destination Thaif and Out Madinah to JED.TH-M (Jeddah -> Thaif → Madinah)", () => {
      const caption = `
        HARI 1: SURABAYA - JEDDAH - THAIF
        HARI 2: THAIF - MAKKAH
        HARI 6: MADINAH
        HARI 9: TAKE OFF BANDARA MADINAH
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.TH-M");
    });

    it("resolves Landing Jeddah with First Destination Thaif and Out Jeddah to JED.TH-J (Jeddah -> Thaif → Jeddah)", () => {
      const caption = `
        HARI 1: SURABAYA - JEDDAH - THAIF
        HARI 2: THAIF - MAKKAH
        HARI 6: MADINAH
        HARI 9: TAKE OFF BANDARA JEDDAH
      `;
      const route = extractLandingRoute(caption);
      expect(route).toBe("JED.TH-J");
    });
  });
});

