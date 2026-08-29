/**
 * supabase/functions/_shared/rateLimit.ts
 * OpusHunter — Scrape Rate Limiting (Refined).
 * Enforces 24-hour limit for members. Admins and Premium users with BYOK bypass limits.
 * Reads/writes to scrape_rate_limits table. Matches database.types.ts exactly.
 */

import { getSupabaseAdmin } from "./supabaseAdmin.ts";

const supabase = getSupabaseAdmin();

const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const rateLimit = {
  /**
   * Checks if the user is allowed to scrape.
   * @param userId - The ID of the user.
   * @returns { allowed: boolean, nextAvailableAt: string | null }
   */
  async check(userId: string) {
    // 1. Fetch user profile to determine role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const role = profile?.role || "member";

    // ── Admins: Always allowed ───────────────────────────────────────────
    if (role === "admin") {
      return { allowed: true, nextAvailableAt: null };
    }

    // ── Premium with BYOK: Bypass limit ──────────────────────────────────
    if (role === "premium") {
      const { count } = await supabase
        .from("user_api_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true);

      if (count && count > 0) {
        return { allowed: true, nextAvailableAt: null };
      }
    }

    // ── Member / Premium without BYOK: Standard 24h limit ────────────────
    const { data: limitRow } = await supabase
      .from("scrape_rate_limits")
      .select("last_scrape_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (limitRow?.last_scrape_at) {
      const nextAvailableAt = new Date(
        new Date(limitRow.last_scrape_at).getTime() + SCRAPE_INTERVAL_MS
      );
      if (nextAvailableAt > new Date()) {
        return {
          allowed: false,
          nextAvailableAt: nextAvailableAt.toISOString(),
        };
      }
    }

    return { allowed: true, nextAvailableAt: null };
  },

  /**
   * Updates the scrape rate limit record after a successful scrape.
   * @param userId - The ID of the user.
   */
  async update(userId: string) {
    const now = new Date().toISOString();

    // Upsert: insert if no row exists, else update timestamps
    await supabase.from("scrape_rate_limits").upsert(
      {
        user_id: userId,
        last_scrape_at: now,
        scrape_count_today: 1, // Increment or reset logic can be added here
        reset_at: new Date(Date.now() + SCRAPE_INTERVAL_MS).toISOString(),
      },
      { onConflict: "user_id" }
    );
  },
};