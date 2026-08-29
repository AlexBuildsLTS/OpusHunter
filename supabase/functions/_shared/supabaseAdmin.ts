/**
 * supabase/functions/_shared/supabaseAdmin.ts
 * OpusHunter — Service-Role Supabase Client (Refined & Bulletproof).
 * Used exclusively inside Edge Functions for server-side operations.
 * NEVER import this into client code. RLS is bypassed intentionally.
 * Cached singleton to avoid re-instantiation across invocations.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Validate environment variables at invocation time with fallback to EXPO_PUBLIC_*
function getEnvCredentials() {
// @ts-ignore: Deno global
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("EXPO_PUBLIC_SUPABASE_URL") ||
    "";
  // @ts-ignore: Deno global
  const supabaseServiceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") ||
    "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

let client: SupabaseClient | null = null;

/**
 * Returns a cached Service-Role Supabase client.
 * Bypasses RLS — use ONLY in trusted Edge Function code.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseServiceRoleKey } = getEnvCredentials();
    client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-application-name": "opushunter" },
      },
    });
  }
  return client;
}

/**
 * Verifies the JWT from the Authorization header and returns the user ID.
 * Used in all Edge Functions that require user authentication.
 * @param req - The incoming Request object.
 * @returns { userId: string } or null if authentication fails.
 */
export async function verifyJwt(
  req: Request
): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseAdmin();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id };
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}

export default getSupabaseAdmin;
