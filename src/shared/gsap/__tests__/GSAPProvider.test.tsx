import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GSAPProvider, GSAPLink } from "../GSAPProvider";

const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}));

describe("GSAPProvider and GSAPLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders anchor tag with valid href", () => {
    render(
      <GSAPProvider>
        <GSAPLink href="/admin/paket-umroh/generate">Generate Paket</GSAPLink>
      </GSAPProvider>
    );

    const link = screen.getByRole("link", { name: /Generate Paket/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/paket-umroh/generate");
  });

  it("calls router.prefetch on mouse enter", () => {
    render(
      <GSAPProvider>
        <GSAPLink href="/admin/dashboard">Dashboard</GSAPLink>
      </GSAPProvider>
    );

    const link = screen.getByRole("link", { name: /Dashboard/i });
    fireEvent.mouseEnter(link);

    expect(mockPrefetch).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("calls router.push and triggers transition on click", () => {
    render(
      <GSAPProvider>
        <GSAPLink href="/admin/dashboard">Dashboard</GSAPLink>
      </GSAPProvider>
    );

    const link = screen.getByRole("link", { name: /Dashboard/i });
    fireEvent.click(link);

    expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("recovers via window.location.assign if soft transition is dropped", () => {
    const originalAssign = window.location.assign;
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        pathname: "/admin/pembayaran/laporan",
        assign: assignMock,
      },
    });

    render(
      <GSAPProvider>
        <GSAPLink href="/admin/dashboard">Dashboard</GSAPLink>
      </GSAPProvider>
    );

    const link = screen.getByRole("link", { name: /Dashboard/i });
    fireEvent.click(link);

    // Fast-forward past the 350ms safety window
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(assignMock).toHaveBeenCalledWith("/admin/dashboard");

    // Restore
    window.location.assign = originalAssign;
  });

  it("allows modifier keys to pass through for opening in new tab", () => {
    render(
      <GSAPProvider>
        <GSAPLink href="/admin/dashboard">Dashboard</GSAPLink>
      </GSAPProvider>
    );

    const link = screen.getByRole("link", { name: /Dashboard/i });
    const event = fireEvent.click(link, { ctrlKey: true });

    // When ctrlKey is pressed, it does not call router.push
    expect(mockPush).not.toHaveBeenCalled();
  });
});
