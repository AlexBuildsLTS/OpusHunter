/**
 * supabase/functions/save-api-key/index.ts
 * OpusHunter — Secure BYOK Key Storage (Refined).
 * Encrypts API keys using AES-256-GCM. Upserts into user_api_keys.
 * NEVER returns the key to the client. Validates provider enum.
 * Matches database.types.ts exactly (user_api_keys table).
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

// Encryption secret (must be 32 bytes for AES-256-GCM)
const ENCRYPTION_SECRET = Deno.env.get("KEY_ENCRYPTION_SECRET");
if (!ENCRYPTION_SECRET) {
  throw new Error("KEY_ENCRYPTION_SECRET is not set");
}

// Allowed providers (must match database enum)
const VALID_PROVIDERS = ["gemini", "rapidapi", "adzuna", "openai", "anthropic", "geodb"];

// AES-256-GCM Encryption
async function encryptKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_SECRET!.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Verify JWT (server-side)
    const jwtResult = await verifyJwt(req);
    if (!jwtResult) {
      return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
    }
    const userId = jwtResult.userId;

    // 2. Parse request body
    const { provider, key } = await req.json();

    // 3. Validate provider
    if (!VALID_PROVIDERS.includes(provider)) {
      return Response.json(
        { error: "invalid_provider", message: `Provider must be one of: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Validate key (basic format check - never log it)
    if (!key || key.length < 10 || key.length > 500) {
      return Response.json(
        { error: "invalid_key", message: "API key appears to be invalid" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Encrypt key
    const encryptedKey = await encryptKey(key);

    // 6. Upsert into user_api_keys (Service-Role only)
    const { error: upsertError } = await supabase
      .from("user_api_keys")
      .upsert(
        {
          user_id: userId,
          provider,
          encrypted_key: encryptedKey,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Save API key error:", upsertError);
      return Response.json(
        { error: "save_failed", message: "Could not save API key" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 7. Return success (never return the key)
    return Response.json(
      { success: true, provider, masked_key: `...${key.slice(-4)}` },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Save API key error:", error);
    return Response.json(
      { error: "server_error", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
});