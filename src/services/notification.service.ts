import type { NotificationItem } from "@/stores/notification-store";
import type { NotificationFilters, NotificationCategorySummary } from "./contracts";

export function filterNotifications(
  notifications: NotificationItem[],
  filters: NotificationFilters
): NotificationItem[] {
  let list = notifications;

  if (filters.category && filters.category !== "all") {
    list = list.filter((n) => n.category === filters.category);
  }
  if (filters.type && filters.type !== "all") {
    list = list.filter((n) => n.type === filters.type);
  }
  if (filters.readStatus === "unread") {
    list = list.filter((n) => !n.read);
  }
  if (filters.readStatus === "read") {
    list = list.filter((n) => n.read);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
    );
  }

  return list;
}

export function categorizeNotifications(
  notifications: NotificationItem[]
): NotificationCategorySummary[] {
  const map = new Map<string, { count: number; unreadCount: number }>();

  for (const n of notifications) {
    const entry = map.get(n.category) ?? { count: 0, unreadCount: 0 };
    entry.count++;
    if (!n.read) entry.unreadCount++;
    map.set(n.category, entry);
  }

  return Array.from(map.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));
}

export function getUnreadCount(notifications: NotificationItem[]): number {
  return notifications.filter((n) => !n.read).length;
}
