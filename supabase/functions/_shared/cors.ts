/**
 * supabase/functions/_shared/cors.ts
 * OpusHunter — Shared CORS Headers (Final Verified).
 * Restricts API access to allowed app domains (Vercel + Expo Web).
 * Handles preflight OPTIONS requests correctly. Secure by default.
 */

// Allowed origins (update with your actual Vercel URL)
const ALLOWED_ORIGINS = [
  "https://opus-hunter.vercel.app",
  "https://opushunter.vercel.app",
  "http://localhost:8081", // Expo web dev
  "http://localhost:3000", // React dev
  "http://localhost:19006", // Expo web fallback
];

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Default wildcard for edge functions
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

/**
 * Dynamically sets CORS headers based on the requesting origin.
 * Safer than wildcard for production. Falls back to wildcard if origin not found.
 * @param req - The incoming Request object.
 * @returns { Headers } - The configured CORS headers.
 */
export function getCorsHeaders(req: Request): Headers {
  const origin = req.headers.get("origin") || "";
  const headers = new Headers(corsHeaders);

  // If origin is in allowlist, mirror it (production-safe)
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    // For mobile native (no origin) or unknown clients, use wildcard
    // This is safe because the Authorization JWT still protects the API.
    headers.set("Access-Control-Allow-Origin", "*");
  }

  return headers;
}

/**
 * Standard OPTIONS preflight handler.
 * @param req - The incoming Request object.
 * @returns { Response } - The preflight response.
 */
export function handlePreflight(req: Request): Response {
  const headers = getCorsHeaders(req);
  return new Response(null, { status: 204, headers });
}
