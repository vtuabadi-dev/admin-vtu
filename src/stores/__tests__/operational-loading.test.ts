import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOperationalStore } from "@/stores/operational-store";

vi.mock("@/server/actions/api", () => ({
  getJamaahList: vi.fn(async () => []),
  getGroupList: vi.fn(async () => []),
}));

describe("operational data loading", () => {
  beforeEach(() => {
    useOperationalStore.setState({ isLoaded: false, stats: null, keberangkatanList: [], loadError: null, isAnalyticsLoading: false });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shares requests between the splash screen and dashboard", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ data: url.includes("stats") ? { totalJamaah: 7 } : [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([
      useOperationalStore.getState().loadAllData(),
      useOperationalStore.getState().loadAllData(),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(useOperationalStore.getState().stats?.totalJamaah).toBe(7);
    expect(useOperationalStore.getState().isLoaded).toBe(true);
  });

  it("does not cache failed critical requests as a successful empty dashboard and allows retry", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(useOperationalStore.getState().loadAllData()).resolves.toBeUndefined();
    expect(useOperationalStore.getState().loadError).toContain("Gagal memuat");
    expect(useOperationalStore.getState().isLoaded).toBe(false);
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ data: [] }) }) as any);
    await useOperationalStore.getState().loadAllData();
    expect(useOperationalStore.getState().isLoaded).toBe(true);
    expect(useOperationalStore.getState().loadError).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("renders the core snapshot while slow package analytics are still loading", async () => {
    let releaseAnalytics!: () => void;
    const analyticsPending = new Promise<void>(resolve => { releaseAnalytics = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("readiness-score") || url.includes("intelligence")) {
        await analyticsPending;
        return { ok: true, json: async () => ({ data: { overallScore: 80, totalJamaah: 7 } }) };
      }
      return { ok: true, json: async () => ({
        data: url.includes("stats") ? { totalJamaah: 7 } : url === "/api/keberangkatan" ? [{ id: "pkg-1" }] : [],
      }) };
    }));
    const loading = useOperationalStore.getState().loadAllData();
    try {
      await vi.waitFor(() => expect(useOperationalStore.getState().isLoaded).toBe(true));
      expect(useOperationalStore.getState().stats?.totalJamaah).toBe(7);
      expect(useOperationalStore.getState().isAnalyticsLoading).toBe(true);
    } finally {
      releaseAnalytics();
      await loading;
      await vi.waitFor(() => expect(useOperationalStore.getState().isAnalyticsLoading).toBe(false));
    }
    expect(useOperationalStore.getState().scores["pkg-1"]?.overallScore).toBe(80);
    expect(useOperationalStore.getState().isAnalyticsLoading).toBe(false);
  });

  it("refreshes core data after an edit even when an older analytics job is pending", async () => {
    let releaseAnalytics!: () => void;
    const analyticsPending = new Promise<void>(resolve => { releaseAnalytics = resolve; });
    let snapshot = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("readiness-score") || url.includes("intelligence")) {
        const score = snapshot * 40;
        await analyticsPending;
        return { ok: true, json: async () => ({ data: { overallScore: score } }) };
      }
      if (url.includes("stats")) snapshot += 1;
      return { ok: true, json: async () => ({
        data: url.includes("stats") ? { totalJamaah: snapshot } : url === "/api/keberangkatan" ? [{ id: "pkg-1" }] : [],
      }) };
    }));
    try {
      await useOperationalStore.getState().loadAllData();
      await useOperationalStore.getState().loadAllData();
      expect(snapshot).toBe(2);
      expect(useOperationalStore.getState().stats?.totalJamaah).toBe(2);
    } finally {
      releaseAnalytics();
      await vi.waitFor(() => expect(useOperationalStore.getState().isAnalyticsLoading).toBe(false));
    }
    expect(useOperationalStore.getState().scores["pkg-1"]?.overallScore).toBe(80);
  });
});
