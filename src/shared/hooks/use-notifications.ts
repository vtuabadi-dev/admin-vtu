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
  const loadMockNotifications = useNotificationStore(
    (s) => s.loadMockNotifications,
  );
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const dismissNotification = useNotificationStore(
    (s) => s.dismissNotification,
  );

  // Auto-load mock notifications on first access
  useEffect(() => {
    if (!isLoaded) {
      loadMockNotifications();
    }
  }, [isLoaded, loadMockNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading: !isLoaded,
    loadNotifications: loadMockNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    dismissNotification,
  };
}
