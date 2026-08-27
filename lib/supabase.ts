import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "../types/database.types";

/**
 * lib/supabase.ts
 *
 * FIXED (2026-08-23): plain `export const supabase = createClient(...)` gets
 * re-evaluated on every Fast Refresh of this module during dev (any edit to
 * this file, or sometimes a parent that imports it, re-runs the module top
 * level without a full page reload). Each re-run created a brand new
 * GoTrueClient pointed at the same localStorage/AsyncStorage key — hence
 * "Multiple GoTrueClient instances detected in the same browser context" in
 * the console. Two live instances racing to read/write the same session key
 * can produce exactly the kind of stuck/inconsistent session resolution seen
 * in app/_layout.tsx's redirect logic. Caching the instance on `globalThis`
 * survives Fast Refresh (module state doesn't, globalThis does), so re-runs
 * of this module reuse the existing client instead of minting a new one.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing. Check .env.",
  );
}

const storageAdapter =
  Platform.OS !== "web"
    ? {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) =>
          AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      }
    : undefined;

declare global {
  // eslint-disable-next-line no-var
  var __opushunter_supabase__: SupabaseClient<Database> | undefined;
}

function createSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  });
}

export const supabase: SupabaseClient<Database> =
  globalThis.__opushunter_supabase__ ??
  (globalThis.__opushunter_supabase__ = createSupabaseClient());

export async function getSupabaseAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;

  if (session?.access_token) return session.access_token;

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  return refreshedSession?.access_token ?? null;
}
