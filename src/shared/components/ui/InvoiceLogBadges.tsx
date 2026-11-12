"use client";

import React from "react";
import { FileEdit } from "lucide-react";
import { getEventKindDisplay } from "@/shared/lib/invoice-audit-log";
import { formatCurrency } from "@/shared/lib/utils";
import type { InvoiceAuditLogEntry } from "@/shared/types";

export function InvoiceLogActionBadge({
  log,
  compact = false,
}: {
  log: Pick<InvoiceAuditLogEntry, "eventKind" | "title">;
  compact?: boolean;
}) {
  const display = getEventKindDisplay(log.eventKind);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-bold whitespace-nowrap ${
        compact ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-0.5 text-[10px]"
      } ${display.badgeClass}`}
    >
      <FileEdit className={compact ? "w-2.5 h-2.5 shrink-0" : "w-3 h-3 shrink-0"} />
      <span>{log.title || display.label}</span>
    </span>
  );
}

export function InvoiceLogMetaDetails({
  log,
  maxDiffs = 3,
}: {
  log: InvoiceAuditLogEntry;
  maxDiffs?: number;
}) {
  const hasTotals =
    typeof log.totalBefore === "number" &&
    typeof log.totalAfter === "number" &&
    log.totalBefore !== log.totalAfter;

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-foreground/90 leading-snug">{log.summary}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {hasTotals && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-semibold text-foreground">
            Tagihan: {formatCurrency(log.totalBefore!)} &rarr; {formatCurrency(log.totalAfter!)}
          </span>
        )}
        {typeof log.deltaTotal === "number" && log.deltaTotal !== 0 && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              log.deltaTotal > 0
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {log.deltaTotal > 0 ? "+" : "-"}
            {formatCurrency(Math.abs(log.deltaTotal))}
          </span>
        )}
        {log.manifestImpact?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[9.5px] font-semibold"
          >
            {tag}
          </span>
        ))}
        {log.actorName && (
          <span className="text-[10px] text-muted-foreground">
            Oleh: <span className="font-semibold text-foreground/80">{log.actorName}</span>
          </span>
        )}
      </div>
      {log.itemsDiff && log.itemsDiff.length > 0 && (
        <ul className="space-y-0.5 pt-0.5">
          {log.itemsDiff.slice(0, maxDiffs).map((d, idx) => (
            <li
              key={`${d.deskripsi}-${idx}`}
              className="text-[10px] text-muted-foreground flex items-center gap-1.5"
            >
              <span
                className={`font-mono font-bold ${
                  d.type === "added"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : d.type === "updated"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {d.type === "added"
                  ? "[+]"
                  : d.type === "updated"
                    ? "[~]"
                    : d.type === "cancelled"
                      ? "[BATAL]"
                      : "[-]"}
              </span>
              <span className="truncate">{d.deskripsi}</span>
              {d.deltaJumlah !== 0 && (
                <span className="font-mono font-semibold text-foreground shrink-0">
                  ({d.deltaJumlah > 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(d.deltaJumlah))})
                </span>
              )}
            </li>
          ))}
          {log.itemsDiff.length > maxDiffs && (
            <li className="text-[10px] text-muted-foreground italic">
              +{log.itemsDiff.length - maxDiffs} perubahan item lainnya...
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

