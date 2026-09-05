/**
 * supabase/functions/_shared/supabaseAdmin.ts
 * OpusHunter — service-role Supabase client for trusted Edge Functions.
 *
 * This module must never be imported by client code. The service-role key
 * bypasses RLS, so a public anon key is deliberately not an acceptable
 * fallback when the service-role secret is misconfigured.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SupabaseAdminCredentials {
  supabaseUrl: string;
  serviceRoleKey: string;
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required Edge Function secret: ${name}`);
  }
  return value;
}

function getEnvCredentials(): SupabaseAdminCredentials {
  const supabaseUrl = (
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("EXPO_PUBLIC_SUPABASE_URL") ||
    ""
  ).trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing required Edge Function environment variable: SUPABASE_URL",
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

let client: SupabaseClient | null = null;

/**
 * Returns a cached service-role client.
 * This client intentionally bypasses RLS and is only safe inside trusted
 * server-side Edge Function code.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, serviceRoleKey } = getEnvCredentials();
    client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-application-name": "opushunter-edge" },
      },
    });
  }

  return client;
}

/**
 * Validates a bearer token through Supabase Auth and returns its user ID.
 * The token is never logged or persisted.
 */
export async function verifyJwt(
  req: Request,
): Promise<{ userId: string } | null> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return null;

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  if (!match) return null;

  try {
    const {
      data: { user },
      error,
    } = await getSupabaseAdmin().auth.getUser(match[1]);

    if (error || !user) return null;
    return { userId: user.id };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export default getSupabaseAdmin;
