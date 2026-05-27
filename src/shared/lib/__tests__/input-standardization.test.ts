import { describe, it, expect } from "vitest";
import {
  normalizeOperationalInput,
  useStandardizedInput,
} from "../input-standardization";

describe("normalizeOperationalInput", () => {
  describe("name", () => {
    it("trims and capitalizes each word", () => {
      expect(normalizeOperationalInput("  ahmad  faisal  ", "name")).toBe(
        "Ahmad Faisal"
      );
    });

    it("collapses multiple spaces", () => {
      expect(normalizeOperationalInput("budi    andi", "name")).toBe(
        "Budi Andi"
      );
    });

    it("handles single name", () => {
      expect(normalizeOperationalInput("siti", "name")).toBe("Siti");
    });
  });

  describe("nik", () => {
    it("strips non-digits and limits to 16 characters", () => {
      expect(normalizeOperationalInput("3201 1234 5678 9012 34", "nik")).toBe(
        "3201123456789012"
      );
    });

    it("filters out letters and punctuation", () => {
      expect(normalizeOperationalInput("A3201-1234.5678/9012", "nik")).toBe(
        "3201123456789012"
      );
    });
  });

  describe("passport", () => {
    it("strips spaces, uppercases, limits to 9 chars", () => {
      expect(normalizeOperationalInput(" a 1234567 b ", "passport")).toBe(
        "A1234567B"
      );
    });

    it("handles already clean passport number", () => {
      expect(normalizeOperationalInput("A12345678", "passport")).toBe(
        "A12345678"
      );
    });
  });

  describe("hotel", () => {
    it("trims and title-cases", () => {
      expect(
        normalizeOperationalInput("  hotel  madinah  palace  ", "hotel")
      ).toBe("Hotel Madinah Palace");
    });
  });

  describe("invoice_label", () => {
    it("trims and uppercases", () => {
      expect(
        normalizeOperationalInput("  invoice dp  ", "invoice_label")
      ).toBe("INVOICE DP");
    });
  });

  describe("kode", () => {
    it("strips spaces and uppercases", () => {
      expect(normalizeOperationalInput(" pkg 001 ", "kode")).toBe("PKG001");
    });
  });

  describe("text", () => {
    it("trims only", () => {
      expect(normalizeOperationalInput("  Some Text  ", "text")).toBe(
        "Some Text"
      );
    });
  });

  describe("unknown type falls back to text", () => {
    it("trims without any transformation", () => {
      expect(
        normalizeOperationalInput("  Hello World  ", "unknown" as never)
      ).toBe("Hello World");
    });
  });
});

describe("useStandardizedInput", () => {
  it("returns normalize function bound to normalizeOperationalInput", () => {
    const { normalize } = useStandardizedInput();
    expect(normalize("  test  ", "name")).toBe("Test");
  });
});
