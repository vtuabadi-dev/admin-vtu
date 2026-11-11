import { create } from "zustand";
import type {
  DashboardStats,
  OperationalAlert,
  Keberangkatan,
  PackageReadinessScore,
  Jamaah,
  RegistrationGroup,
  GroupPaymentSummary,
} from "@/shared/types";
import { getJamaahList, getGroupList } from "@/server/actions/api";

export interface OperationalStaleFlags {
  groups: boolean;
  jamaah: boolean;
}

export interface JamaahHotelPatchParams {
  jamaahIds?: string[];
  jamaahNames?: string[];
  groupId?: string;
  hotelMekkah?: string;
  hotelMadinah?: string;
}

/**
 * Menggabungkan item baru berdasarkan id ke dalam daftar lama tanpa menghapus entri paket lain.
 */
export function mergeEntitiesById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing;
  const incomingMap = new Map(incoming.map((item) => [item.id, item]));
  const merged = existing.map((item) => incomingMap.get(item.id) ?? item);
  const existingIds = new Set(existing.map((item) => item.id));
  for (const item of incoming) {
    if (!existingIds.has(item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

/**
 * Memperbarui atau menyisipkan snapshot satu group pada groupList tanpa menunggu refetch global.
 */
export function mergeGroupIntoList(
  existing: RegistrationGroup[],
  patch: Partial<RegistrationGroup> & { id: string }
): RegistrationGroup[] {
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<RegistrationGroup> & { id: string };

  let found = false;
  const next = existing.map((g) => {
    if (g.id !== cleanPatch.id) return g;
    found = true;
    return { ...g, ...cleanPatch };
  });
  if (!found && cleanPatch.kodeRegistrasi) {
    return [...next, cleanPatch as RegistrationGroup];
  }
  return next;
}

/**
 * Mengaplikasikan perubahan hotel Mekkah/Madinah secara sinkron ke array jamaah di store.
 */
export function applyHotelUpdatesToJamaahList<
  T extends { id?: string; groupId?: string; namaLengkap?: string; hotelMekkah?: string; hotelMadinah?: string }
>(list: T[], params: JamaahHotelPatchParams): T[] {
  const targetIds = new Set((params.jamaahIds ?? []).filter(Boolean));
  const targetNames = new Set((params.jamaahNames ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean));
  const targetGroupId = params.groupId;

  if (!params.hotelMekkah && !params.hotelMadinah) return list;

  return list.map((j) => {
    const idMatch = Boolean(j.id && targetIds.has(j.id));
    const nameMatch = Boolean(j.namaLengkap && targetNames.has(j.namaLengkap.trim().toLowerCase()));
    const groupMatch = !targetGroupId || !j.groupId || j.groupId === targetGroupId;
    const allGroupMembersMatch =
      Boolean(targetGroupId && j.groupId === targetGroupId) && targetIds.size === 0 && targetNames.size === 0;

    if (idMatch || (nameMatch && groupMatch) || allGroupMembersMatch) {
      return {
        ...j,
        ...(params.hotelMekkah ? { hotelMekkah: params.hotelMekkah } : {}),
        ...(params.hotelMadinah ? { hotelMadinah: params.hotelMadinah } : {}),
      };
    }
    return j;
  });
}

/**
 * Mengonversi GroupPaymentSummary menjadi partial RegistrationGroup untuk patch store.
 */
export function buildPartialGroupFromSummary(
  summary: GroupPaymentSummary
): Partial<RegistrationGroup> & { id: string } {
  const id = summary.groupId || summary.id || "";
  const raw = {
    id,
    kodeRegistrasi: summary.kodeRegistrasi,
    namaGroup: summary.namaGroup,
    totalTagihan: summary.totalTagihan,
    totalPembayaran: summary.totalPembayaran,
    sisaPembayaran: summary.sisaPembayaran,
    jumlahAnggota: summary.jumlahAnggota,
    anggota: summary.anggota,
    pembayaran: summary.pembayaran,
    invoices: summary.invoices,
    hotelUpgrade: summary.hotelUpgrade,
    roomUpgrade: summary.roomUpgrade,
    isKeretaCepat: summary.isKeretaCepat,
    isCityTourThoif: summary.isCityTourThoif,
    registrationRequests: summary.registrationRequests,
  };
  return {
    ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)),
    id,
  } as Partial<RegistrationGroup> & { id: string };
}

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
  staleFlags: OperationalStaleFlags;

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
  invalidateOperationalData: (targets?: Array<keyof OperationalStaleFlags>) => void;
  upsertGroupInStore: (patch: Partial<RegistrationGroup> & { id: string }) => void;
  upsertGroupsInStore: (incoming: RegistrationGroup[]) => void;
  upsertJamaahInStore: (incoming: Jamaah[]) => void;
  updateJamaahHotelsInStore: (params: JamaahHotelPatchParams) => void;
  syncGroupSummaryInStore: (summary: GroupPaymentSummary) => void;
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
  staleFlags: { groups: false, jamaah: false },

  setStats: (stats) => set({ stats }),
  setAlerts: (alerts) => set({ alerts }),
  setKeberangkatanList: (keberangkatanList) => set({ keberangkatanList }),
  setJamaahList: (jamaahList) =>
    set((state) => ({
      jamaahList,
      staleFlags: { ...state.staleFlags, jamaah: false },
    })),
  setGroupList: (groupList) =>
    set((state) => ({
      groupList,
      staleFlags: { ...state.staleFlags, groups: false },
    })),
  setInvoices: (invoices) => set({ invoices }),
  setPendingReviewCount: (pendingReviewCount) => set({ pendingReviewCount }),
  setPendingDocReviewCount: (pendingDocReviewCount) => set({ pendingDocReviewCount }),
  setScores: (scores) => set({ scores }),
  setIntelMap: (intelMap) => set({ intelMap }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),
  invalidateOperationalData: (targets = ["groups", "jamaah"]) =>
    set((state) => ({
      staleFlags: {
        groups: state.staleFlags.groups || targets.includes("groups"),
        jamaah: state.staleFlags.jamaah || targets.includes("jamaah"),
      },
    })),
  upsertGroupInStore: (patch) =>
    set((state) => ({
      groupList: mergeGroupIntoList(state.groupList, patch),
      staleFlags: { ...state.staleFlags, groups: false },
    })),
  upsertGroupsInStore: (incoming) =>
    set((state) => ({
      groupList: mergeEntitiesById(state.groupList, incoming),
      staleFlags: { ...state.staleFlags, groups: false },
    })),
  upsertJamaahInStore: (incoming) =>
    set((state) => ({
      jamaahList: mergeEntitiesById(state.jamaahList, incoming),
      staleFlags: { ...state.staleFlags, jamaah: false },
    })),
  updateJamaahHotelsInStore: (params) =>
    set((state) => ({
      jamaahList: applyHotelUpdatesToJamaahList(state.jamaahList, params),
      groupList: state.groupList.map((g) => {
        if (params.groupId && g.id !== params.groupId) return g;
        if (!Array.isArray(g.anggota)) return g;
        return {
          ...g,
          anggota: applyHotelUpdatesToJamaahList(g.anggota, params),
        };
      }),
      staleFlags: { ...state.staleFlags, jamaah: false },
    })),
  syncGroupSummaryInStore: (summary) => {
    const partial = buildPartialGroupFromSummary(summary);
    if (!partial.id) return;
    set((state) => ({
      groupList: mergeGroupIntoList(state.groupList, partial),
      staleFlags: { ...state.staleFlags, groups: false },
    }));
  },

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
        staleFlags: { groups: false, jamaah: false },
      });
    } catch (error) {
      console.error("[useOperationalStore] Failed to pre-fetch global data:", error);
    }
  },
}));
