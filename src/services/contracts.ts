import type {
  Manifest,
  Invoice,
  GroupPaymentSummary,
} from "@/shared/types";

// ── Manifest ──────────────────────────────────────────────────────

export interface ManifestStats {
  total: number;
  draft: number;
  final: number;
  totalJamaah: number;
}

export interface EnrichedManifest extends Manifest {
  packageCode: string;
  packageName: string;
}

// ── Payment ───────────────────────────────────────────────────────

export interface PaymentStats {
  totalTagihan: number;
  totalPembayaran: number;
  totalSisa: number;
  overdueCount: number;
  lunasCount: number;
  groupCount: number;
}

export interface EnrichedPaymentSummary extends GroupPaymentSummary {
  packageName: string;
  packageCode: string;
}

// ── Invoice / Overdue ─────────────────────────────────────────────

export interface OverdueInvoice {
  invoice: Invoice;
  groupName: string;
  groupCode: string;
  daysOverdue: number;
}

export interface OverdueStats {
  count: number;
  totalAmount: number;
  affectedGroups: number;
}

// ── Rooming ───────────────────────────────────────────────────────

export interface RoomOccupancy {
  roomingId: string;
  hotelName: string;
  totalKamar: number;
  totalKapasitas: number;
  totalTerisi: number;
  occupancyRate: number;
}

export interface RoomStatsByHotel {
  hotelMekkah: string;
  hotelMadinah: string;
  jamaahCount: number;
  maleCount: number;
  femaleCount: number;
  roomCount: number;
}

// ── Notification ──────────────────────────────────────────────────

export interface NotificationFilters {
  category?: string;
  type?: string;
  readStatus?: "all" | "unread" | "read";
  search?: string;
}

export interface NotificationCategorySummary {
  category: string;
  count: number;
  unreadCount: number;
}

// ── Reminder ──────────────────────────────────────────────────────

export interface ReminderStats {
  total: number;
  sent: number;
  read: number;
  responded: number;
}

// ── Document ──────────────────────────────────────────────────────

export interface DocumentStats {
  total: number;
  lengkap: number;
  belum: number;
  completionRate: number;
}

export interface DocumentFilterParams {
  packageId?: string;
  status?: string;
  search?: string;
}

// ── Export ────────────────────────────────────────────────────────

export interface ExportColumn {
  key: string;
  header: string;
}

export interface ExportConfig {
  format: "csv" | "excel" | "pdf";
  columns: ExportColumn[];
  fileName: string;
}

export interface ExportResult {
  fileName: string;
  content: string;
  mimeType: string;
}
