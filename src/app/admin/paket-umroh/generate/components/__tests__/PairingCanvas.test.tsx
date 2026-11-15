import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PairingCanvas } from "../PairingCanvas";

describe("PairingCanvas", () => {
  const defaultProps = {
    parentStartingCity: "Surabaya",
    childStartingCity: "Jakarta",
    parentItems: [
      {
        id: "keb-sby-1",
        name: "PAKET UMROH 16 H SBY (JED.C-M) - 14 Des 2026 (GARUDA)",
        date: "2026-12-14",
        seat: 45, // Full capacity in DB before split
      },
    ],
    initialChildItems: [
      {
        tempId: "child-0",
        name: "PAKET UMROH 16 H JKT (JED.C-M) - 14 Des 2026 (GARUDA)",
        date: "2026-12-14",
      },
    ],
    totalGroupCapacity: 45,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("mengimplementasikan pembagian seat dari slider (31 Surabaya vs 14 Jakarta) dan bukan 45 vs 0", () => {
    render(
      <PairingCanvas
        {...defaultProps}
        initialChildSeat={14} // Dari slider (Jakarta 14, Surabaya 31)
      />
    );

    // Kuota Surabaya harus terisi 31 (bukan 45)
    const surabayaInput = screen.getByDisplayValue("31") as HTMLInputElement;
    expect(surabayaInput).toBeInTheDocument();

    // Sisa Quota Jakarta harus terhitung 14 Seat (bukan 0 Seat)
    expect(screen.getByText("14 Seat")).toBeInTheDocument();
    expect(screen.queryByText("0 Seat")).not.toBeInTheDocument();
  });

  it("menghitung ulang sisa kuota cabang secara dinamis saat input kuota induk diubah", () => {
    const onConfirmMock = vi.fn();
    render(
      <PairingCanvas
        {...defaultProps}
        initialChildSeat={14}
        onConfirm={onConfirmMock}
      />
    );

    const surabayaInput = screen.getByDisplayValue("31");
    // Ubah kuota Surabaya menjadi 30
    fireEvent.change(surabayaInput, { target: { value: "30" } });

    // Sisa Quota Jakarta otomatis menjadi 15 Seat (45 - 30)
    expect(screen.getByText("15 Seat")).toBeInTheDocument();

    // Klik simpan pasangan paket
    const submitBtn = screen.getByRole("button", { name: /simpan & hubungkan pasangan paket/i });
    fireEvent.click(submitBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    const pairs = onConfirmMock.mock.calls[0]![0];
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      parentId: "keb-sby-1",
      parentSeat: 30,
      childTempId: "child-0",
      childSeat: 15,
    });
  });

  it("menggunakan pembagian 50:50 jika initialChildSeat tidak disediakan", () => {
    render(
      <PairingCanvas
        {...defaultProps}
        initialChildSeat={undefined}
      />
    );

    // Math.ceil(45 / 2) = 23 untuk Surabaya, dan 45 - 23 = 22 untuk Jakarta
    expect(screen.getByDisplayValue("23")).toBeInTheDocument();
    expect(screen.getByText("22 Seat")).toBeInTheDocument();
  });
});
