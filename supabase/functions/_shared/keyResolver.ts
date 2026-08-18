/**
 * supabase/functions/_shared/keyResolver.ts
 * OpusHunter — BYOK Key Resolution & Rotation
 */

import type { SupabaseClient } from "supabase";

export type KeyProvider = "gemini" | "rapidapi";
export type KeySource = "byok" | "pool" | "env";

export interface ResolvedKey {
  readonly key: string;
  readonly source: KeySource;
  /** Only present for source: 'pool' — needed to bump last_used after use. */
  readonly poolRowId?: string;
}

const ENV_VAR: Readonly<Record<KeyProvider, string>> = {
  gemini: "GEMINI_API_KEY",
  rapidapi: "RAPIDAPI_KEY",
} as const;

const PROFILE_COLUMN: Readonly<Record<KeyProvider, string>> = {
  gemini: "gemini_key",
  rapidapi: "rapidapi_key",
} as const;

/**
 * Resolves ALL usable keys for a provider, in priority order, for rotation.
 * Index 0 is always tried first.
 */
export async function resolveKeyPool(
  supabase: SupabaseClient,
  userId: string,
  provider: KeyProvider,
): Promise<ResolvedKey[]> {
  const keys: ResolvedKey[] = [];
  const column = PROFILE_COLUMN[provider];

  // ── Tier 1: BYOK — the calling user's own key ────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select(column)
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    // Safely cast to bypass strict TS index signature rules (Error 7015 Fix)
    const byok = (profile as unknown as Record<string, unknown>)[column];
    if (typeof byok === "string" && byok.trim().length > 10) {
      keys.push({ key: byok.trim(), source: "byok" });
    }
  }

  // ── Tier 2: admin-managed pool ───────────────────────────────────────────
  const { data: poolRows } = await supabase
    .from("api_keys")
    .select("id, api_key")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("last_used", { ascending: true, nullsFirst: true })
    .limit(6);

  for (const row of poolRows ?? []) {
    if (row.api_key) {
      keys.push({ key: row.api_key, source: "pool", poolRowId: row.id });
    }
  }

  // ── Tier 3: env secret ────────────────────────────────────────────────────
  const envKey = Deno.env.get(ENV_VAR[provider]);
  if (envKey && envKey.trim().length > 10) {
    keys.push({ key: envKey.trim(), source: "env" });
  }

  return keys;
}

/** Convenience wrapper when the caller just needs the single best key. */
export async function resolveKey(
  supabase: SupabaseClient,
  userId: string,
  provider: KeyProvider,
): Promise<ResolvedKey | null> {
  const pool = await resolveKeyPool(supabase, userId, provider);
  return pool[0] ?? null;
}

/** Call after successfully using a pool-sourced key, to rotate fairly. */
export async function markKeyUsed(
  supabase: SupabaseClient,
  resolved: ResolvedKey,
): Promise<void> {
  if (resolved.source === "pool" && resolved.poolRowId) {
    await supabase
      .from("api_keys")
      .update({ last_used: new Date().toISOString() })
      .eq("id", resolved.poolRowId);
  }
}
