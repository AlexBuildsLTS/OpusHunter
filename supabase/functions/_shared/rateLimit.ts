/**
 * supabase/functions/_shared/rateLimit.ts
 * OpusHunter — Scrape Rate Limiting & Tier Rules.
 * - Admin: Unlimited scrapes.
 * - Premium (with BYOK): Unlimited scrapes.
 * - Premium (standard): 5 scrapes per 12h window.
 * - Member: 1 scrape per 12h cooldown window.
 */

import { getSupabaseAdmin } from "./supabaseAdmin.ts";

const supabase = getSupabaseAdmin();

const SCRAPE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours cooldown window
const MEMBER_MAX_SCRAPES = 1;
const PREMIUM_MAX_SCRAPES = 5;

export const rateLimit = {
  /**
   * Checks if the user is allowed to scrape based on their role and cooldown quota.
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

    // ── Premium with BYOK: Always allowed ────────────────────────────────
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

    const maxAllowed =
      role === "premium" ? PREMIUM_MAX_SCRAPES : MEMBER_MAX_SCRAPES;

    // ── Check scrape rate limits table ───────────────────────────────────
    const { data: limitRow } = await supabase
      .from("scrape_rate_limits")
      .select("last_scrape_at, reset_at, scrape_count_today")
      .eq("user_id", userId)
      .maybeSingle();

    if (limitRow) {
      const now = Date.now();
      const resetTime = limitRow.reset_at
        ? new Date(limitRow.reset_at).getTime()
        : 0;
      const count = limitRow.scrape_count_today ?? 0;

      // If we are still within the 12h cooldown window and reached max scrapes
      if (resetTime > now && count >= maxAllowed) {
        return {
          allowed: false,
          nextAvailableAt: new Date(resetTime).toISOString(),
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
    const now = new Date();
    const nowMs = now.getTime();

    // Check existing limit row
    const { data: limitRow } = await supabase
      .from("scrape_rate_limits")
      .select("reset_at, scrape_count_today")
      .eq("user_id", userId)
      .maybeSingle();

    let newCount = 1;
    let resetAt = new Date(nowMs + SCRAPE_INTERVAL_MS).toISOString();

    if (limitRow?.reset_at) {
      const existingResetMs = new Date(limitRow.reset_at).getTime();
      if (existingResetMs > nowMs) {
        // Still inside current window: increment count, preserve reset time
        newCount = (limitRow.scrape_count_today || 0) + 1;
        resetAt = limitRow.reset_at;
      }
    }

    await supabase.from("scrape_rate_limits").upsert(
      {
        user_id: userId,
        last_scrape_at: now.toISOString(),
        scrape_count_today: newCount,
        reset_at: resetAt,
      },
      { onConflict: "user_id" },
    );
  },
};
