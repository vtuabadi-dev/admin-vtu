"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BellOff, CheckCircle2, AlertTriangle, Info, XCircle, X,
  Search, CheckCheck, Filter, Clock,
} from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import type { NotificationCategory, NotificationType } from "@/stores/notification-store";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { PermissionGuard } from "@/shared/components/PermissionGuard";

// ── Helpers ──────────────────────────────────────────────────────

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

const CATEGORIES: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pembayaran", label: "Pembayaran" },
  { value: "dokumen", label: "Dokumen" },
  { value: "manifest", label: "Manifest" },
  { value: "rooming", label: "Rooming" },
  { value: "deadline", label: "Deadline" },
  { value: "keberangkatan", label: "Keberangkatan" },
  { value: "sistem", label: "Sistem" },
];

const TYPE_ICON: Record<NotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  error: "text-destructive",
};

// ── Main Page ────────────────────────────────────────────────────

export default function NotifikasiPage() {
  const router = useRouter();
  const { notifications, isLoaded, loadMockNotifications, markAsRead, markAllAsRead, dismissNotification } = useNotificationStore();
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadMockNotifications(); }, [loadMockNotifications]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (categoryFilter !== "all") list = list.filter((n) => n.category === categoryFilter);
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);
    if (readFilter === "unread") list = list.filter((n) => !n.read);
    if (readFilter === "read") list = list.filter((n) => n.read);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, categoryFilter, typeFilter, readFilter, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PermissionGuard module="sistem">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pusat Notifikasi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Semua notifikasi, pengingat, dan peringatan operasional
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai Semua Dibaca ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm"
              placeholder="Cari notifikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  categoryFilter === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground hover:bg-muted border-border"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NotificationType | "all")}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="all">Semua Tipe</option>
              <option value="info">Info</option>
              <option value="success">Berhasil</option>
              <option value="warning">Peringatan</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as "all" | "unread" | "read")}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="unread">Belum Dibaca</option>
              <option value="read">Sudah Dibaca</option>
            </select>
          </div>
        </div>

        {/* Notification List */}
        {!isLoaded ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Memuat notifikasi...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BellOff className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-sm font-semibold">Tidak Ada Notifikasi</h3>
            <p className="text-xs text-muted-foreground">
              {notifications.length === 0 ? "Belum ada notifikasi masuk" : "Tidak ada notifikasi yang cocok dengan filter"}
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {filtered.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                      !item.read && "bg-info/5 dark:bg-info/10"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className={cn("h-5 w-5", TYPE_COLOR[item.type])} />
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        markAsRead(item.id);
                        if (item.link) router.push(item.link);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm", !item.read ? "font-semibold" : "font-medium")}>
                          {item.title}
                        </p>
                        {!item.read && <span className="h-2 w-2 rounded-full bg-info shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/70">{getRelativeTime(item.timestamp)}</span>
                        <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{item.category}</span>
                        {item.link && (
                          <span className="text-[10px] text-primary hover:underline" onClick={(e) => { e.stopPropagation(); markAsRead(item.id); router.push(item.link!); }}>
                            Buka
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissNotification(item.id)}
                      className="shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                      aria-label="Hapus notifikasi"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Menampilkan {filtered.length} dari {notifications.length} notifikasi
        </p>
      </div>
    </PermissionGuard>
  );
}
