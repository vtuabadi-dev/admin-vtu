"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import type { NotificationItem } from "@/stores/notification-store";

export interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  loadNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: NotificationItem) => void;
  dismissNotification: (id: string) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const notifications = useNotificationStore((s) => s.notifications);
  const isLoaded = useNotificationStore((s) => s.isLoaded);
  const fetchNotifications = useNotificationStore(
    (s) => s.fetchNotifications,
  );
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const dismissNotification = useNotificationStore(
    (s) => s.dismissNotification,
  );

  // Auto-load notifications on first access
  useEffect(() => {
    if (!isLoaded) {
      fetchNotifications();
    }
  }, [isLoaded, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading: !isLoaded,
    loadNotifications: fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    dismissNotification,
  };
}
