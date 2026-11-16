import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JamaahListPage from "../page";
import { useOperationalStore } from "@/stores/operational-store";
import { getJamaahList } from "@/server/actions/api";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/shared/providers/RealtimeProvider", () => ({ useRealtimeListener: vi.fn() }));
vi.mock("@/server/actions/api", () => ({
  getJamaahList: vi.fn(async () => []),
  getInvoiceList: vi.fn(async () => []),
  getGroupList: vi.fn(async () => []),
}));

describe("jamaah list loading and navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOperationalStore.setState({ jamaahList: [], groupList: [], invoices: [] });
    vi.mocked(getJamaahList).mockResolvedValue([]);
  });

  it("does not expose the retired add button or a separate manual registration entry", async () => {
    render(<JamaahListPage />);
    expect(await screen.findByRole("heading", { name: "Data Jamaah" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tambah Jamaah/ })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a retryable error instead of treating a failed request as an empty list", async () => {
    vi.mocked(getJamaahList).mockRejectedValueOnce(new Error("Koneksi tidak tersedia"));
    render(<JamaahListPage />);
    expect(await screen.findByText("Koneksi tidak tersedia")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba Lagi" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Data Jamaah" })).toBeInTheDocument());
    expect(screen.queryByText("Koneksi tidak tersedia")).not.toBeInTheDocument();
  });
});
