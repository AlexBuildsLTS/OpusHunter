/**
 * supabase/functions/_shared/keyResolver.ts
 * OpusHunter — BYOK Key Resolution (shared by scrape-jobs, generate-cover-letter, auto-apply)
 *
 * BEFORE this file existed: profile.gemini_key and profile.rapidapi_key were
 * saved by the client (profile.tsx) but READ NOWHERE. Every edge function
 * only checked an env secret, then the shared api_keys admin pool. A user
 * adding their own key had zero effect on anything — the UI was a no-op.
 *
 * Priority order (matches what profile.tsx's copy promises the user):
 *   1. The calling user's own key on `profiles.gemini_key` / `.rapidapi_key`
 *      (BYOK — unlimited, no shared rate limit)
 *   2. The admin-managed `api_keys` pool (provider = 'gemini' | 'rapidapi',
 *      is_active = true) — rotated by oldest `last_used` first
 *   3. The Supabase Edge Function secret (Deno.env — set via
 *      `supabase secrets set` or Dashboard → Edge Functions → Secrets).
 *      NOTE: this is NOT the same thing as a Vercel env var, a `.env` file,
 *      or an EAS secret — those never reach the Deno runtime. If every tier
 *      is failing, this is almost always why: the key was set somewhere
 *      the edge function can't see it.
 *
 * Every returned key comes with `source` so callers can log / return which
 * tier actually served the request — useful for debugging "why didn't my
 * key get used" without digging through function logs.
 */

const MIN_KEY_LENGTH = 10;

export type KeyProvider = 'gemini' | 'rapidapi';
export type KeySource = 'byok' | 'pool' | 'env';

export interface ResolvedKey {
    readonly key: string;
    readonly source: KeySource;
    /** Only present for source: 'pool' — needed to bump last_used after use. */
    readonly poolRowId?: string;
}

const ENV_VAR: Readonly<Record<KeyProvider, string>> = {
    gemini: 'GEMINI_API_KEY',
    rapidapi: 'RAPIDAPI_KEY',
} as const;

const PROFILE_COLUMN: Readonly<Record<KeyProvider, string>> = {
    gemini: 'gemini_key',
    rapidapi: 'rapidapi_key',
} as const;

/**
 * Resolves ALL usable keys for a provider, in priority order, for rotation
 * (used by scrape-jobs which retries across multiple RapidAPI keys on 429).
 * Index 0 is always tried first.
 */
export async function resolveKeyPool(
    supabase: any,
    userId: string,
    provider: KeyProvider,
): Promise<ResolvedKey[]> {
    const keys: ResolvedKey[] = [];

    // ── Tier 1: BYOK — the calling user's own key ────────────────────────────
    const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMN[provider])
        .eq('id', userId)
        .maybeSingle();

    const byok = profile?.[PROFILE_COLUMN[provider]];
    if (byok && typeof byok === 'string' && byok.trim().length > 10) {
        keys.push({ key: byok.trim(), source: 'byok' });
    }

    // ── Tier 2: admin-managed pool ───────────────────────────────────────────
    const { data: poolRows } = await supabase
        .from('api_keys')
        .select('id, api_key')
        .eq('provider', provider)
        .eq('is_active', true)
        .order('last_used', { ascending: true, nullsFirst: true })
        .limit(6);

    for (const row of poolRows ?? []) {
        if (row.api_key) keys.push({ key: row.api_key, source: 'pool', poolRowId: row.id });
    }

    // ── Tier 3: env secret ────────────────────────────────────────────────────
    const envKey = Deno.env.get(ENV_VAR[provider]);
    if (envKey && envKey.trim().length > 10) {
        keys.push({ key: envKey.trim(), source: 'env' });
    }

    return keys;
}

/** Convenience wrapper when the caller just needs the single best key. */
export async function resolveKey(
    supabase: any,
    userId: string,
    provider: KeyProvider,
): Promise<ResolvedKey | null> {
    const pool = await resolveKeyPool(supabase, userId, provider);
    return pool[0] ?? null;
}

/** Call after successfully using a pool-sourced key, to rotate fairly. */
export async function markKeyUsed(supabase: any, resolved: ResolvedKey): Promise<void> {
    if (resolved.source === 'pool' && resolved.poolRowId) {
        await supabase
            .from('api_keys')
            .update({ last_used: new Date().toISOString() })
            .eq('id', resolved.poolRowId);
    }
}

declare const Deno: { env: { get: (k: string) => string | undefined } };