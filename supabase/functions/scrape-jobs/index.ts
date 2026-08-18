/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Job Scraper with Key Rotation & Strict Geo-Targeting
 */

import { createClient } from "supabase";
import { verifyUser } from "../_shared/auth.ts";
import { resolveKeyPool, markKeyUsed } from "../_shared/keyResolver.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const JSEARCH_TYPE_MAP: Record<string, string> = {
  FULLTIME: "FULLTIME",
  PARTTIME: "PARTTIME",
  CONTRACTOR: "CONTRACTOR",
  INTERNSHIP: "INTERN",
  INTERN: "INTERN",
};

interface JSearchJob {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_salary?: string;
  job_apply_link?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  try {
    const user = await verifyUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, last_scrape_time")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "member";
    const now = new Date();

    if (userRole === "member" && profile?.last_scrape_time) {
      const lastScrape = new Date(profile.last_scrape_time);
      const hoursPassed =
        (now.getTime() - lastScrape.getTime()) / (1000 * 60 * 60);
      if (hoursPassed < 4) {
        return new Response(
          JSON.stringify({
            error:
              "Rate limit reached. Upgrade to Premium for unmetered scraping.",
            cooldown_remaining_hours: (4 - hoursPassed).toFixed(1),
          }),
          {
            status: 429,
            headers: {
              ...getCorsHeaders(),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    const availableKeys = await resolveKeyPool(
      supabaseAdmin,
      user.id,
      "rapidapi",
    );
    if (availableKeys.length === 0) {
      throw new Error(
        "CRITICAL: No RapidAPI keys available in BYOK, pool, or environment.",
      );
    }
    const rapidApiKey = availableKeys[0];

    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("automation_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (rulesError) throw rulesError;

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No active automation rules found.",
          count: 0,
        }),
        {
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
        },
      );
    }

    let totalInserted = 0;
    const summaries = [];

    for (const rule of rules) {
      // 1. EXTRACT PRIMARY KEYWORD ONLY to prevent confusing JSearch
      const primaryKeyword =
        Array.isArray(rule.keywords) && rule.keywords.length > 0
          ? rule.keywords[0]
          : "Software Engineer";

      // 2. CLEAN UP LOCATION (e.g. converts "Sweden, Sweden, Stockholm" to "Sweden, Stockholm")
      const rawLoc = rule.location || "Sweden";
      const locParts = rawLoc
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const cleanLocation = Array.from(new Set(locParts)).join(", ");

      const remoteString =
        rule.remote_preference === "Remote Only" ? "Remote " : "";
      const formattedQuery = `${remoteString}${primaryKeyword} in ${cleanLocation}`;

      const rawTypes = rule.work_types || [];
      const employmentTypes = rawTypes
        .map((t: string) => JSEARCH_TYPE_MAP[t.toUpperCase()])
        .filter(Boolean)
        .join(",");

      let jsearchUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(formattedQuery)}&page=1&num_pages=1`;
      if (employmentTypes.length > 0) {
        jsearchUrl += `&employment_types=${employmentTypes}`;
      }

      const response = await fetch(jsearchUrl, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey.key,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        summaries.push({
          rule: primaryKeyword,
          fetched: 0,
          new: 0,
          key_source: `failed: JSearch ${response.status}: ${errText}`,
        });
        continue;
      }

      await markKeyUsed(supabaseAdmin, rapidApiKey);

      const payload = await response.json();
      const scrapedJobs = payload.data || [];

      if (scrapedJobs.length === 0) {
        summaries.push({ rule: primaryKeyword, fetched: 0, new: 0 });
        continue;
      }

      const records = scrapedJobs.map((job: JSearchJob) => ({
        user_id: user.id,
        external_job_id: String(job.job_id),
        title: job.job_title ?? "Untitled Position",
        company: job.employer_name ?? "Unknown Employer",
        location:
          [job.job_city, job.job_state, job.job_country]
            .filter(Boolean)
            .join(", ") || cleanLocation,
        description: job.job_description ?? "",
        salary: job.job_salary ?? null,
        url: job.job_apply_link ?? "",
        status: "pending",
        match_score: null,
      }));

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("job_vault")
        .upsert(records, {
          onConflict: "external_job_id, user_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        console.error("Database insert error:", insertError.message);
      }

      const insertedCount = inserted?.length ?? 0;
      totalInserted += insertedCount;

      summaries.push({
        rule: primaryKeyword,
        fetched: scrapedJobs.length,
        new: insertedCount,
      });
    }

    if (userRole === "member") {
      await supabaseAdmin
        .from("profiles")
        .update({ last_scrape_time: now.toISOString() })
        .eq("id", user.id);
    }

    return new Response(
      JSON.stringify({
        message:
          totalInserted > 0
            ? "Jobs successfully fetched and indexed."
            : "No new unindexed jobs found.",
        count: totalInserted,
        summary: summaries,
      }),
      { headers: { ...getCorsHeaders(), "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("[Scrape Error]:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
    });
  }
});
