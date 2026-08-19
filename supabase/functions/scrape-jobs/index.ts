/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Job Scraper with Key Rotation & Strict Geo-Targeting
 */

import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { verifyUser } from "../_shared/auth.ts";
import { resolveKeyPool, markKeyUsed } from "../_shared/keyResolver.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper for Deno types in VS Code
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

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

/**
 * Clean up location string by removing duplicates and empty parts.
 */
function cleanLocationString(location: string): string {
  const parts = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(", ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  const supabaseAdmin = createAdminClient();

  try {
    const user = await verifyUser(req);

    // 1. Fetch user profile for role and rate-limit check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const userRole = profile?.role || "member";
    const now = new Date();

    // 2. Resolve available RapidAPI keys
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

    // 3. Fetch active automation rules for the user
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
    let keyWasUsed = false;

    // 4. Execute scraping for each active rule
    for (const rule of rules) {
      // Use the first keyword as primary or fallback
      const primaryKeyword =
        Array.isArray(rule.keywords) && rule.keywords.length > 0
          ? rule.keywords[0]
          : "Software Engineer";

      const cleanLocation = cleanLocationString(rule.location || "Sweden");
      const remotePrefix =
        rule.remote_preference === "Remote Only" ? "Remote " : "";
      const formattedQuery = `${remotePrefix}${primaryKeyword} in ${cleanLocation}`;

      const employmentTypes = (rule.work_types || [])
        .map((t: string) => JSEARCH_TYPE_MAP[t.toUpperCase()])
        .filter(Boolean)
        .join(",");

      // Construct JSearch URL safely using URLSearchParams
      const jsearchUrl = new URL("https://jsearch.p.rapidapi.com/search");
      jsearchUrl.searchParams.set("query", formattedQuery);
      jsearchUrl.searchParams.set("page", "1");
      jsearchUrl.searchParams.set("num_pages", "1");
      if (employmentTypes) {
        jsearchUrl.searchParams.set("employment_types", employmentTypes);
      }

      const response = await fetch(jsearchUrl.toString(), {
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
          error: `JSearch ${response.status}: ${errText}`,
        });
        continue;
      }

      keyWasUsed = true;
      const payload = await response.json();
      const scrapedJobs = payload.data || [];

      if (scrapedJobs.length === 0) {
        summaries.push({ rule: primaryKeyword, fetched: 0, new: 0 });
        continue;
      }

      // Map API response to database schema
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
      }));

      // Batch upsert jobs for this rule
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("job_vault")
        .upsert(records, {
          onConflict: "external_job_id, user_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        console.error(
          `[Scrape] Database insert error for rule "${primaryKeyword}":`,
          insertError.message,
        );
      }

      const insertedCount = inserted?.length ?? 0;
      totalInserted += insertedCount;

      summaries.push({
        rule: primaryKeyword,
        fetched: scrapedJobs.length,
        new: insertedCount,
      });
    }

    // 5. Finalize: rotate key and update member rate-limiting
    if (keyWasUsed) {
      await markKeyUsed(supabaseAdmin, rapidApiKey);
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
