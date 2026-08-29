/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Multi-Source Job Scraper & Engine (Full Europe & Global Support).
 * Sources: JSearch, Adzuna, and LinkedIn (RapidAPI).
 * Priorities: Sweden (Stockholm, Gothenburg, Malmö) & Europe.
 * Features:
 *  - Dynamic filter keywords & exact geo/location support (lat/lng, radiusKm, cities, countries).
 *  - Multi-tier key rotation & automatic fallback across system/env key pool on 429/401 errors.
 *  - Deduplication via SHA-256 hashing into job_vault.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getCandidateKeys, handle429, markKeyUsed, logUsage } from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rateLimit.ts";

const supabase = getSupabaseAdmin();

interface ScrapeParams {
  keywords?: string[];
  cities?: string[];
  countries?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  datePosted?: string; // "24h" | "3d" | "7d" | "30d" | "all"
  workTypes?: string[]; // ["remote", "hybrid", "onsite"]
  enableSources?: {
    jsearch?: boolean;
    adzuna?: boolean;
    linkedin?: boolean;
  };
  adzunaAppId?: string;
  page?: number;
}

interface NormalizedJob {
  title: string;
  company: string;
  company_logo_url?: string;
  location: string;
  country_code: string;
  description: string;
  apply_url: string;
  posted_at?: string;
  work_type?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  source: string;
  external_job_id?: string;
  source_url?: string;
}

// ── 1. JSearch Adapter ────────────────────────────────────────────────────────
async function fetchJSearch(params: ScrapeParams, userId: string): Promise<NormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "rapidapi");
  if (candidateKeys.length === 0) return [];

  const queryTerms = (params.keywords && params.keywords.length > 0)
    ? params.keywords.join(" ")
    : "developer";

  const primaryCountry = params.countries?.[0] || "SE";
  const primaryCity = params.cities?.[0] || "Stockholm";

  const queryParams = new URLSearchParams({
    query: `${queryTerms} in ${primaryCity}, ${primaryCountry}`,
    page: (params.page || 1).toString(),
    num_pages: "1",
    date_posted: params.datePosted || "all",
  });

  if (params.latitude && params.longitude) {
    queryParams.set("geo", `${params.latitude},${params.longitude}`);
    if (params.radiusKm) queryParams.set("radius", params.radiusKm.toString());
  }

  for (const keyObj of candidateKeys) {
    try {
      const response = await fetch(`https://jsearch.p.rapidapi.com/search?${queryParams}`, {
        headers: {
          "X-RapidAPI-Key": keyObj.key,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (response.status === 429) {
        await handle429(supabase, keyObj.keyId);
        continue; // Try next key in rotation pool
      }

      if (!response.ok) continue;

      const data = await response.json();
      await markKeyUsed(supabase, keyObj);
      await logUsage(supabase, userId, "rapidapi", keyObj.source, true, 0, "scrape-jobs/jsearch");

      const rawItems = data.data || [];
      return rawItems.map((raw: any) => ({
        title: raw.job_title || "Untitled Role",
        company: raw.employer_name || "Unknown Company",
        company_logo_url: raw.employer_logo || null,
        location: [raw.job_city, raw.job_state, raw.job_country].filter(Boolean).join(", ") || primaryCity,
        country_code: raw.job_country || primaryCountry,
        description: raw.job_description || "",
        apply_url: raw.job_apply_link || raw.job_google_link || "",
        posted_at: raw.job_posted_at_datetime_utc || new Date().toISOString(),
        work_type: raw.job_is_remote ? "remote" : "onsite",
        salary_min: raw.job_min_salary || null,
        salary_max: raw.job_max_salary || null,
        currency: raw.job_salary_currency || "SEK",
        source: "jsearch",
        external_job_id: raw.job_id,
        source_url: raw.job_apply_link || "",
      }));
    } catch (err) {
      console.warn("JSearch fetch error with key:", err);
    }
  }

  return [];
}

// ── 2. Adzuna Adapter ─────────────────────────────────────────────────────────
async function fetchAdzuna(params: ScrapeParams, userId: string): Promise<NormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "adzuna");
  if (candidateKeys.length === 0) return [];

  const country = (params.countries?.[0] || "se").toLowerCase();
  const locationName = params.cities?.[0] || "Stockholm";
  const whatQuery = (params.keywords && params.keywords.length > 0)
    ? params.keywords.join(" ")
    : "developer";

  const appKeyObj = candidateKeys[0]; // Active key
  const appId = params.adzunaAppId || Deno.env.get("ADZUNA_APP_ID") || "opushunter";

  for (const keyObj of candidateKeys) {
    try {
      const endpoint = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
      const queryParams = new URLSearchParams({
        app_id: appId,
        app_key: keyObj.key,
        results_per_page: "25",
        what: whatQuery,
        where: locationName,
      });

      if (params.radiusKm) {
        queryParams.set("distance", params.radiusKm.toString());
      }

      const response = await fetch(`${endpoint}?${queryParams}`);
      if (response.status === 429) {
        await handle429(supabase, keyObj.keyId);
        continue;
      }

      if (!response.ok) continue;

      const data = await response.json();
      await markKeyUsed(supabase, keyObj);
      await logUsage(supabase, userId, "adzuna", keyObj.source, true, 0, "scrape-jobs/adzuna");

      const results = data.results || [];
      return results.map((raw: any) => ({
        title: raw.title?.replace(/<\/?[^>]+(>|$)/g, "") || "Untitled Role",
        company: raw.company?.display_name || "Unknown Company",
        company_logo_url: null,
        location: raw.location?.display_name || locationName,
        country_code: country.toUpperCase(),
        description: raw.description?.replace(/<\/?[^>]+(>|$)/g, "") || "",
        apply_url: raw.redirect_url || "",
        posted_at: raw.created || new Date().toISOString(),
        work_type: "onsite",
        salary_min: raw.salary_min || null,
        salary_max: raw.salary_max || null,
        currency: raw.salary_is_predicted ? "SEK" : (raw.salary_min ? "SEK" : "EUR"),
        source: "adzuna",
        external_job_id: raw.id?.toString(),
        source_url: raw.redirect_url || "",
      }));
    } catch (err) {
      console.warn("Adzuna fetch error with key:", err);
    }
  }

  return [];
}

// ── 3. LinkedIn Adapter (via RapidAPI linkedin-jobs-search) ────────────────────
async function fetchLinkedIn(params: ScrapeParams, userId: string): Promise<NormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "rapidapi");
  if (candidateKeys.length === 0) return [];

  const locationStr = params.cities?.[0]
    ? `${params.cities[0]}, ${params.countries?.[0] || "Sweden"}`
    : "Stockholm, Sweden";
  const queryStr = (params.keywords && params.keywords.length > 0)
    ? params.keywords.join(" ")
    : "software engineer";

  for (const keyObj of candidateKeys) {
    try {
      const url = `https://linkedin-jobs-search.p.rapidapi.com/`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": keyObj.key,
          "X-RapidAPI-Host": "linkedin-jobs-search.p.rapidapi.com",
        },
        body: JSON.stringify({
          search_terms: queryStr,
          location: locationStr,
          page: (params.page || 1).toString(),
        }),
      });

      if (response.status === 429) {
        await handle429(supabase, keyObj.keyId);
        continue;
      }

      if (!response.ok) continue;

      const data = await response.json();
      await markKeyUsed(supabase, keyObj);
      await logUsage(supabase, userId, "rapidapi", keyObj.source, true, 0, "scrape-jobs/linkedin");

      const items = Array.isArray(data) ? data : (data.jobs || data.data || []);
      return items.map((raw: any) => ({
        title: raw.job_title || raw.title || "Untitled Role",
        company: raw.company_name || raw.company || "Unknown Company",
        company_logo_url: raw.company_logo || null,
        location: raw.location || locationStr,
        country_code: params.countries?.[0] || "SE",
        description: raw.job_description || raw.description || "LinkedIn job opportunity.",
        apply_url: raw.job_url || raw.apply_url || raw.url || "",
        posted_at: raw.posted_date || new Date().toISOString(),
        work_type: raw.work_type || "onsite",
        salary_min: null,
        salary_max: null,
        currency: "SEK",
        source: "linkedin",
        external_job_id: raw.job_id || raw.id,
        source_url: raw.job_url || "",
      }));
    } catch (err) {
      console.warn("LinkedIn fetch error with key:", err);
    }
  }

  return [];
}

// ── Main Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, searchParams = {} } = await req.json();
    if (!userId) throw new Error("Missing required field: userId");

    // 1. Rate Limit Check
    const rateLimitResult = await rateLimit.check(userId);
    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: "rate_limited",
          nextAvailableAt: rateLimitResult.nextAvailableAt,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    const enabled = searchParams.enableSources || { jsearch: true, adzuna: true, linkedin: true };

    // 2. Run scrapers in parallel
    const scrapePromises: Promise<NormalizedJob[]>[] = [];

    if (enabled.jsearch !== false) scrapePromises.push(fetchJSearch(searchParams, userId));
    if (enabled.adzuna !== false) scrapePromises.push(fetchAdzuna(searchParams, userId));
    if (enabled.linkedin !== false) scrapePromises.push(fetchLinkedIn(searchParams, userId));

    const results = await Promise.allSettled(scrapePromises);

    const allListings: NormalizedJob[] = [];
    results.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        allListings.push(...res.value);
      }
    });

    // 3. Deduplication via SHA-256
    const seen = new Set<string>();
    const deduped: any[] = [];

    for (const listing of allListings) {
      const hashInput = `${(listing.company || "").toLowerCase()}${(listing.title || "").toLowerCase()}${(listing.location || "").toLowerCase()}`;
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(hashInput)
      );
      const hashString = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (!seen.has(hashString)) {
        seen.add(hashString);
        deduped.push({
          ...listing,
          dedup_hash: hashString,
        });
      }
    }

    // 4. Upsert into job_vault
    const finalListings = deduped.slice(0, 50);
    if (finalListings.length > 0) {
      const { error: upsertError } = await supabase.from("job_vault").upsert(
        finalListings.map((listing) => ({
          ...listing,
          user_id: userId,
          scraped_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,dedup_hash" }
      );
      if (upsertError) throw upsertError;
    }

    // 5. Update rate limit
    await rateLimit.update(userId);

    return Response.json(
      {
        success: true,
        count: finalListings.length,
        totalScraped: allListings.length,
        listings: finalListings,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Scrape error:", error);
    return Response.json(
      { error: "scrape_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
});
