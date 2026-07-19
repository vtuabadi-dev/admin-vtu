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
  fetchNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: NotificationItem) => void;
  dismissNotification: (id: string) => void;
}

// EEOS Mandate: Mock data factory removed

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  notifications: [],
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  fetchNotifications: () => {
    if (get().isLoaded) return;
    
    // Todo: fetch from real notification service API
    set({
      notifications: [],
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
