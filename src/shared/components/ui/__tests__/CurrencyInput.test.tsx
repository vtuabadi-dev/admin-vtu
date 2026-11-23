import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencyInput, formatNumberWithDots, parseDotsToNumber } from "../CurrencyInput";

describe("CurrencyInput and formatting utils", () => {
  describe("formatNumberWithDots", () => {
    it("returns empty string for null, undefined, empty, or 0", () => {
      expect(formatNumberWithDots(null)).toBe("");
      expect(formatNumberWithDots(undefined)).toBe("");
      expect(formatNumberWithDots("")).toBe("");
      expect(formatNumberWithDots(0)).toBe("");
      expect(formatNumberWithDots("0")).toBe("");
    });

    it("formats 3-digit numbers without dots", () => {
      expect(formatNumberWithDots(500)).toBe("500");
      expect(formatNumberWithDots("500")).toBe("500");
    });

    it("formats 6-digit numbers with dots", () => {
      expect(formatNumberWithDots(500000)).toBe("500.000");
      expect(formatNumberWithDots("500000")).toBe("500.000");
    });

    it("formats 8-digit and large numbers correctly", () => {
      expect(formatNumberWithDots(35000000)).toBe("35.000.000");
      expect(formatNumberWithDots("35000000")).toBe("35.000.000");
      expect(formatNumberWithDots(1500000000)).toBe("1.500.000.000");
    });

    it("handles non-numeric strings safely", () => {
      expect(formatNumberWithDots("Rp 500.000")).toBe("500.000");
      expect(formatNumberWithDots("abc")).toBe("");
    });
  });

  describe("parseDotsToNumber", () => {
    it("returns 0 for empty or invalid strings", () => {
      expect(parseDotsToNumber("")).toBe(0);
      expect(parseDotsToNumber("abc")).toBe(0);
    });

    it("parses dotted numbers into raw integers", () => {
      expect(parseDotsToNumber("500.000")).toBe(500000);
      expect(parseDotsToNumber("35.000.000")).toBe(35000000);
    });

    it("parses numbers with Rp prefix or other characters", () => {
      expect(parseDotsToNumber("Rp 500.000")).toBe(500000);
      expect(parseDotsToNumber("Rp. 35.000.000,-")).toBe(35000000);
    });
  });

  describe("CurrencyInput component", () => {
    it("renders prefix 'Rp' by default", () => {
      render(<CurrencyInput value={500000} onChange={() => {}} />);
      expect(screen.getByText("Rp")).toBeDefined();
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("500.000");
    });

    it("renders custom prefix when provided", () => {
      render(<CurrencyInput value={100} prefix="SAR" onChange={() => {}} />);
      expect(screen.getByText("SAR")).toBeDefined();
    });

    it("calls onChange with numeric value when typed", () => {
      const handleChange = vi.fn();
      render(<CurrencyInput value={0} onChange={handleChange} />);
      const input = screen.getByRole("textbox") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "500000" } });
      expect(handleChange).toHaveBeenCalledWith(500000);
    });

    it("renders optional label when provided", () => {
      render(<CurrencyInput label="Nominal Per Unit / Pax (Rp)" value={0} onChange={() => {}} id="unit-nominal" />);
      expect(screen.getByText("Nominal Per Unit / Pax (Rp)")).toBeDefined();
    });

    it("renders error message when error prop is set", () => {
      render(<CurrencyInput value={0} onChange={() => {}} error="Nominal wajib diisi" />);
      expect(screen.getByText("Nominal wajib diisi")).toBeDefined();
    });
  });
});
