"use client";

import React, { useState } from "react";
import { useRealtimeContext } from "@/shared/providers/RealtimeProvider";
import { broadcastMutation } from "@/shared/lib/realtime-bus";
import { RefreshCw } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function RealtimeStatusBadge() {
  const { status, lastEventTime, reconnect } = useRealtimeContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualSync = () => {
    setIsRefreshing(true);
    broadcastMutation("all", "REFRESH", null, "focus_revalidate");
    reconnect();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getStatusText = () => {
    if (status === "connected") return "Live Realtime (CDC)";
    if (status === "connecting") return "Menghubungkan...";
    if (status === "offline") return "Offline";
    return "Live Sync Aktif";
  };

  const getTimeAgo = () => {
    if (!lastEventTime) return "Siap";
    const sec = Math.floor((Date.now() - lastEventTime) / 1000);
    if (sec < 5) return "Baru saja";
    if (sec < 60) return `${sec}d lalu`;
    return `${Math.floor(sec / 60)}m lalu`;
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleManualSync}
        title={`Status: ${getStatusText()} • Terakhir update: ${getTimeAgo()} • Klik untuk sinkronkan`}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all border",
          status === "connected"
            ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60"
            : status === "offline"
            ? "bg-rose-950/50 text-rose-300 border-rose-500/40"
            : "bg-teal-950/50 text-teal-300 border-teal-500/40 hover:bg-teal-900/60"
        )}
      >
        <span className="relative flex h-2 w-2">
          {status !== "offline" && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                status === "connected" ? "bg-emerald-400" : "bg-teal-400"
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              status === "connected"
                ? "bg-emerald-500"
                : status === "offline"
                ? "bg-rose-500"
                : "bg-teal-500"
            )}
          />
        </span>

        <span className="hidden sm:inline font-mono tracking-tight text-[10px]">
          {status === "connected" ? "REALTIME" : "SYNC"}
        </span>

        <RefreshCw
          className={cn(
            "h-2.5 w-2.5 text-muted-foreground transition-transform opacity-70",
            isRefreshing && "animate-spin"
          )}
        />
      </button>
    </div>
  );
}
