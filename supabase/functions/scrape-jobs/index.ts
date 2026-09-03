/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Multi-Source Job Scraper & Engine (Full Europe & Global Support).
 * Sources: JobTech (Sweden Priority), JSearch, Adzuna, and LinkedIn (RapidAPI).
 * Features:
 *  - Dynamic filter keywords & exact geo/location support (lat/lng, radiusKm, cities, countries).
 *  - Multi-tier key rotation & automatic fallback across system/env key pool on 429/401 errors.
 *  - Deduplication via SHA-256 hashing into job_vault.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import {
  getCandidateKeys,
  handle429,
  markKeyUsed,
  logUsage,
} from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rateLimit.ts";
import { scrapeJobTechSweden } from "./adapters/jobtech.ts";

const supabase = getSupabaseAdmin();

interface ScrapeParams {
  keywords?: string[];
  cities?: string[];
  countries?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  datePosted?: string;
  workTypes?: string[];
  enableSources?: {
    jsearch?: boolean;
    adzuna?: boolean;
    linkedin?: boolean;
    jobtech?: boolean;
  };
  adzunaAppId?: string;
  batchSize?: number;
  page?: number;
}

interface NormalizedJob {
  title: string;
  company: string;
  company_logo_url?: string;
  location: string;
  country_code: string;
  description: string;
  url: string;
  posted_at?: string;
  work_type?: string;
  is_remote?: boolean;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  source: string;
  external_job_id?: string;
  source_url?: string;
  latitude?: number;
  longitude?: number;
  tech_stack?: string[];
  match_score?: number;
}

// ── 1. JSearch Adapter ────────────────────────────────────────────────────────
async function fetchJSearch(
  params: ScrapeParams,
  userId: string,
): Promise<NormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "rapidapi");
  if (candidateKeys.length === 0) {
    console.log("[JSearch] No RapidAPI keys found for user/system");
    return [];
  }

  let queryTerms = "software developer OR engineer OR fullstack";
  if (params.keywords && params.keywords.length > 0) {
    const cleanKeywords = params.keywords.filter(
      (k) => k && k.trim().length > 0,
    );
    if (cleanKeywords.length === 1) {
      queryTerms = cleanKeywords[0];
    } else if (cleanKeywords.length > 1) {
      queryTerms = cleanKeywords.slice(0, 3).join(" OR ");
    }
  }

  const primaryCountry = params.countries?.[0] || "Sweden";
  const primaryCity = params.cities?.[0] || "Stockholm";

  let jSearchDatePosted = "all";
  if (params.datePosted === "24h" || params.datePosted === "today")
    jSearchDatePosted = "today";
  else if (params.datePosted === "3d" || params.datePosted === "3days")
    jSearchDatePosted = "3days";
  else if (params.datePosted === "7d" || params.datePosted === "week")
    jSearchDatePosted = "week";
  else if (params.datePosted === "30d" || params.datePosted === "month")
    jSearchDatePosted = "month";

  const queryParams = new URLSearchParams({
    query: `${queryTerms} in ${primaryCity}, ${primaryCountry}`,
    page: (params.page || 1).toString(),
    num_pages: "1",
    date_posted: jSearchDatePosted,
  });

  if (params.latitude && params.longitude) {
    queryParams.set("geo", `${params.latitude},${params.longitude}`);
    if (params.radiusKm) queryParams.set("radius", params.radiusKm.toString());
  }

  for (const keyObj of candidateKeys) {
    try {
      console.log(
        `[JSearch] Querying JSearch via RapidAPI (key source: ${keyObj.source})`,
      );
      const response = await fetch(
        `https://jsearch.p.rapidapi.com/search?${queryParams}`,
        {
          headers: {
            "X-RapidAPI-Key": keyObj.key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        },
      );

      if (response.status === 429) {
        console.warn("[JSearch] 429 Rate limited, rotating key");
        await handle429(supabase, keyObj.keyId);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.warn(
          `[JSearch] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = await response.json();
      await markKeyUsed(supabase, keyObj);
      await logUsage(
        supabase,
        userId,
        "rapidapi",
        keyObj.source,
        true,
        0,
        "scrape-jobs/jsearch",
      );

      const rawItems = (data.data || []) as Array<Record<string, unknown>>;
      console.log(`[JSearch] Successfully fetched ${rawItems.length} jobs`);
      return rawItems.map((raw) => {
        const jobUrl = String(raw.job_apply_link || raw.job_google_link || "");
        return {
          title: String(raw.job_title || "Untitled Role"),
          company: String(raw.employer_name || "Unknown Company"),
          company_logo_url: raw.employer_logo
            ? String(raw.employer_logo)
            : undefined,
          location:
            [raw.job_city, raw.job_state, raw.job_country]
              .filter(Boolean)
              .map(String)
              .join(", ") || primaryCity,
          country_code: String(raw.job_country || primaryCountry),
          description: String(raw.job_description || ""),
          url: jobUrl,
          posted_at: String(
            raw.job_posted_at_datetime_utc || new Date().toISOString(),
          ),
          work_type: raw.job_is_remote ? "remote" : "onsite",
          is_remote: !!raw.job_is_remote,
          salary_min:
            typeof raw.job_min_salary === "number"
              ? raw.job_min_salary
              : undefined,
          salary_max:
            typeof raw.job_max_salary === "number"
              ? raw.job_max_salary
              : undefined,
          currency: String(raw.job_salary_currency || "SEK"),
          source: "jsearch",
          external_job_id: raw.job_id ? String(raw.job_id) : undefined,
          source_url: String(raw.job_apply_link || jobUrl),
        };
      });
    } catch (err) {
      console.warn("[JSearch] Fetch error with key:", err);
    }
  }

  return [];
}

// ── 2. Adzuna Adapter ─────────────────────────────────────────────────────────
const ADZUNA_SUPPORTED_COUNTRIES = new Set([
  "gb",
  "us",
  "at",
  "au",
  "be",
  "br",
  "ca",
  "de",
  "es",
  "fr",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "ru",
  "sg",
  "za",
]);

async function fetchAdzuna(
  params: ScrapeParams,
  userId: string,
): Promise<NormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "adzuna");
  if (candidateKeys.length === 0) return [];

  const rawCountry = (params.countries?.[0] || "se").toLowerCase();
  const country = ADZUNA_SUPPORTED_COUNTRIES.has(rawCountry)
    ? rawCountry
    : rawCountry === "uk"
      ? "gb"
      : null;

  if (!country) {
    console.log(
      `[Adzuna] Country '${rawCountry}' not supported by Adzuna, skipping Adzuna adapter.`,
    );
    return [];
  }

  const locationName = params.cities?.[0] || "Stockholm";
  const whatQuery =
    params.keywords && params.keywords.length > 0
      ? params.keywords
          .filter((k) => k && k.trim().length > 0)
          .slice(0, 2)
          .join(" ")
      : "software developer";

  const defaultAppId = Deno.env.get("ADZUNA_APP_ID") || "opushunter";

  for (const keyObj of candidateKeys) {
    try {
      let appId = params.adzunaAppId || defaultAppId;
      let appKey = keyObj.key;
      if (keyObj.key.includes(":")) {
        const parts = keyObj.key.split(":");
        appId = parts[0];
        appKey = parts[1];
      }

      const endpoint = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
      const queryParams = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "25",
        what: whatQuery,
        where: locationName,
      });

      if (params.radiusKm) {
        queryParams.set("distance", params.radiusKm.toString());
      }

      console.log(
        `[Adzuna] Querying Adzuna for country: ${country}, location: ${locationName}`,
      );
      const response = await fetch(`${endpoint}?${queryParams}`);
      if (response.status === 429) {
        console.warn("[Adzuna] 429 Rate limited");
        await handle429(supabase, keyObj.keyId);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.warn(
          `[Adzuna] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = (await response.json()) as {
        results?: Array<Record<string, unknown>>;
      };
      await markKeyUsed(supabase, keyObj);
      await logUsage(
        supabase,
        userId,
        "adzuna",
        keyObj.source,
        true,
        0,
        "scrape-jobs/adzuna",
      );

      const results = data.results || [];
      console.log(`[Adzuna] Successfully fetched ${results.length} jobs`);
      return results.map((raw) => {
        const companyObj = raw.company as { display_name?: string } | undefined;
        const locObj = raw.location as { display_name?: string } | undefined;
        const titleStr =
          typeof raw.title === "string"
            ? raw.title.replace(/<\/?[^>]+(>|$)/g, "")
            : "Untitled Role";
        const descStr =
          typeof raw.description === "string"
            ? raw.description.replace(/<\/?[^>]+(>|$)/g, "")
            : "";
        const jobUrl = String(raw.redirect_url || "");

        return {
          title: titleStr,
          company: companyObj?.display_name || "Unknown Company",
          company_logo_url: undefined,
          location: locObj?.display_name || locationName,
          country_code: country.toUpperCase(),
          description: descStr,
          url: jobUrl,
          posted_at: String(raw.created || new Date().toISOString()),
          work_type: "onsite",
          is_remote: false,
          salary_min:
            typeof raw.salary_min === "number" ? raw.salary_min : undefined,
          salary_max:
            typeof raw.salary_max === "number" ? raw.salary_max : undefined,
          currency: raw.salary_is_predicted
            ? "EUR"
            : raw.salary_min
              ? "EUR"
              : "EUR",
          source: "adzuna",
          external_job_id: raw.id ? String(raw.id) : undefined,
          source_url: jobUrl,
        };
      });
    } catch (err) {
      console.warn("[Adzuna] Fetch error with key:", err);
    }
  }

  return [];
}

// ── 3. LinkedIn Adapter (Direct API & RapidAPI Fallback) ──────────────────────
async function fetchLinkedIn(
  params: ScrapeParams,
  userId: string,
): Promise<NormalizedJob[]> {
  const locationStr = params.cities?.[0]
    ? `${params.cities[0]}, ${params.countries?.[0] || "Sweden"}`
    : "Stockholm, Sweden";
  const queryStr =
    params.keywords && params.keywords.length > 0
      ? params.keywords
          .filter((k) => k && k.trim().length > 0)
          .slice(0, 2)
          .join(" ")
      : "software engineer";

  const linkedInKeys = await getCandidateKeys(supabase, userId, "linkedin");
  for (const keyObj of linkedInKeys) {
    try {
      console.log(
        `[LinkedInScraperAPI] Querying linkedinscraperapi.com with key source: ${keyObj.source}`,
      );
      const searchUrl = new URL(
        "https://api.linkedinscraperapi.com/api/v1/linkedin/search",
      );
      searchUrl.searchParams.set("keywords", queryStr);
      searchUrl.searchParams.set("location", locationStr);
      searchUrl.searchParams.set("api_key", keyObj.key);
      if (params.page) {
        searchUrl.searchParams.set("page", params.page.toString());
      }
      if (params.datePosted && params.datePosted !== "all") {
        searchUrl.searchParams.set("time_range", params.datePosted);
      }

      const response = await fetch(searchUrl.toString());

      if (response.status === 429) {
        console.warn("[LinkedInScraperAPI] 429 Rate limited");
        await handle429(supabase, keyObj.keyId);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.warn(
          `[LinkedInScraperAPI] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = (await response.json()) as
        Record<string, unknown> | Array<Record<string, unknown>>;
      await markKeyUsed(supabase, keyObj);
      await logUsage(
        supabase,
        userId,
        "linkedin",
        keyObj.source,
        true,
        5,
        "scrape-jobs/linkedinscraperapi",
      );

      const items: Array<Record<string, unknown>> = Array.isArray(data)
        ? data
        : ((data.jobs || data.data || data.results || []) as Array<
            Record<string, unknown>
          >);

      if (items.length > 0) {
        console.log(
          `[LinkedInScraperAPI] Successfully fetched ${items.length} jobs`,
        );
        return items.map((raw) => {
          const rawUrl = String(raw.job_url || raw.apply_url || raw.url || "");
          const extId = raw.job_id
            ? String(raw.job_id)
            : raw.id
              ? String(raw.id)
              : undefined;
          const fallbackUrl = extId
            ? `https://www.linkedin.com/jobs/view/${extId}`
            : "https://www.linkedin.com";
          const finalJobUrl = rawUrl || fallbackUrl;
          const workTypeStr = String(raw.work_type || "onsite");

          return {
            title: String(raw.job_title || raw.title || "Untitled Role"),
            company: String(
              raw.company_name || raw.company || "Unknown Company",
            ),
            company_logo_url: raw.company_logo
              ? String(raw.company_logo)
              : undefined,
            location: String(raw.location || locationStr),
            country_code: params.countries?.[0] || "SE",
            description: String(
              raw.job_description ||
                raw.description ||
                "LinkedIn live opportunity.",
            ),
            url: finalJobUrl,
            posted_at: String(
              raw.posted_date || raw.posted_at || new Date().toISOString(),
            ),
            work_type: workTypeStr,
            is_remote: workTypeStr.toLowerCase().includes("remote"),
            salary_min: undefined,
            salary_max: undefined,
            currency: "SEK",
            source: "linkedin",
            external_job_id: extId,
            source_url: finalJobUrl,
          };
        });
      }
    } catch (err) {
      console.warn("[LinkedInScraperAPI] Fetch error with key:", err);
    }
  }

  return [];
}

// ── Main Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const jwtUser = await verifyJwt(req);
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.user_id || jwtUser?.userId;
    const searchParams: ScrapeParams = body.searchParams || body.filters || {};

    if (!userId) {
      return Response.json(
        {
          error: "missing_user",
          message:
            "Could not determine user session. Please ensure you are logged in.",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // 1. Rate Limit Check
    const rateLimitResult = await rateLimit.check(userId);
    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: "rate_limited",
          nextAvailableAt: rateLimitResult.nextAvailableAt,
        },
        { status: 429, headers: corsHeaders },
      );
    }

    const enabled = searchParams.enableSources || {
      jsearch: true,
      adzuna: true,
      linkedin: true,
      jobtech: true,
    };

    // 2. Run scrapers in parallel
    const scrapePromises: Promise<NormalizedJob[]>[] = [];

    const country = (searchParams.countries?.[0] || "").toUpperCase();
    const city = searchParams.cities?.[0] || "";
    const keywordQuery = searchParams.keywords?.join(" ") || "";

    // Priority Injection: If Sweden, fire the native JobTech API
    if (
      (country === "SE" || country === "SWEDEN") &&
      enabled.jobtech !== false
    ) {
      scrapePromises.push(scrapeJobTechSweden(keywordQuery, city));
    }

    if (enabled.jsearch !== false)
      scrapePromises.push(fetchJSearch(searchParams, userId));
    if (enabled.adzuna !== false)
      scrapePromises.push(fetchAdzuna(searchParams, userId));
    if (enabled.linkedin !== false)
      scrapePromises.push(fetchLinkedIn(searchParams, userId));

    const results = await Promise.allSettled(scrapePromises);

    const allListings: NormalizedJob[] = [];
    results.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        allListings.push(...res.value);
      }
    });

    // 3. Deduplication via SHA-256
    const seen = new Set<string>();
    const deduped: Array<NormalizedJob & { dedup_hash: string }> = [];

    for (const listing of allListings) {
      const hashInput = `${(listing.company || "").toLowerCase()}${(listing.title || "").toLowerCase()}${(listing.location || "").toLowerCase()}`;
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(hashInput),
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

    // 4. Determine batch capacity by tier & upsert into job_vault
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const userRole = userProfile?.role || "member";
    const defaultCap =
      userRole === "admin" ? 60 : userRole === "premium" ? 50 : 25;
    const batchCap =
      typeof searchParams.batchSize === "number" && searchParams.batchSize > 0
        ? Math.min(searchParams.batchSize, 100)
        : defaultCap;
    const finalListings = deduped.slice(0, batchCap);

    if (finalListings.length > 0) {
      const rowsToUpsert = finalListings.map((listing) => {
        const validSources = [
          "jsearch",
          "adzuna",
          "linkedin",
          "indeed",
          "custom",
        ];
        const source = validSources.includes(listing.source)
          ? (listing.source as
              "jsearch" | "adzuna" | "linkedin" | "indeed" | "custom")
          : "custom";

        let workType: "remote" | "hybrid" | "onsite" | "flexible" | null = null;
        if (listing.work_type) {
          const wt = listing.work_type.toLowerCase();
          if (wt.includes("remote")) workType = "remote";
          else if (wt.includes("hybrid")) workType = "hybrid";
          else if (wt.includes("onsite") || wt.includes("on-site"))
            workType = "onsite";
          else if (wt.includes("flexible")) workType = "flexible";
        }

        const isRemote = workType === "remote" || listing.is_remote === true;
        const jobUrl =
          listing.url ||
          listing.source_url ||
          (listing.external_job_id
            ? `https://www.linkedin.com/jobs/view/${listing.external_job_id}`
            : "https://opushunter.com");

        return {
          user_id: userId,
          source,
          external_job_id:
            listing.external_job_id ||
            listing.dedup_hash ||
            crypto.randomUUID(),
          title: listing.title || "Untitled Role",
          company: listing.company || "Unknown Company",
          company_logo_url: listing.company_logo_url || null,
          location: listing.location || null,
          country_code: listing.country_code || null,
          latitude:
            typeof listing.latitude === "number" ? listing.latitude : null,
          longitude:
            typeof listing.longitude === "number" ? listing.longitude : null,
          is_remote: isRemote,
          work_type: workType,
          salary: listing.salary || null,
          salary_min:
            typeof listing.salary_min === "number"
              ? Math.round(listing.salary_min)
              : null,
          salary_max:
            typeof listing.salary_max === "number"
              ? Math.round(listing.salary_max)
              : null,
          currency: listing.currency || "SEK",
          description: listing.description || null,
          tech_stack: Array.isArray(listing.tech_stack)
            ? listing.tech_stack
            : [],
          match_score:
            typeof listing.match_score === "number"
              ? listing.match_score
              : null,
          url: jobUrl,
          source_url: listing.source_url || jobUrl,
          dedup_hash: listing.dedup_hash,
          posted_at: listing.posted_at || null,
          scraped_at: new Date().toISOString(),
        };
      });

      const { error: upsertError } = await supabase
        .from("job_vault")
        .upsert(rowsToUpsert, { onConflict: "user_id,dedup_hash" });

      if (upsertError) {
        console.error(
          "[Scrape-Jobs] Upsert error into job_vault:",
          upsertError,
        );
        throw upsertError;
      }
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
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Scrape error:", error);
    return Response.json(
      {
        error: "scrape_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
