/**
 * lib/supabase.ts
 * OpusHunter — Typed Supabase Client (Native + Web).
 * Caching on globalThis prevents Fast Refresh from creating multiple clients.
 */

import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "../types/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing. Check .env.",
  );
}

/** Uses AsyncStorage for native sessions, default localStorage for web. */
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

/** Retrieves a valid access token, refreshing if expired. */
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
