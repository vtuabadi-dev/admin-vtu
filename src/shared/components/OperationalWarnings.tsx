"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";

interface Diagnostic {
  label: string;
  status: "ok" | "warning" | "critical";
  count: number;
  detail?: string;
}

export function OperationalWarnings() {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/system-health");
        if (res.ok) {
          const json = await res.json();
          setDiagnostics(json.data?.operational ?? json.operational ?? []);
        }
      } catch { /* non-critical */ }
    }
    load();
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeWarnings = diagnostics.filter(
    (d) => d.status !== "ok" && !dismissed.has(d.label)
  );

  if (activeWarnings.length === 0) return null;

  const criticalCount = activeWarnings.filter((d) => d.status === "critical").length;
  const warningCount = activeWarnings.filter((d) => d.status === "warning").length;

  return (
    <div className="rounded-lg border border-warning/20 bg-warning/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">
            {criticalCount > 0 && `${criticalCount} kritis, `}
            {warningCount} peringatan operasional
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {expanded ? "Sembunyikan" : "Lihat detail"}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-warning/10 px-4 py-2 space-y-1.5">
          {activeWarnings.map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 rounded-full shrink-0 ${d.status === "critical" ? "bg-destructive" : "bg-warning"}`} />
                <span className="text-xs truncate">{d.detail ?? d.label}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">({d.count})</span>
              </div>
              <button
                onClick={() => setDismissed((prev) => { const next = new Set(prev); next.add(d.label); return next; })}
                className="ml-2 shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
                title="Abaikan"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
