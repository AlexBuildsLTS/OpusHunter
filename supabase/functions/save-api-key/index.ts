/**
 * supabase/functions/save-api-key/index.ts
 * OpusHunter — Secure API Key Storage.
 * Encrypts API keys using AES-256-GCM.
 * Supports auto-incrementing labels for fallback key pools (e.g., LINKEDIN_API_KEY2).
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

const VALID_PROVIDERS = [
  "gemini",
  "rapidapi",
  "geodb",
  "adzuna",
  "openai",
  "anthropic",
  "linkedin",
];

async function encryptKey(plaintext: string): Promise<string> {
  const secret =
    Deno.env.get("KEY_ENCRYPTION_SECRET") ||
    "opushunter-default-secret-32-bytes";
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const jwtResult = await verifyJwt(req);
    if (!jwtResult) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }
    const userId = jwtResult.userId;

    const { provider, key, isSystemKey = false } = await req.json();

    if (!VALID_PROVIDERS.includes(provider)) {
      return Response.json(
        {
          error: "invalid_provider",
          message: `Provider must be one of: ${VALID_PROVIDERS.join(", ")}`,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!key || key.length < 10) {
      return Response.json(
        { error: "invalid_key", message: "API key appears to be invalid" },
        { status: 400, headers: corsHeaders },
      );
    }

    const encryptedKey = await encryptKey(key);

    // If saving as a system fallback key (Admin only)
    if (isSystemKey) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (profile?.role !== "admin") {
        return Response.json(
          { error: "forbidden", message: "Admin only" },
          { status: 403, headers: corsHeaders },
        );
      }

      // Find how many keys exist for this provider to auto-increment the label
      const { count } = await supabase
        .from("system_api_keys")
        .select("*", { count: "exact", head: true })
        .eq("provider", provider);

      const nextIndex = (count || 0) + 1;
      const label = `${provider.toUpperCase()}_API_KEY${nextIndex > 1 ? nextIndex : ""}`;

      const { error: insertError } = await supabase
        .from("system_api_keys")
        .insert({
          provider,
          encrypted_key: encryptedKey,
          label,
          tier: "fallback",
          is_active: true,
          created_by: userId,
        });

      if (insertError) throw insertError;
    } else {
      // User BYOK Key
      const { error: upsertError } = await supabase
        .from("user_api_keys")
        .upsert(
          {
            user_id: userId,
            provider,
            encrypted_key: encryptedKey,
            is_active: true,
          },
          { onConflict: "user_id,provider" },
        );

      if (upsertError) throw upsertError;
    }

    return Response.json(
      { success: true, provider, masked_key: `...${key.slice(-4)}` },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Save API key error:", error);
    return Response.json(
      {
        error: "server_error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
