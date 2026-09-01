/**
 * supabase/functions/_shared/keyResolver.ts
 * OpusHunter — Triple-Tier API Key Resolver with Automatic Key Rotation & Fallback.
 * Tier 1: User BYOK (user_api_keys).
 * Tier 2: System Key Pool (system_api_keys) sorted by priority with automatic 429 rotation.
 *         >>> This is where "add a fallback key in the admin panel" should write to. <<<
 *         Use admin_add_api_key() (already exists in your DB) instead of a new env var —
 *         it gets priority ordering, throttling, and admin-panel visibility for free.
 * Tier 4: Environment variables, last resort, supports numbered suffixes for multiple keys
 *         per provider (GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2, ... GEMINI_API_KEY20).
 * Supports optional AES-256-GCM decryption with plaintext fallback.
 *
 * CHANGED FROM PREVIOUS VERSION:
 *   - Tier 3 (env) now scans numbered suffixes 1-20 per base name, not just the bare name.
 *   - Env-sourced keys can now be throttled (in-memory, per function instance) after a 429 —
 *     previously handle429() explicitly skipped anything with a keyId starting "env-", so a
 *     maxed-out env key was retried on every single request forever.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// Helper for AES-256-GCM decryption with plaintext fallback
async function decryptKeyIfNeeded(rawKey: string): Promise<string> {
  const secret = Deno.env.get("KEY_ENCRYPTION_SECRET");
  if (!secret) return rawKey; // Fallback to raw plaintext if no secret set

  try {
    const combined = new Uint8Array(
      atob(rawKey)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );
    if (combined.length < 13) return rawKey; // Not encrypted string

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch (_err) {
    // If decryption fails, assume it was stored as unencrypted plain text
    return rawKey;
  }
}

export interface ResolvedKey {
  key: string;
  keyId: string;
  source: "user" | "system" | "env";
  provider: string;
  extra?: Record<string, string>;
}

// ── In-memory throttle map for env-sourced keys ────────────────────────────
// Env vars have no DB row to write throttled_until to, so we keep a per-instance
// (per cold-start) map instead. Resets on redeploy/cold-start — acceptable for a
// last-resort tier that should rarely be hit if Tier 2 (system_api_keys) is kept
// stocked with active keys via the admin panel.
const envKeyThrottleMap = new Map<string, number>(); // envKeyId -> unix ms until unthrottled

function isEnvKeyThrottled(envKeyId: string): boolean {
  const until = envKeyThrottleMap.get(envKeyId);
  return typeof until === "number" && until > Date.now();
}

/**
 * Marks an env-sourced key as throttled for cooldownMs. Called from handle429()
 * below when the resolved key's source is "env".
 */
function throttleEnvKey(envKeyId: string, cooldownMs: number) {
  envKeyThrottleMap.set(envKeyId, Date.now() + cooldownMs);
}

/**
 * Resolves all candidate keys for a provider in priority order.
 * Returning an array enables calling functions to rotate keys seamlessly if one returns 429/401/error.
 */
export async function getCandidateKeys(
  adminClient: SupabaseClient,
  userId: string,
  provider: string,
): Promise<ResolvedKey[]> {
  const candidates: ResolvedKey[] = [];
  const normalizedProvider = provider.toLowerCase();

  // ── Tier 1: User BYOK ─────────────────────────────────────────────────
  if (userId) {
    try {
      const { data: userKeys } = await adminClient
        .from("user_api_keys")
        .select("id, encrypted_key, provider")
        .eq("user_id", userId)
        .eq("provider", normalizedProvider)
        .eq("is_active", true);

      if (userKeys && userKeys.length > 0) {
        for (const k of userKeys) {
          if (k.encrypted_key) {
            const keyVal = await decryptKeyIfNeeded(k.encrypted_key);
            candidates.push({
              key: keyVal,
              keyId: k.id,
              source: "user",
              provider: k.provider,
            });
          }
        }
      }
    } catch (e) {
      console.warn(`User key lookup failed for ${provider}:`, e);
    }
  }

  // ── Tier 2: System Pool (Active & Unthrottled) ─────────────────────────
  // This is the tier your admin-panel "add fallback key" action should write to,
  // via the existing admin_add_api_key() RPC. Multiple rows here = multiple keys,
  // ordered by priority_order, each independently throttleable via throttled_until.
  // This already gives you the "add another key, system uses it seamlessly when
  // one is maxed out" behavior you described — no numbering convention needed here,
  // it's just another row.
  try {
    const { data: systemKeys } = await adminClient
      .from("system_api_keys")
      .select("id, encrypted_key, throttled_until")
      .eq("provider", normalizedProvider)
      .eq("is_active", true)
      .or(
        `throttled_until.is.null,throttled_until.lt.${new Date().toISOString()}`,
      )
      .order("priority_order", { ascending: true });

    if (systemKeys && systemKeys.length > 0) {
      for (const sk of systemKeys) {
        if (sk.encrypted_key) {
          const keyVal = await decryptKeyIfNeeded(sk.encrypted_key);
          candidates.push({
            key: keyVal,
            keyId: sk.id,
            source: "system",
            provider: normalizedProvider,
          });
        }
      }
    }
  } catch (e) {
    console.warn(`System key pool lookup failed for ${provider}:`, e);
  }

  // ── Tier 3: Environment Variable Fallbacks (numbered-suffix aware) ─────
  // Checks BASE_NAME, then BASE_NAME1 through BASE_NAME20. This is the tier that
  // makes GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2 ... all get picked up.
  const baseNames = [
    `${normalizedProvider.toUpperCase()}_API_KEY`,
    `${normalizedProvider.toUpperCase()}_KEY`,
  ];

  if (normalizedProvider === "gemini") {
    baseNames.push("GEMINI_API_KEY", "GOOGLE_API_KEY");
  } else if (normalizedProvider === "rapidapi") {
    baseNames.push("RAPIDAPI_KEY", "RAPID_API_KEY", "JSEARCH_API_KEY");
  } else if (normalizedProvider === "adzuna") {
    baseNames.push("ADZUNA_KEY", "ADZUNA_API_KEY");
  } else if (normalizedProvider === "geodb") {
    baseNames.push("GEODB_API_KEY", "GEODB_KEY", "RAPIDAPI_KEY");
  }

  // De-dupe base names (some providers list the same name twice above by design of
  // the original code — harmless, but no reason to scan it twice).
  const uniqueBaseNames = Array.from(new Set(baseNames));

  const MAX_NUMBERED_SUFFIX = 20;

  for (const base of uniqueBaseNames) {
    // Unsuffixed base name first (GEMINI_API_KEY)
    const unsuffixedId = `env-${base}`;
    const unsuffixedVal = Deno.env.get(base);
    if (
      unsuffixedVal &&
      !isEnvKeyThrottled(unsuffixedId) &&
      !candidates.some((c) => c.key === unsuffixedVal)
    ) {
      candidates.push({
        key: unsuffixedVal,
        keyId: unsuffixedId,
        source: "env",
        provider: normalizedProvider,
      });
    }

    // Numbered suffixes (GEMINI_API_KEY1, GEMINI_API_KEY2, ...)
    for (let i = 1; i <= MAX_NUMBERED_SUFFIX; i++) {
      const suffixedName = `${base}${i}`;
      const suffixedId = `env-${suffixedName}`;
      const suffixedVal = Deno.env.get(suffixedName);
      if (!suffixedVal) continue;
      if (isEnvKeyThrottled(suffixedId)) continue;
      if (candidates.some((c) => c.key === suffixedVal)) continue;
      candidates.push({
        key: suffixedVal,
        keyId: suffixedId,
        source: "env",
        provider: normalizedProvider,
      });
    }
  }

  return candidates;
}

/**
 * Resolves a single primary API key for the given provider and user.
 */
export async function resolveKey(
  adminClient: SupabaseClient,
  userId: string,
  provider: string,
): Promise<ResolvedKey> {
  const candidates = await getCandidateKeys(adminClient, userId, provider);

  if (candidates.length === 0) {
    await logUsage(adminClient, userId, provider, "system", false);
    throw new Error(
      `quota_exhausted: No API keys available for provider "${provider}"`,
    );
  }

  const selected = candidates[0];
  await logUsage(adminClient, userId, provider, selected.source, true);
  return selected;
}

/**
 * Marks a system API key as used and updates its last_used_at.
 * Env-sourced keys have no row to update — no-op for those, unchanged from before.
 */
export async function markKeyUsed(
  adminClient: SupabaseClient,
  resolvedKey: { keyId: string; source: string },
) {
  if (
    resolvedKey.source === "system" &&
    !resolvedKey.keyId.startsWith("env-")
  ) {
    await adminClient
      .from("system_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", resolvedKey.keyId);
  }
}

/**
 * Marks a key as throttled after receiving a 429 rate-limit response.
 * Now handles BOTH system-pool keys (DB throttled_until column) AND env-sourced
 * keys (in-memory map) — previously env keys were silently never throttled here.
 */
export async function handle429(
  adminClient: SupabaseClient,
  keyId: string,
  cooldownMs: number = 3600000,
) {
  if (!keyId) return;

  if (keyId.startsWith("env-")) {
    throttleEnvKey(keyId, cooldownMs);
    return;
  }

  await adminClient
    .from("system_api_keys")
    .update({
      throttled_until: new Date(Date.now() + cooldownMs).toISOString(),
    })
    .eq("id", keyId);
}

/**
 * Logs API key usage into api_key_usage_logs.
 * Confirmed against total_structure.sql 2026-08-28: cost_estimate_usd and
 * status_code both exist on api_key_usage_logs — this insert was already correct,
 * left unchanged.
 */
export async function logUsage(
  adminClient: SupabaseClient,
  userId: string,
  provider: string,
  source: string,
  success: boolean,
  tokensUsed = 0,
  functionName = "keyResolver",
) {
  try {
    await adminClient.from("api_key_usage_logs").insert({
      user_id: userId || null,
      provider,
      key_source: source,
      success,
      function_name: functionName,
      tokens_used: tokensUsed,
      cost_estimate_usd: 0,
      status_code: success ? 200 : 500,
    });
  } catch (err) {
    console.error("Failed to insert api_key_usage_log:", err);
  }
}
