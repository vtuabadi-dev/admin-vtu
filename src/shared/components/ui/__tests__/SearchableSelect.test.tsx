import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SearchableSelect,
  filterAndLimitOptions,
  type SearchableOption,
} from "../SearchableSelect";

const SAMPLE_HOTELS: SearchableOption[] = [
  { value: "LE MERIDIEN TOWERS", label: "LE MERIDIEN TOWERS", sublabel: "Asal Paket Standar" },
  { value: "MAKKAH TOWERS", label: "MAKKAH TOWERS" },
  { value: "AL ANDALUS SUITES", label: "AL ANDALUS SUITES" },
  { value: "AL FAJR ALBADEA HOTEL", label: "AL FAJR ALBADEA HOTEL" },
  { value: "ALMIQAT AJYAD HOTEL", label: "ALMIQAT AJYAD HOTEL" },
  { value: "ANJUM", label: "ANJUM" },
  { value: "DAR AL EIMAN SOFWAH", label: "DAR AL EIMAN SOFWAH" },
  { value: "FAIRMONT HOTEL", label: "FAIRMONT HOTEL" },
  { value: "HILTON SUITE", label: "HILTON SUITE" },
  { value: "SWISSOTEL MAKKAH", label: "SWISSOTEL MAKKAH" },
];

describe("filterAndLimitOptions", () => {
  it("hanya menampilkan maksimal 6 opsi teratas saat dibuka tanpa filter aktif", () => {
    const { filteredOptions, visibleOptions } = filterAndLimitOptions(
      SAMPLE_HOTELS,
      "LE MERIDIEN TOWERS",
      {
        isOpen: true,
        selectedLabel: "LE MERIDIEN TOWERS",
        maxVisibleOptions: 6,
      }
    );

    expect(filteredOptions).toHaveLength(10);
    expect(visibleOptions).toHaveLength(6);
    expect(visibleOptions.map((o) => o.value)).toEqual([
      "LE MERIDIEN TOWERS",
      "MAKKAH TOWERS",
      "AL ANDALUS SUITES",
      "AL FAJR ALBADEA HOTEL",
      "ALMIQAT AJYAD HOTEL",
      "ANJUM",
    ]);
  });

  it("tetap mencari seluruh daftar di luar 6 besar saat mengetik kata kunci", () => {
    const { filteredOptions, visibleOptions } = filterAndLimitOptions(
      SAMPLE_HOTELS,
      "swiss",
      {
        isOpen: true,
        selectedLabel: "LE MERIDIEN TOWERS",
        maxVisibleOptions: 6,
      }
    );

    expect(filteredOptions).toHaveLength(1);
    expect(visibleOptions).toHaveLength(1);
    expect(visibleOptions[0]?.value).toBe("SWISSOTEL MAKKAH");
  });

  it("membatasi hasil pencarian ke 6 teratas jika kecocokan lebih dari 6", () => {
    const { filteredOptions, visibleOptions } = filterAndLimitOptions(
      SAMPLE_HOTELS,
      "hotel",
      {
        isOpen: true,
        maxVisibleOptions: 6,
      }
    );

    expect(filteredOptions.length).toBeLessThanOrEqual(6);
    expect(visibleOptions).toHaveLength(filteredOptions.length);
  });
});

describe("SearchableSelect top-6 & portal behavior", () => {
  it("merender maksimal 6 opsi teratas ke portal dan dapat mencari opsi di urutan bawah", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={SAMPLE_HOTELS}
        value="LE MERIDIEN TOWERS"
        onChange={onChange}
        maxVisibleOptions={6}
        renderInPortal
        allowClear={false}
        searchPlaceholder="Ketik nama hotel..."
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);

    expect(screen.getByText("Menampilkan 6 teratas dari 10")).toBeInTheDocument();
    expect(screen.getByText("ANJUM")).toBeInTheDocument();
    expect(screen.queryByText("SWISSOTEL MAKKAH")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "swiss" } });
    expect(screen.getByText("SWISSOTEL MAKKAH")).toBeInTheDocument();
    expect(screen.queryByText("ANJUM")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("SWISSOTEL MAKKAH"));
    expect(onChange).toHaveBeenCalledWith("SWISSOTEL MAKKAH");
  });

  it("dengan allowClear=false tombol X hanya membersihkan pencarian tanpa mereset value", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        options={SAMPLE_HOTELS}
        value="LE MERIDIEN TOWERS"
        onChange={onChange}
        maxVisibleOptions={6}
        allowClear={false}
      />
    );

    const clearBtn = screen.getByTitle("Bersihkan pencarian");
    fireEvent.click(clearBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByText("Menampilkan 6 teratas dari 10")).toBeInTheDocument();
  });
});

