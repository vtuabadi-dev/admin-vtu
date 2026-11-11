import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  HotelUpgradeSelector,
  buildHotelUpgradeOptions,
} from "../HotelUpgradeSelector";

const MEKKAH_HOTELS = [
  "LE MERIDIEN TOWERS",
  "MAKKAH TOWERS",
  "AL ANDALUS SUITES",
  "AL FAJR ALBADEA HOTEL",
  "ALMIQAT AJYAD HOTEL",
  "ANJUM",
  "FAIRMONT HOTEL",
  "HILTON SUITE",
  "PULLMAN HOTEL",
];

const MADINAH_HOTELS = [
  "DURRAT AL EIMAN",
  "ANWAR AL MADINAH MOVENPICK",
  "CROWN PLAZA MADINAH",
  "DALLAH TAIBAH",
  "FRONTEL AL HARITHIA",
  "LEADER AL MUNA KARIM",
  "OBEROY MADINAH",
];

describe("buildHotelUpgradeOptions", () => {
  it("memprioritaskan hotel upgrade aktif dan asal paket tanpa duplikasi", () => {
    const opts = buildHotelUpgradeOptions({
      options: MEKKAH_HOTELS,
      packageHotel: "LE MERIDIEN TOWERS",
      currentHotel: "FAIRMONT HOTEL",
      selectedHotel: "PULLMAN HOTEL",
    });

    expect(opts[0]).toEqual({
      value: "FAIRMONT HOTEL",
      label: "FAIRMONT HOTEL",
      sublabel: "Hotel Saat Ini - Upgrade",
    });
    expect(opts[1]).toEqual({
      value: "LE MERIDIEN TOWERS",
      label: "LE MERIDIEN TOWERS",
      sublabel: "Asal Paket Standar",
    });
    expect(opts[2]).toEqual({
      value: "PULLMAN HOTEL",
      label: "PULLMAN HOTEL",
      sublabel: "Pilihan Saat Ini",
    });

    const uniqueValues = new Set(opts.map((o) => o.value));
    expect(uniqueValues.size).toBe(opts.length);
  });
});

describe("HotelUpgradeSelector", () => {
  it("menampilkan searchable dropdown Makkah & Madinah dengan batas 6 opsi teratas dan tetap bisa mencari hotel lain", () => {
    const onChangeHotelMekkah = vi.fn();
    const onChangeHotelMadinah = vi.fn();

    render(
      <HotelUpgradeSelector
        currentHotelMekkah="LE MERIDIEN TOWERS"
        packageHotelMekkah="LE MERIDIEN TOWERS"
        selectedHotelMekkah=""
        onChangeHotelMekkah={onChangeHotelMekkah}
        mekkahHotelOptions={MEKKAH_HOTELS}
        currentHotelMadinah="DURRAT AL EIMAN"
        packageHotelMadinah="DURRAT AL EIMAN"
        selectedHotelMadinah=""
        onChangeHotelMadinah={onChangeHotelMadinah}
        madinahHotelOptions={MADINAH_HOTELS}
      />
    );

    const [mekkahInput, madinahInput] = screen.getAllByRole("textbox");
    expect(mekkahInput).toBeDefined();
    expect(madinahInput).toBeDefined();
    if (!mekkahInput || !madinahInput) {
      throw new Error("Expected 2 searchable hotel inputs");
    }

    expect(mekkahInput).toHaveValue("LE MERIDIEN TOWERS");
    expect(madinahInput).toHaveValue("DURRAT AL EIMAN");

    fireEvent.focus(mekkahInput);
    expect(screen.getByText("Menampilkan 6 teratas dari 9")).toBeInTheDocument();
    expect(screen.queryByText("PULLMAN HOTEL")).not.toBeInTheDocument();

    fireEvent.change(mekkahInput, { target: { value: "pull" } });
    fireEvent.click(screen.getByText("PULLMAN HOTEL"));
    expect(onChangeHotelMekkah).toHaveBeenCalledWith("PULLMAN HOTEL");

    fireEvent.focus(madinahInput);
    expect(screen.getByText("Menampilkan 6 teratas dari 7")).toBeInTheDocument();
    fireEvent.change(madinahInput, { target: { value: "oberoy" } });
    fireEvent.click(screen.getByText("OBEROY MADINAH"));
    expect(onChangeHotelMadinah).toHaveBeenCalledWith("OBEROY MADINAH");
  });
});

