/**
 * @file supabase/functions/_shared/cors.ts
 * @description Universal CORS headers for Edge Nodes
 */

export const getCorsHeaders = (): Record<string, string> => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
});