/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Multi-Source Job Scraper & Engine
 * Sources: JobTech (Sweden), The Hub (Nordics), JSearch, Adzuna, and LinkedIn.
 *
 * FIX (this revision): JSearch, Adzuna, and LinkedIn all requested a fixed
 * "page 1" of results with no way to advance — nothing in the app ever
 * incremented params.page between scrapes. Combined with the (correct)
 * dedup_hash upsert logic, that meant every scrape after the first re-fetched
 * and re-upserted the exact same top listings: net zero new jobs no matter
 * how many times the user scraped. Each of the three adapters below now
 * pulls several pages per scrape call so there's genuinely new material each
 * time, instead of the same page repeating.
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
import { scrapeJobTechSweden } from "../scrape-jobs/adapters/jobtech.ts";
import { scrapeTheHub } from "../scrape-jobs/adapters/thehub.ts";
import { scrapeAdzuna } from "../scrape-jobs/adapters/adzuna.ts";

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
    thehub?: boolean;
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

const VALID_SOURCES = new Set([
  "jsearch",
  "adzuna",
  "linkedin",
  "jobtech",
  "thehub",
  "indeed",
  "custom",
]);

function normalizeSource(source: string | null | undefined) {
  const normalized = String(source || "")
    .trim()
    .toLowerCase();
  return VALID_SOURCES.has(normalized) ? normalized : "custom";
}

function cleanExternalId(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 240);
  return normalized || undefined;
}

// Number of pages each paginated source pulls per single scrape click.
// Keep this modest — it multiplies the number of upstream API calls (and,
// for metered providers, the billed usage) per scrape.
const PAGES_PER_SCRAPE = 3;

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

  const startPage = params.page && params.page > 0 ? params.page : 1;

  for (const keyObj of candidateKeys) {
    try {
      const allItems: Array<Record<string, unknown>> = [];

      for (let page = startPage; page < startPage + PAGES_PER_SCRAPE; page++) {
        const queryParams = new URLSearchParams({
          query: `${queryTerms} in ${primaryCity}, ${primaryCountry}`,
          page: page.toString(),
          num_pages: "1",
          date_posted: jSearchDatePosted,
        });

        if (params.latitude && params.longitude) {
          queryParams.set("geo", `${params.latitude},${params.longitude}`);
          if (params.radiusKm)
            queryParams.set("radius", params.radiusKm.toString());
        }

        console.log(
          `[JSearch] Querying JSearch via RapidAPI (key source: ${keyObj.source}, page: ${page})`,
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
          break; // stop paging on this key, try the next key
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          console.warn(
            `[JSearch] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
          );
          break;
        }

        const data = await response.json();
        const pageItems = (data.data || []) as Array<Record<string, unknown>>;
        console.log(`[JSearch] Page ${page}: fetched ${pageItems.length} jobs`);

        if (pageItems.length === 0) break; // no more pages available
        allItems.push(...pageItems);
      }

      if (allItems.length > 0) {
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

        console.log(
          `[JSearch] Successfully fetched ${allItems.length} jobs total across pages`,
        );
        return allItems.map((raw) => {
          const jobUrl = String(
            raw.job_apply_link || raw.job_google_link || "",
          );
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
      }
    } catch (err) {
      console.warn("[JSearch] Fetch error with key:", err);
    }
  }

  return [];
}

// ── 2. LinkedIn Adapter (RapidAPI Wrapper) ──────────────────────
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
  if (linkedInKeys.length === 0) return [];

  const startPage = params.page && params.page > 0 ? params.page : 1;

  for (const keyObj of linkedInKeys) {
    try {
      const allItems: Array<Record<string, unknown>> = [];

      for (let page = startPage; page < startPage + PAGES_PER_SCRAPE; page++) {
        console.log(
          `[LinkedIn] Querying linkedinscraperapi.com with key source: ${keyObj.source}, page: ${page}`,
        );
        const searchUrl = new URL(
          "https://api.linkedinscraperapi.com/api/v1/linkedin/search",
        );

        searchUrl.searchParams.set("keywords", queryStr);
        searchUrl.searchParams.set("location", locationStr);
        searchUrl.searchParams.set("api_key", keyObj.key);
        searchUrl.searchParams.set("page", page.toString());
        if (params.datePosted && params.datePosted !== "all")
          searchUrl.searchParams.set("time_range", params.datePosted);

        const response = await fetch(searchUrl.toString());

        if (response.status === 429) {
          console.warn("[LinkedIn] 429 Rate limited");
          await handle429(supabase, keyObj.keyId);
          break; // stop paging on this key, try the next key
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          console.warn(
            `[LinkedIn] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
          );
          break;
        }

        const data = (await response.json()) as
          Record<string, unknown> | Array<Record<string, unknown>>;

        const pageItems: Array<Record<string, unknown>> = Array.isArray(data)
          ? data
          : ((data.jobs || data.data || data.results || []) as Array<
              Record<string, unknown>
            >);

        console.log(
          `[LinkedIn] Page ${page}: fetched ${pageItems.length} jobs`,
        );

        if (pageItems.length === 0) break; // no more pages available
        allItems.push(...pageItems);
      }

      if (allItems.length > 0) {
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

        console.log(
          `[LinkedIn] Successfully fetched ${allItems.length} jobs total across pages`,
        );

        return allItems.map((raw) => {
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
      console.warn("[LinkedIn] Fetch error with key:", err);
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
    const userId = jwtUser?.userId;
    const searchParams: ScrapeParams = body.searchParams || body.filters || {};

    if (!userId) {
      return Response.json(
        {
          error: "unauthorized",
          message:
            "Could not determine user session. Please ensure you are logged in.",
        },
        { status: 401, headers: corsHeaders },
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

    // Explicitly check for UI toggles, defaulting to true if absent.
    const enabled = searchParams.enableSources || {
      jsearch: true,
      adzuna: true,
      linkedin: true,
      jobtech: true,
      thehub: true,
    };

    const keywordQuery = (searchParams.keywords || [])
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .join(" ");

    if (!keywordQuery) {
      return Response.json(
        {
          error: "missing_search_keywords",
          message:
            "Configure at least one target role or professional title before scraping jobs.",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // 2. Run scrapers in parallel
    const scrapePromises: Promise<NormalizedJob[]>[] = [];
    const country = (searchParams.countries?.[0] || "").toUpperCase();
    const city = searchParams.cities?.[0] || "";

    // Toggle: JobTech (Strictly Sweden)
    if (
      (country === "SE" || country === "SWEDEN") &&
      enabled.jobtech !== false
    ) {
      scrapePromises.push(scrapeJobTechSweden(keywordQuery, city));
    }

    // Toggle: The Hub (Nordic Startups)
    if (
      [
        "SE",
        "SWEDEN",
        "DK",
        "DENMARK",
        "NO",
        "NORWAY",
        "FI",
        "FINLAND",
      ].includes(country) &&
      enabled.thehub !== false
    ) {
      scrapePromises.push(scrapeTheHub(keywordQuery, city, country));
    }

    // Toggle: JSearch
    if (enabled.jsearch !== false) {
      scrapePromises.push(fetchJSearch(searchParams, userId));
    }

    // Toggle: Adzuna
    if (enabled.adzuna !== false) {
      scrapePromises.push(scrapeAdzuna(supabase, searchParams, userId));
    }

    // Toggle: LinkedIn
    if (enabled.linkedin !== false) {
      scrapePromises.push(fetchLinkedIn(searchParams, userId));
    }

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
      const source = normalizeSource(listing.source);
      const hashInput = [
        source,
        listing.external_job_id || "",
        listing.company || "",
        listing.title || "",
        listing.location || "",
      ]
        .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
        .join("|");
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
    const maximumCap =
      userRole === "admin" ? 200 : userRole === "premium" ? 50 : 25;
    const defaultCap = userRole === "admin" ? 60 : maximumCap;

    // Members remain bounded, while admins can deliberately request larger
    // batches for a broad radar sweep without changing the default workload.
    const batchCap =
      typeof searchParams.batchSize === "number" && searchParams.batchSize > 0
        ? Math.min(searchParams.batchSize, maximumCap)
        : defaultCap;

    const { data: existingHashes, error: existingHashesError } = await supabase
      .from("job_vault")
      .select("dedup_hash")
      .eq("user_id", userId)
      .limit(5000);

    if (existingHashesError) {
      console.error(
        "[Scrape-Jobs] Could not read existing job identities:",
        existingHashesError,
      );
      throw existingHashesError;
    }

    const knownHashes = new Set(
      (existingHashes || [])
        .map((row) => row.dedup_hash)
        .filter((hash): hash is string => Boolean(hash)),
    );

    // Keep a refresh from being dominated by whichever adapter happens to
    // resolve first. New listings are interleaved by provider, then capped.
    const unseenBySource = new Map<string, typeof deduped>();
    for (const listing of deduped) {
      if (knownHashes.has(listing.dedup_hash)) continue;
      const source = normalizeSource(listing.source);
      const sourceListings = unseenBySource.get(source) || [];
      sourceListings.push(listing);
      unseenBySource.set(source, sourceListings);
    }

    const unseenListings: typeof deduped = [];
    let sourceIndex = 0;
    const sourceQueues = Array.from(unseenBySource.values());
    while (sourceQueues.some((queue) => queue.length > 0)) {
      const queue = sourceQueues[sourceIndex % sourceQueues.length];
      if (queue.length > 0) unseenListings.push(queue.shift()!);
      sourceIndex++;
    }

    const finalListings = unseenListings
      .filter(
        (listing) =>
          listing.title.trim().length > 0 &&
          listing.company.trim().length > 0 &&
          listing.url.trim().length > 0 &&
          String(listing.source_url || listing.url).trim().length > 0,
      )
      .slice(0, batchCap);

    if (finalListings.length > 0) {
      const rowsToUpsert = finalListings.map((listing) => {
        const source = normalizeSource(listing.source);

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
        const jobUrl = listing.url || listing.source_url || "";

        return {
          user_id: userId,
          source,
          external_job_id:
            cleanExternalId(listing.external_job_id) ||
            `normalized-${listing.dedup_hash}`,
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
        totalUniqueFetched: deduped.length,
        totalNew: finalListings.length,
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
