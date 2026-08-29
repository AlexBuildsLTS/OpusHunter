/**
 * supabase/functions/_shared/keyResolver.ts
 * OpusHunter — Triple-Tier API Key Resolver with Automatic Key Rotation & Fallback.
 * Tier 1: User BYOK (user_api_keys).
 * Tier 2: System Key Pool (system_api_keys) sorted by priority with automatic 429 rotation.
 * Tier 3: Environment variables fallback (GEMINI_API_KEY, RAPIDAPI_KEY, ADZUNA_KEY, etc.).
 * Supports optional AES-256-GCM decryption with plaintext fallback.
 */

import { getSupabaseAdmin } from "./supabaseAdmin.ts";
import { SupabaseClient } from "@supabase/supabase-js";

// Helper for AES-256-GCM decryption with plaintext fallback
async function decryptKeyIfNeeded(rawKey: string): Promise<string> {
  const secret = Deno.env.get("KEY_ENCRYPTION_SECRET");
  if (!secret) return rawKey; // Fallback to raw plaintext if no secret set

  try {
    const combined = new Uint8Array(
      atob(rawKey)
        .split("")
        .map((c) => c.charCodeAt(0))
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
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
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

/**
 * Resolves all candidate keys for a provider in priority order.
 * Returning an array enables calling functions to rotate keys seamlessly if one returns 429/401/error.
 */
export async function getCandidateKeys(
  adminClient: SupabaseClient,
  userId: string,
  provider: string
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
  try {
    const { data: systemKeys } = await adminClient
      .from("system_api_keys")
      .select("id, encrypted_key, throttled_until")
      .eq("provider", normalizedProvider)
      .eq("is_active", true)
      .or(
        `throttled_until.is.null,throttled_until.lt.${new Date().toISOString()}`
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

  // ── Tier 3: Environment Variable Fallbacks ────────────────────────────
  const envKeyNames = [
    `${normalizedProvider.toUpperCase()}_API_KEY`,
    `${normalizedProvider.toUpperCase()}_KEY`,
  ];

  if (normalizedProvider === "gemini") {
    envKeyNames.push("GEMINI_API_KEY", "GOOGLE_API_KEY");
  } else if (normalizedProvider === "rapidapi") {
    envKeyNames.push("RAPIDAPI_KEY", "RAPID_API_KEY", "JSEARCH_API_KEY");
  } else if (normalizedProvider === "adzuna") {
    envKeyNames.push("ADZUNA_KEY", "ADZUNA_API_KEY");
  } else if (normalizedProvider === "geodb") {
    envKeyNames.push("GEODB_API_KEY", "GEODB_KEY", "RAPIDAPI_KEY");
  }

  for (const envVar of envKeyNames) {
    const val = Deno.env.get(envVar);
    if (val && !candidates.some((c) => c.key === val)) {
      candidates.push({
        key: val,
        keyId: `env-${envVar}`,
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
  provider: string
): Promise<ResolvedKey> {
  const candidates = await getCandidateKeys(adminClient, userId, provider);

  if (candidates.length === 0) {
    await logUsage(adminClient, userId, provider, "system", false);
    throw new Error(
      `quota_exhausted: No API keys available for provider "${provider}"`
    );
  }

  const selected = candidates[0];
  await logUsage(adminClient, userId, provider, selected.source, true);
  return selected;
}

/**
 * Marks a system API key as used and updates its last_used_at.
 */
export async function markKeyUsed(
  adminClient: SupabaseClient,
  resolvedKey: { keyId: string; source: string }
) {
  if (resolvedKey.source === "system" && !resolvedKey.keyId.startsWith("env-")) {
    await adminClient
      .from("system_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", resolvedKey.keyId);
  }
}

/**
 * Marks a system API key as throttled after receiving a 429 rate-limit response.
 */
export async function handle429(
  adminClient: SupabaseClient,
  keyId: string,
  cooldownMs: number = 3600000
) {
  if (keyId && !keyId.startsWith("env-")) {
    await adminClient
      .from("system_api_keys")
      .update({
        throttled_until: new Date(Date.now() + cooldownMs).toISOString(),
      })
      .eq("id", keyId);
  }
}

/**
 * Logs API key usage into api_key_usage_logs.
 */
export async function logUsage(
  adminClient: SupabaseClient,
  userId: string,
  provider: string,
  source: string,
  success: boolean,
  tokensUsed = 0,
  functionName = "keyResolver"
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
