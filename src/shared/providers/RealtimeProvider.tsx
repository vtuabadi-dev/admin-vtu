"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-client";
import {
  RealtimeEntity,
  RealtimeEventPayload,
  broadcastMutation,
  subscribeRealtimeEvents,
} from "@/shared/lib/realtime-bus";

export type RealtimeStatus = "connected" | "connecting" | "local_active" | "offline";

interface RealtimeContextValue {
  status: RealtimeStatus;
  lastEvent: RealtimeEventPayload | null;
  lastEventTime: number | null;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "local_active",
  lastEvent: null,
  lastEventTime: null,
  reconnect: () => {},
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>("local_active");
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const channelRef = useRef<any>(null);

  // Map PostgreSQL table names to RealtimeEntity
  const mapTableToEntity = (tableName: string): RealtimeEntity => {
    switch (tableName.toLowerCase()) {
      case "jamaah":
        return "jamaah";
      case "registration_groups":
      case "registrationgroup":
      case "registration_requests":
        return "registration_groups";
      case "pembayaran":
      case "alokasi_pembayaran":
        return "pembayaran";
      case "invoices":
      case "invoice":
      case "invoice_items":
        return "invoices";
      case "keberangkatan":
      case "paket_keberangkatan":
        return "keberangkatan";
      case "manifest_rows":
      case "manifest":
        return "manifest";
      case "pengambilan_perlengkapan":
      case "pengambilan_perlengkapan_item":
        return "pengambilan_perlengkapan";
      case "surat_templates":
        return "surat_templates";
      case "generated_surat_logs":
        return "generated_surat_logs";
      case "roomings":
      case "penghuni_kamar":
        return "roomings";
      default:
        return "all";
    }
  };

  const setupSupabaseRealtime = useCallback(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("local_active");
      return;
    }

    try {
      setStatus("connecting");

      // Clean up previous channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel("vtu-operational-cdc-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
          },
          (payload) => {
            const mappedEntity = mapTableToEntity(payload.table);
            const action = (payload.eventType as any) || "UPDATE";
            broadcastMutation(
              mappedEntity,
              action,
              payload.new || payload.old,
              "supabase_cdc"
            );
          }
        )
        .subscribe((subscriptionStatus) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            setStatus("connected");
          } else if (subscriptionStatus === "CHANNEL_ERROR") {
            setStatus("local_active");
          } else if (subscriptionStatus === "TIMED_OUT") {
            setStatus("local_active");
          }
        });

      channelRef.current = channel;
    } catch (e) {
      console.warn("[RealtimeProvider] Could not connect to Supabase Realtime:", e);
      setStatus("local_active");
    }
  }, []);

  useEffect(() => {
    setupSupabaseRealtime();

    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          supabase.removeChannel(channelRef.current);
        }
      }
    };
  }, [setupSupabaseRealtime]);

  // Track any event from local bus or Supabase
  useEffect(() => {
    const unsubscribe = subscribeRealtimeEvents((payload) => {
      setLastEvent(payload);
      setLastEventTime(payload.timestamp);
    });

    return unsubscribe;
  }, []);

  // Listen to Window Focus & Online/Offline
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        broadcastMutation("all", "REFRESH", null, "focus_revalidate");
      }
    }

    function handleOnline() {
      setupSupabaseRealtime();
      broadcastMutation("all", "REFRESH", null, "focus_revalidate");
    }

    function handleOffline() {
      setStatus("offline");
    }

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setupSupabaseRealtime]);

  return (
    <RealtimeContext.Provider
      value={{
        status,
        lastEvent,
        lastEventTime,
        reconnect: setupSupabaseRealtime,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access realtime connection state
 */
export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

/**
 * Reusable hook to listen for realtime events on specific entities.
 * Automatically cleans up on unmount.
 */
export function useRealtimeListener(
  targetEntities: RealtimeEntity | RealtimeEntity[],
  callback: (event: RealtimeEventPayload) => void,
  debounceMs: number = 300
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const targets = Array.isArray(targetEntities) ? targetEntities : [targetEntities];
    const isListeningToAll = targets.includes("all");

    const unsubscribe = subscribeRealtimeEvents((event) => {
      const match =
        isListeningToAll ||
        event.entity === "all" ||
        targets.includes(event.entity);

      if (match) {
        if (debounceMs > 0) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            callbackRef.current(event);
          }, debounceMs);
        } else {
          callbackRef.current(event);
        }
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [targetEntities, debounceMs]);
}
