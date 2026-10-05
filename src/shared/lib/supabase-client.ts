"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null = null;

/**
 * Returns a singleton browser Supabase Client configured for Realtime CDC.
 * Returns null if Supabase environment variables are not configured.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (process.env.NEXT_PUBLIC_APP_URL?.includes("supabase") ? process.env.NEXT_PUBLIC_APP_URL : undefined);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseBrowserClient;
  } catch (err) {
    console.warn("[Realtime] Failed to initialize Supabase client:", err);
    return null;
  }
}
