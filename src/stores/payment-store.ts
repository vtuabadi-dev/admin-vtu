import { create } from "zustand";

export type PaymentFilter = "semua" | "draft" | "dp" | "cicilan" | "hampir_lunas" | "lunas" | "overdue";

interface PaymentState {
  filter: PaymentFilter;
  selectedInvoiceId: string | null;
  showPaymentModal: boolean;
  setFilter: (filter: PaymentFilter) => void;
  setSelectedInvoiceId: (id: string | null) => void;
  setShowPaymentModal: (show: boolean) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  filter: "semua",
  selectedInvoiceId: null,
  showPaymentModal: false,
  setFilter: (filter) => set({ filter }),
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),
  setShowPaymentModal: (show) => set({ showPaymentModal: show }),
}));
