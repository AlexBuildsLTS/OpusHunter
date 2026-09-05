import {
  getCandidateKeys,
  handle429,
  logUsage,
  markKeyUsed,
} from "../../_shared/keyResolver.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdzunaScrapeParams {
  keywords?: string[];
  cities?: string[];
  countries?: string[];
  radiusKm?: number;
  adzunaAppId?: string;
  page?: number;
}

export interface AdzunaNormalizedJob {
  title: string;
  company: string;
  location: string;
  country_code: string;
  description: string;
  url: string;
  posted_at?: string;
  work_type?: string;
  is_remote?: boolean;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  source: "adzuna";
  external_job_id?: string;
  source_url?: string;
}

const PAGES_PER_SCRAPE = 3;
const SUPPORTED_COUNTRIES = new Set([
  "se", "gb", "us", "at", "au", "be", "br", "ca", "de", "es", "fr",
  "in", "it", "mx", "nl", "nz", "pl", "ru", "sg", "za",
]);
const COUNTRY_ALIASES: Record<string, string> = {
  sweden: "se", unitedkingdom: "gb", uk: "gb", england: "gb",
  austria: "at", belgium: "be", brazil: "br", canada: "ca",
  germany: "de", spain: "es", france: "fr", india: "in", italy: "it",
  mexico: "mx", netherlands: "nl", newzealand: "nz", poland: "pl",
  russia: "ru", singapore: "sg", southafrica: "za",
};

export async function scrapeAdzuna(
  supabase: SupabaseClient,
  params: AdzunaScrapeParams,
  userId: string,
): Promise<AdzunaNormalizedJob[]> {
  const candidateKeys = await getCandidateKeys(supabase, userId, "adzuna");
  if (candidateKeys.length === 0) return [];

  const rawCountry = (params.countries?.[0] || "se")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const country = COUNTRY_ALIASES[rawCountry] ||
    (SUPPORTED_COUNTRIES.has(rawCountry) ? rawCountry : undefined);
  if (!country) {
    console.log(`[Adzuna] Country '${rawCountry}' is not supported.`);
    return [];
  }

  const locationName = params.cities?.[0] || "Stockholm";
  const whatQuery =
    params.keywords?.filter((keyword) => keyword.trim()).slice(0, 2).join(" ") ||
    "software developer";

  for (const keyObj of candidateKeys) {
    try {
      const [configuredAppId, configuredAppKey] = keyObj.key.includes(":")
        ? keyObj.key.split(":", 2)
        : [params.adzunaAppId || Deno.env.get("ADZUNA_APP_ID") || "opushunter", keyObj.key];
      const results: Array<Record<string, unknown>> = [];
      const startPage = params.page && params.page > 0 ? params.page : 1;

      for (let page = startPage; page < startPage + PAGES_PER_SCRAPE; page++) {
        const query = new URLSearchParams({
          app_id: configuredAppId,
          app_key: configuredAppKey,
          results_per_page: "25",
          what: whatQuery,
          where: locationName,
        });
        if (params.radiusKm) query.set("distance", String(params.radiusKm));

        const response = await fetch(
          `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${query}`,
        );
        if (response.status === 429) {
          await handle429(supabase, keyObj.keyId);
          break;
        }
        if (!response.ok) {
          console.warn(`[Adzuna] HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
          break;
        }
        const data = (await response.json()) as {
          results?: Array<Record<string, unknown>>;
        };
        const pageResults = data.results || [];
        results.push(...pageResults);
        if (pageResults.length < 25) break;
      }

      if (results.length === 0) continue;
      await markKeyUsed(supabase, keyObj);
      await logUsage(supabase, userId, "adzuna", keyObj.source, true, 0, "scrape-jobs/adzuna");

      return results.map((raw) => {
        const company = raw.company as { display_name?: string } | undefined;
        const location = raw.location as { display_name?: string } | undefined;
        const clean = (value: unknown) =>
          typeof value === "string" ? value.replace(/<\/?[^>]+(>|$)/g, "") : "";
        const url = String(raw.redirect_url || "");
        return {
          title: clean(raw.title) || "Untitled Role",
          company: company?.display_name || "Unknown Company",
          location: location?.display_name || locationName,
          country_code: country.toUpperCase(),
          description: clean(raw.description),
          url,
          posted_at: String(raw.created || new Date().toISOString()),
          work_type: "onsite",
          is_remote: false,
          salary_min: typeof raw.salary_min === "number" ? raw.salary_min : undefined,
          salary_max: typeof raw.salary_max === "number" ? raw.salary_max : undefined,
          currency: "EUR",
          source: "adzuna" as const,
          external_job_id: raw.id ? String(raw.id) : undefined,
          source_url: url,
        };
      });
    } catch (error) {
      console.warn("[Adzuna] Fetch error:", error);
    }
  }
  return [];
}
