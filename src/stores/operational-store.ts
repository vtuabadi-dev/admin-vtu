import { create } from "zustand";
import type {
  DashboardStats,
  OperationalAlert,
} from "@/shared/types";

interface OperationalStore {
  stats: DashboardStats | null;
  alerts: OperationalAlert[];
  setStats: (stats: DashboardStats) => void;
  setAlerts: (alerts: OperationalAlert[]) => void;
}

export const useOperationalStore = create<OperationalStore>((set) => ({
  stats: null,
  alerts: [],
  setStats: (stats) => set({ stats }),
  setAlerts: (alerts) => set({ alerts }),
}));
