import { create } from "zustand";
import type {
  DashboardStats,
  OperationalAlert,
  Keberangkatan,
  PackageReadinessScore,
} from "@/shared/types";

interface OperationalStore {
  stats: DashboardStats | null;
  alerts: OperationalAlert[];
  keberangkatanList: Keberangkatan[];
  invoices: any[];
  pendingReviewCount: number;
  pendingDocReviewCount: number;
  scores: Record<string, PackageReadinessScore>;
  intelMap: Record<string, any>;
  isLoaded: boolean;

  setStats: (stats: DashboardStats) => void;
  setAlerts: (alerts: OperationalAlert[]) => void;
  setKeberangkatanList: (list: Keberangkatan[]) => void;
  setInvoices: (list: any[]) => void;
  setPendingReviewCount: (count: number) => void;
  setPendingDocReviewCount: (count: number) => void;
  setScores: (scores: Record<string, PackageReadinessScore>) => void;
  setIntelMap: (intelMap: Record<string, any>) => void;
  setIsLoaded: (isLoaded: boolean) => void;
  loadAllData: () => Promise<void>;
}

export const useOperationalStore = create<OperationalStore>((set) => ({
  stats: null,
  alerts: [],
  keberangkatanList: [],
  invoices: [],
  pendingReviewCount: 0,
  pendingDocReviewCount: 0,
  scores: {},
  intelMap: {},
  isLoaded: false,

  setStats: (stats) => set({ stats }),
  setAlerts: (alerts) => set({ alerts }),
  setKeberangkatanList: (keberangkatanList) => set({ keberangkatanList }),
  setInvoices: (invoices) => set({ invoices }),
  setPendingReviewCount: (pendingReviewCount) => set({ pendingReviewCount }),
  setPendingDocReviewCount: (pendingDocReviewCount) => set({ pendingDocReviewCount }),
  setScores: (scores) => set({ scores }),
  setIntelMap: (intelMap) => set({ intelMap }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),

  loadAllData: async () => {
    try {
      const [statsRes, alertsRes, kbrRes, payReviewRes, docReviewRes, invRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/alerts"),
        fetch("/api/keberangkatan"),
        fetch("/api/pembayaran/review"),
        fetch("/api/dokumen/review"),
        fetch("/api/invoices"),
      ]);

      let stats: DashboardStats | null = null;
      let alerts: OperationalAlert[] = [];
      let keberangkatanList: Keberangkatan[] = [];
      let pendingReviewCount = 0;
      let pendingDocReviewCount = 0;
      let invoices: any[] = [];
      const scores: Record<string, PackageReadinessScore> = {};
      const intelMap: Record<string, any> = {};

      if (statsRes.ok) {
        const j = await statsRes.json();
        stats = j.data ?? j;
      }
      if (alertsRes.ok) {
        const j = await alertsRes.json();
        alerts = j.data ?? [];
      }
      if (kbrRes.ok) {
        const j = await kbrRes.json();
        keberangkatanList = j.data ?? [];

        // Pre-fetch scores and intel maps for all packages in parallel
        await Promise.all(
          keberangkatanList.map(async (pkg) => {
            try {
              const [scoreRes, intelRes] = await Promise.all([
                fetch(`/api/keberangkatan/${pkg.id}/readiness-score`),
                fetch(`/api/keberangkatan/${pkg.id}/intelligence`),
              ]);
              if (scoreRes.ok) {
                const sj = await scoreRes.json();
                if (sj.data) scores[pkg.id] = sj.data;
              }
              if (intelRes.ok) {
                const ij = await intelRes.json();
                if (ij.data) intelMap[pkg.id] = ij.data;
              }
            } catch (err) {
              console.warn(`[useOperationalStore] Failed to load data for package ${pkg.id}:`, err);
            }
          })
        );
      }
      if (payReviewRes.ok) {
        const j = await payReviewRes.json();
        pendingReviewCount = (j.data ?? []).length;
      }
      if (docReviewRes.ok) {
        const j = await docReviewRes.json();
        pendingDocReviewCount = (j.data ?? []).length;
      }
      if (invRes.ok) {
        const j = await invRes.json();
        invoices = j.data ?? [];
      }

      set({
        stats,
        alerts,
        keberangkatanList,
        pendingReviewCount,
        pendingDocReviewCount,
        invoices,
        scores,
        intelMap,
        isLoaded: true,
      });
    } catch (error) {
      console.error("[useOperationalStore] Failed to pre-fetch global data:", error);
      throw error;
    }
  },
}));
