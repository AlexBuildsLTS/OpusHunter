/**
 * supabase/functions/_shared/rateLimit.ts
 * OpusHunter — Scrape Rate Limiting & Tier Rules.
 * - All users: Unlimited scrapes.
 */

import { getSupabaseAdmin } from "./supabaseAdmin.ts";

const supabase = getSupabaseAdmin();

export const rateLimit = {
  /**
   * Checks if the user is allowed to scrape based on their role and cooldown quota.
   * @param userId - The ID of the user.
   * @returns { allowed: boolean, nextAvailableAt: string | null }
   */
  async check(_userId: string) {
    return { allowed: true, nextAvailableAt: null };
  },

  /**
   * Updates the scrape rate limit record after a successful scrape.
   * @param userId - The ID of the user.
   */
  async update(_userId: string) {
    // No-op: Rate limits are disabled.
  },
};
