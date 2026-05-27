import { create } from "zustand";

interface AdminStore {
  // Filters
  jamaahFilter: string;
  dokumenFilter: string;
  pembayaranFilter: string;
  selectedKeberangkatanId: string | null;
  setJamaahFilter: (filter: string) => void;
  setDokumenFilter: (filter: string) => void;
  setPembayaranFilter: (filter: string) => void;
  setSelectedKeberangkatanId: (id: string | null) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  jamaahFilter: "semua",
  dokumenFilter: "semua",
  pembayaranFilter: "semua",
  selectedKeberangkatanId: null,
  setJamaahFilter: (filter) => set({ jamaahFilter: filter }),
  setDokumenFilter: (filter) => set({ dokumenFilter: filter }),
  setPembayaranFilter: (filter) => set({ pembayaranFilter: filter }),
  setSelectedKeberangkatanId: (id) => set({ selectedKeberangkatanId: id }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
