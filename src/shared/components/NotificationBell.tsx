"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useNotifications } from "@/shared/hooks/use-notifications";
import type { NotificationItem, NotificationType } from "@/stores/notification-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari yang lalu`;
}

type DateGroupLabel = "Hari ini" | "Kemarin" | "Minggu ini" | "Sebelumnya";

function getDateGroup(timestamp: string): DateGroupLabel {
  const date = new Date(timestamp);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= todayStart) return "Hari ini";
  if (date >= yesterdayStart) return "Kemarin";
  if (date >= weekAgo) return "Minggu ini";
  return "Sebelumnya";
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<NotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
};

const TYPE_ICON_COLOR: Record<NotificationType, string> = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  info: "text-blue-500",
  error: "text-red-500",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NotificationItemRow({
  item,
  onMarkRead,
  onDismiss,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();

  const Icon = TYPE_ICON[item.type];
  const iconColor = TYPE_ICON_COLOR[item.type];

  const handleClick = useCallback(() => {
    onMarkRead(item.id);
    if (item.link) {
      router.push(item.link);
    }
  }, [item.id, item.link, onMarkRead, router]);

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss(item.id);
    },
    [item.id, onDismiss],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex w-full gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50",
      )}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.message}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          {getRelativeTime(item.timestamp)}
        </p>
      </div>

      {/* Right: unread dot + dismiss */}
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        {!item.read && (
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Belum dibaca" />
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "rounded p-0.5 opacity-0 transition-opacity",
            "hover:bg-muted focus:outline-none focus-visible:opacity-100",
            "group-hover:opacity-100",
          )}
          aria-label="Hapus notifikasi"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Grouped list
// ---------------------------------------------------------------------------

function NotificationGroup({
  label,
  items,
  onMarkRead,
  onDismiss,
}: {
  label: DateGroupLabel;
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </div>
      {items.map((item) => (
        <NotificationItemRow
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
      <BellOff className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  /** Optional class name for the outer container */
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close panel on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close panel on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Derive badge display
  const badgeDisplay = unreadCount > 9 ? "9+" : String(unreadCount);
  const showBadge = unreadCount > 0;

  // Group notifications by date
  const grouped = notifications.reduce<
    Partial<Record<DateGroupLabel, NotificationItem[]>>
  >((acc, n) => {
    const group = getDateGroup(n.timestamp);
    (acc[group] ??= []).push(n);
    return acc;
  }, {});

  const groupOrder: DateGroupLabel[] = [
    "Hari ini",
    "Kemarin",
    "Minggu ini",
    "Sebelumnya",
  ];

  // Shared handler for marking all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isOpen && "bg-muted",
        )}
        aria-label={
          showBadge
            ? `Notifikasi (${unreadCount} belum dibaca)`
            : "Tidak ada notifikasi baru"
        }
      >
        <Bell className="h-5 w-5 text-foreground" />

        {showBadge && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center",
              "h-[18px] rounded-full bg-destructive px-1 text-[10px] font-bold text-white",
            )}
          >
            {badgeDisplay}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden",
            "rounded-xl border bg-card shadow-lg",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Notifikasi
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState />
            ) : (
              groupOrder.map((label) => {
                const items = grouped[label];
                if (!items || items.length === 0) return null;
                return (
                  <NotificationGroup
                    key={label}
                    label={label}
                    items={items}
                    onMarkRead={markAsRead}
                    onDismiss={dismissNotification}
                  />
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin/notifikasi");
                }}
                className="w-full text-center text-xs text-primary hover:underline"
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
