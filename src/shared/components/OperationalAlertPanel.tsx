"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import {
  AlertTriangle,
  Info,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { OperationalAlert } from "@/shared/types";

// ─── Types ───────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info";
type FilterValue = "semua" | Severity;

interface AlertItem {
  id: string;
  severity: Severity;
  icon: React.ElementType;
  message: string;
  count: number;
  link: string;
}

// ─── Severity config ──────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; dotClass: string; bgClass: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical",
    dotClass: "bg-destructive",
    bgClass: "hover:bg-destructive/5",
    icon: ShieldAlert,
  },
  warning: {
    label: "Warning",
    dotClass: "bg-warning",
    bgClass: "hover:bg-warning/5",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    dotClass: "bg-blue-500",
    bgClass: "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
    icon: Info,
  },
};

// ─── Parse operational alerts into compact items ──────────────────────

function parseAlerts(alerts: OperationalAlert[]): AlertItem[] {
  return alerts.map((a) => {
    let severity: Severity = "warning";
    if (a.tipe === "danger") severity = "critical";
    else if (a.tipe === "info") severity = "info";

    // Strip prefix so message fits compactly
    const shortMsg =
      a.pesan.length > 80 ? a.pesan.slice(0, 77) + "..." : a.pesan;

    return {
      id: a.id,
      severity,
      icon: SEVERITY_CONFIG[severity].icon,
      message: shortMsg,
      count: a.jumlahTerdampak,
      link: a.link,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────

interface OperationalAlertPanelProps {
  alerts: OperationalAlert[];
  className?: string;
}

export function OperationalAlertPanel({
  alerts,
  className,
}: OperationalAlertPanelProps) {
  const [filter, setFilter] = useState<FilterValue>("semua");

  const items = useMemo(() => parseAlerts(alerts), [alerts]);

  // Counts per severity
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;
  const infoCount = items.filter((i) => i.severity === "info").length;

  // Grouped by severity (sorted: critical → warning → info)
  const grouped = useMemo(() => {
    const map: Record<Severity, AlertItem[]> = {
      critical: [],
      warning: [],
      info: [],
    };
    items.forEach((item) => {
      if (filter === "semua" || filter === item.severity) {
        map[item.severity].push(item);
      }
    });
    return map;
  }, [items, filter]);

  const noResults =
    grouped.critical.length === 0 &&
    grouped.warning.length === 0 &&
    grouped.info.length === 0;

  const FILTERS: { value: FilterValue; label: string; count: number }[] = [
    { value: "semua", label: "Semua", count: items.length },
    { value: "critical", label: "Critical", count: criticalCount },
    { value: "warning", label: "Warning", count: warningCount },
    { value: "info", label: "Info", count: infoCount },
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Alert Operasional</h3>
        </div>

        {/* Summary counts */}
        <div className="mt-2 flex gap-3">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Critical: {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Warning: {warningCount}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Info: {infoCount}
          </span>
        </div>

        {/* Filter pills */}
        <div className="mt-2.5 flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
              <span className="opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable alert list ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3">
        {noResults ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Info className="h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">
              Tidak ada alert
            </p>
          </div>
        ) : (
          (["critical", "warning", "info"] as Severity[]).map((severity) => {
            const group = grouped[severity];
            if (group.length === 0) return null;

            const cfg = SEVERITY_CONFIG[severity];
            const GroupIcon = cfg.icon;

            return (
              <div key={severity} className="space-y-1.5">
                {/* Group label */}
                <div className="flex items-center gap-1.5 px-1">
                  <span className={cn("h-2 w-2 rounded-full", cfg.dotClass)} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    ({group.length})
                  </span>
                </div>

                {/* Alert items */}
                {group.map((item) => (
                  <Link key={item.id} href={item.link}>
                    <div
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors cursor-pointer",
                        cfg.bgClass,
                      )}
                    >
                      <GroupIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          severity === "critical"
                            ? "text-destructive"
                            : severity === "warning"
                              ? "text-warning"
                              : "text-blue-500",
                        )}
                      />
                      <p className="text-xs leading-snug flex-1 min-w-0 line-clamp-2">
                        {item.message}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          severity === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : severity === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                        )}
                      >
                        {item.count}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
