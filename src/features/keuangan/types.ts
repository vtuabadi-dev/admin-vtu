export type DepartureStatus = 'Direncanakan' | 'Aktif' | 'Berangkat' | 'Selesai' | 'Batal';

export type ExpenseCategory = string;

export type PaymentStatus = 'Lunas' | 'DP / Partial' | 'Belum Dibayar';

export interface DepartureGroup {
  id: string;
  code: string; // e.g. UMR-2026-SEP-01
  name: string; // e.g. "Grup Reguler September 2026"
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  totalQuota: number; // e.g. 45 seats
  filledQuota: number; // e.g. 38 seats
  targetBudget: number; // in IDR
  status: DepartureStatus;
  packageType: string; // e.g. "Bintang 5 - 9 Hari", "VIP Ramadan"
  notes?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  title: string; // e.g., "Pelunasan Hotel Anjum Makkah"
  groupId?: string; // linked departure group ID (optional, undefined = General Operational)
  groupName?: string;
  category: ExpenseCategory;
  vendorName: string; // e.g., "Anjum Hotel Makkah"
  amount: number; // nominal in IDR
  amountSar?: number; // optional reference in Saudi Riyal
  paymentStatus: PaymentStatus;
  paymentDeadline?: string; // YYYY-MM-DD
  paidAmount?: number; // amount already paid if partial
  transactionDate: string; // YYYY-MM-DD
  invoiceNumber?: string;
  invoiceImage?: string; // Base64 or Data URL
  invoiceFileName?: string;
  transferProofImage?: string; // Base64 or Data URL for Bukti Transfer / Bukti Bayar
  transferProofFileName?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DeadlineNotification {
  expenseId: string;
  title: string;
  vendorName: string;
  groupName: string;
  amount: number;
  remainingAmount: number;
  deadline: string;
  daysRemaining: number;
  status: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';
}

export interface ExpenseFilterState {
  searchQuery: string;
  groupId: string; // 'ALL' or specific ID
  category: string; // 'ALL' or specific
  paymentStatus: string; // 'ALL' or specific
  deadlineFilter: 'ALL' | 'OVERDUE' | 'DUE_7_DAYS' | 'UNPAID';
  startDate: string;
  endDate: string;
}
