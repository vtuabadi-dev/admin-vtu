import { create } from "zustand";
import type {
  DashboardStats,
  OperationalAlert,
  Keberangkatan,
  PackageReadinessScore,
  Jamaah,
  RegistrationGroup,
} from "@/shared/types";
import { getJamaahList, getGroupList } from "@/server/actions/api";

interface OperationalStore {
  stats: DashboardStats | null;
  alerts: OperationalAlert[];
  keberangkatanList: Keberangkatan[];
  jamaahList: Jamaah[];
  groupList: RegistrationGroup[];
  invoices: any[];
  pendingReviewCount: number;
  pendingDocReviewCount: number;
  scores: Record<string, PackageReadinessScore>;
  intelMap: Record<string, any>;
  isLoaded: boolean;

  setStats: (stats: DashboardStats) => void;
  setAlerts: (alerts: OperationalAlert[]) => void;
  setKeberangkatanList: (list: Keberangkatan[]) => void;
  setJamaahList: (list: Jamaah[]) => void;
  setGroupList: (list: RegistrationGroup[]) => void;
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
  jamaahList: [],
  groupList: [],
  invoices: [],
  pendingReviewCount: 0,
  pendingDocReviewCount: 0,
  scores: {},
  intelMap: {},
  isLoaded: false,

  setStats: (stats) => set({ stats }),
  setAlerts: (alerts) => set({ alerts }),
  setKeberangkatanList: (keberangkatanList) => set({ keberangkatanList }),
  setJamaahList: (jamaahList) => set({ jamaahList }),
  setGroupList: (groupList) => set({ groupList }),
  setInvoices: (invoices) => set({ invoices }),
  setPendingReviewCount: (pendingReviewCount) => set({ pendingReviewCount }),
  setPendingDocReviewCount: (pendingDocReviewCount) => set({ pendingDocReviewCount }),
  setScores: (scores) => set({ scores }),
  setIntelMap: (intelMap) => set({ intelMap }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),

  loadAllData: async () => {
    try {
      const [
        statsRes,
        alertsRes,
        kbrRes,
        payReviewRes,
        docReviewRes,
        invRes,
        jamaahRes,
        groupRes,
      ] = await Promise.all([
        fetch("/api/dashboard/stats").catch(() => ({ ok: false })),
        fetch("/api/dashboard/alerts").catch(() => ({ ok: false })),
        fetch("/api/keberangkatan").catch(() => ({ ok: false })),
        fetch("/api/pembayaran/review").catch(() => ({ ok: false })),
        fetch("/api/dokumen/review").catch(() => ({ ok: false })),
        fetch("/api/invoices").catch(() => ({ ok: false })),
        getJamaahList().catch(() => []),
        getGroupList().catch(() => []),
      ]);

      let stats: DashboardStats | null = null;
      let alerts: OperationalAlert[] = [];
      let keberangkatanList: Keberangkatan[] = [];
      let pendingReviewCount = 0;
      let pendingDocReviewCount = 0;
      let invoices: any[] = [];
      let jamaahList: Jamaah[] = Array.isArray(jamaahRes) ? jamaahRes : [];
      let groupList: RegistrationGroup[] = Array.isArray(groupRes) ? groupRes : [];
      const scores: Record<string, PackageReadinessScore> = {};
      const intelMap: Record<string, any> = {};

      if ((statsRes as any).ok) {
        const j = await (statsRes as Response).json();
        stats = j.data ?? j;
      }
      if ((alertsRes as any).ok) {
        const j = await (alertsRes as Response).json();
        alerts = j.data ?? [];
      }
      if ((kbrRes as any).ok) {
        const j = await (kbrRes as Response).json();
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
      if ((payReviewRes as any).ok) {
        const j = await (payReviewRes as Response).json();
        pendingReviewCount = (j.data ?? []).length;
      }
      if ((docReviewRes as any).ok) {
        const j = await (docReviewRes as Response).json();
        pendingDocReviewCount = (j.data ?? []).length;
      }
      if ((invRes as any).ok) {
        const j = await (invRes as Response).json();
        invoices = j.data ?? [];
      }

      set({
        stats,
        alerts,
        keberangkatanList,
        jamaahList,
        groupList,
        pendingReviewCount,
        pendingDocReviewCount,
        invoices,
        scores,
        intelMap,
        isLoaded: true,
      });
    } catch (error) {
      console.error("[useOperationalStore] Failed to pre-fetch global data:", error);
    }
  },
}));
