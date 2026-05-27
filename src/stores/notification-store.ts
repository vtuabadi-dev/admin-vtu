import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "dokumen"
  | "pembayaran"
  | "manifest"
  | "rooming"
  | "sistem"
  | "deadline"
  | "keberangkatan";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  timestamp: string; // ISO-8601
  category: NotificationCategory;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface NotificationState {
  notifications: NotificationItem[];
  isLoaded: boolean;

  // Actions
  loadMockNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: NotificationItem) => void;
  dismissNotification: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers — relative timestamps for mock data
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}

// ---------------------------------------------------------------------------
// Mock data factory
// ---------------------------------------------------------------------------

function createMockNotifications(): NotificationItem[] {
  return [
    // 1. Dokumen approved – success
    {
      id: "notif-001",
      type: "success",
      title: "Dokumen Terverifikasi",
      message: "Dokumen paspor Ahmad Fauzi telah diverifikasi dan dinyatakan lengkap.",
      link: "/dokumen",
      read: false,
      timestamp: hoursAgo(2),
      category: "dokumen",
    },
    // 2. Dokumen approved – success (yesterday)
    {
      id: "notif-002",
      type: "success",
      title: "Dokumen Terverifikasi",
      message: "Dokumen KTP Siti Rahmah telah diverifikasi dan dinyatakan lengkap.",
      link: "/dokumen",
      read: true,
      timestamp: daysAgo(1),
      category: "dokumen",
    },
    // 3. Pembayaran overdue – warning
    {
      id: "notif-003",
      type: "warning",
      title: "Pembayaran Mendekati Jatuh Tempo",
      message:
        "3 invoice pembayaran paket umrah mendekati jatuh tempo. Segera lakukan tindakan konfirmasi.",
      link: "/pembayaran",
      read: false,
      timestamp: hoursAgo(5),
      category: "pembayaran",
    },
    // 4. Pembayaran overdue – warning (yesterday)
    {
      id: "notif-004",
      type: "warning",
      title: "Pembayaran Overdue",
      message:
        "Pembayaran paket Umrah atas nama Fatimah Az-Zahra telah melewati jatuh tempo.",
      link: "/pembayaran",
      read: false,
      timestamp: daysAgo(1),
      category: "pembayaran",
    },
    // 5. Manifest finalised – success
    {
      id: "notif-005",
      type: "success",
      title: "Manifest Difinalisasi",
      message:
        "Manifest keberangkatan 15 Juni 2026 telah difinalisasi. Total 45 jamaah terdaftar.",
      link: "/manifest",
      read: false,
      timestamp: hoursAgo(8),
      category: "manifest",
    },
    // 6. Deadline warning – warning
    {
      id: "notif-006",
      type: "warning",
      title: "Deadline Dokumen Mendekat",
      message:
        "Deadline pengumpulan dokumen untuk keberangkatan 20 Juni 2026 mendekat. 5 jamaah masih belum lengkap.",
      link: "/dokumen",
      read: false,
      timestamp: hoursAgo(1),
      category: "deadline",
    },
    // 7. Rooming selesai – info
    {
      id: "notif-007",
      type: "info",
      title: "Rooming Hotel Selesai",
      message:
        "Rooming hotel Makkah untuk grup A keberangkatan 15 Juni telah selesai disusun.",
      link: "/rooming",
      read: true,
      timestamp: daysAgo(1),
      category: "rooming",
    },
    // 8. Sistem – info (welcome)
    {
      id: "notif-008",
      type: "info",
      title: "Selamat Datang",
      message:
        "Selamat datang di VTU Operasional. Sistem siap digunakan untuk mengelola operasional perjalanan umrah dan haji.",
      read: false,
      timestamp: hoursAgo(0.5),
      category: "sistem",
    },
    // 9. Paspor akan kadaluarsa – error
    {
      id: "notif-009",
      type: "error",
      title: "Paspor Akan Kadaluarsa",
      message:
        "Paspor Ahmad Fauzi (A1234567) akan kadaluarsa dalam 30 hari. Segera lakukan perpanjangan.",
      link: "/dokumen",
      read: false,
      timestamp: hoursAgo(6),
      category: "dokumen",
    },
    // 10. Pengingat terkirim – info
    {
      id: "notif-010",
      type: "info",
      title: "Pengingat Pembayaran Terkirim",
      message:
        "Pengingat pembayaran telah dikirimkan ke 5 jamaah yang memiliki tagihan belum lunas.",
      link: "/pembayaran",
      read: true,
      timestamp: daysAgo(1.5),
      category: "pembayaran",
    },
  ];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  notifications: [],
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  loadMockNotifications: () => {
    if (get().isLoaded) return; // idempotent
    set({
      notifications: createMockNotifications(),
      isLoaded: true,
    });
  },

  markAsRead: (id: string) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    });
  },

  markAllAsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
  },

  addNotification: (notif: NotificationItem) => {
    set({
      notifications: [notif, ...get().notifications],
    });
  },

  dismissNotification: (id: string) => {
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
    });
  },
}));
