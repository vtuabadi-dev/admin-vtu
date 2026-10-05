"use client";

export type RealtimeEntity =
  | "registration_groups"
  | "jamaah"
  | "pembayaran"
  | "invoices"
  | "keberangkatan"
  | "manifest_rows"
  | "manifest"
  | "pengambilan_perlengkapan"
  | "surat_templates"
  | "generated_surat_logs"
  | "roomings"
  | "all";

export interface RealtimeEventPayload {
  entity: RealtimeEntity;
  action: "INSERT" | "UPDATE" | "DELETE" | "REFRESH";
  source: "supabase_cdc" | "cross_tab" | "local_mutation" | "focus_revalidate";
  data?: any;
  timestamp: number;
}

type RealtimeListener = (event: RealtimeEventPayload) => void;

const listeners = new Set<RealtimeListener>();
let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel if in browser environment
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("vtu_realtime_bus");
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.entity) {
        notifyListeners(event.data);
      }
    };
  } catch (e) {
    console.warn("[RealtimeBus] BroadcastChannel not supported or blocked:", e);
  }
}

function notifyListeners(payload: RealtimeEventPayload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error("[RealtimeBus] Error in listener:", err);
    }
  });

  // Also dispatch DOM CustomEvent for non-React elements if needed
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vtu:realtime-event", {
        detail: payload,
      })
    );
  }
}

/**
 * Broadcasts a mutation event to the current window and all other open tabs/windows
 */
export function broadcastMutation(
  entity: RealtimeEntity,
  action: "INSERT" | "UPDATE" | "DELETE" | "REFRESH" = "UPDATE",
  data?: any,
  source: "supabase_cdc" | "cross_tab" | "local_mutation" | "focus_revalidate" = "local_mutation"
) {
  const payload: RealtimeEventPayload = {
    entity,
    action,
    source,
    data,
    timestamp: Date.now(),
  };

  // 1. Notify current window listeners
  notifyListeners(payload);

  // 2. Broadcast to other tabs/windows
  if (broadcastChannel && source === "local_mutation") {
    try {
      broadcastChannel.postMessage({
        ...payload,
        source: "cross_tab",
      });
    } catch (e) {
      console.warn("[RealtimeBus] Failed to post to BroadcastChannel:", e);
    }
  }
}

/**
 * Subscribes to realtime events across all sources (Supabase CDC, cross-tab, local)
 */
export function subscribeRealtimeEvents(listener: RealtimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
