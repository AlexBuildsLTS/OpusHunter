/**
 * supabase/functions/geo-autocomplete/index.ts
 * OpusHunter — GeoDB Cities Proxy (Refined).
 * Hardcoded Swedish cities for instant priority. Proxies GeoDB API for global results.
 * Merges and deduplicates results. Graceful degradation if GeoDB is unavailable.
 */

import { corsHeaders } from "../_shared/cors.ts";

// Hardcoded Swedish cities for instant priority (matches lib/constants/swedishCities.ts)
const SWEDISH_CITIES = [
  { name: "Stockholm", country: "Sweden", countryCode: "SE", latitude: 59.3293, longitude: 18.0686 },
  { name: "Göteborg", country: "Sweden", countryCode: "SE", latitude: 57.7089, longitude: 11.9746 },
  { name: "Malmö", country: "Sweden", countryCode: "SE", latitude: 55.6050, longitude: 13.0038 },
  { name: "Uppsala", country: "Sweden", countryCode: "SE", latitude: 59.8586, longitude: 17.6389 },
  { name: "Västerås", country: "Sweden", countryCode: "SE", latitude: 59.6099, longitude: 16.5448 },
  { name: "Örebro", country: "Sweden", countryCode: "SE", latitude: 59.2741, longitude: 15.2066 },
  { name: "Linköping", country: "Sweden", countryCode: "SE", latitude: 58.4108, longitude: 15.6214 },
  { name: "Helsingborg", country: "Sweden", countryCode: "SE", latitude: 56.0465, longitude: 12.6945 },
  { name: "Jönköping", country: "Sweden", countryCode: "SE", latitude: 57.7826, longitude: 14.1618 },
  { name: "Norrköping", country: "Sweden", countryCode: "SE", latitude: 58.5877, longitude: 16.1924 },
];

// GeoDB API configuration
const GEODB_HOST = "wft-geo-db.p.rapidapi.com";
const GEODB_API_KEY = Deno.env.get("GEODB_API_KEY");

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, countryCode } = await req.json();

    // Basic validation
    if (!query || query.length < 2) {
      return Response.json({ cities: [] }, { headers: corsHeaders });
    }

    // 1. Hardcoded Swedish priority (if query matches or country is SE)
    const swedishMatches = SWEDISH_CITIES.filter(
      (city) =>
        city.name.toLowerCase().startsWith(query.toLowerCase()) &&
        (!countryCode || countryCode.toUpperCase() === "SE")
    );

    // 2. Fetch from GeoDB (if API key available)
    let geodbResults: any[] = [];
    if (GEODB_API_KEY) {
      const url = new URL(`https://${GEODB_HOST}/v1/geo/cities`);
      url.searchParams.set("namePrefix", query);
      url.searchParams.set("limit", "10");
      url.searchParams.set("sort", "-population");

      // If specific country requested (and not SE), filter by it. Otherwise, prioritize EU.
      if (countryCode && countryCode !== "SE") {
        url.searchParams.set("countryIds", countryCode.toUpperCase());
      } else {
        url.searchParams.set("countryIds", "SE,NO,DK,FI,DE,GB,NL,FR,ES,IT,PL");
      }

      try {
        const response = await fetch(url.toString(), {
          headers: {
            "X-RapidAPI-Key": GEODB_API_KEY,
            "X-RapidAPI-Host": GEODB_HOST,
          },
        });

        if (response.ok) {
          const data = await response.json();
          geodbResults = (data.data || []).map((city: any) => ({
            name: city.name,
            country: city.country,
            countryCode: city.countryCode,
            latitude: city.latitude,
            longitude: city.longitude,
          }));
        }
      } catch (e) {
        console.error("GeoDB fetch failed:", e);
        // Graceful fallback: return Swedish cities only
      }
    }

    // 3. Merge (Swedish first, then GeoDB results, deduplicated)
    const seen = new Set<string>();
    const mergedCities = [...swedishMatches, ...geodbResults].filter((city) => {
      if (seen.has(city.name)) return false;
      seen.add(city.name);
      return true;
    });

    return Response.json(
      { cities: mergedCities.slice(0, 10) },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Geo autocomplete error:", error);
    return Response.json(
      { error: "geo_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
});



