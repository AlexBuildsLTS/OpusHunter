/**
 * supabase/functions/geo-autocomplete/index.ts
 * OpusHunter — GeoDB Cities Proxy (Refined).
 * Hardcoded Swedish cities for instant priority. Proxies GeoDB API for global results.
 * Merges and deduplicates results. Graceful degradation if GeoDB is unavailable.
 */

import { corsHeaders } from "../_shared/cors.ts";

// Hardcoded Swedish & Top European Tech Hubs for instant priority
const SWEDISH_CITIES = [
  {
    name: "Stockholm",
    country: "Sweden",
    countryCode: "SE",
    latitude: 59.3293,
    longitude: 18.0686,
  },
  {
    name: "Göteborg",
    country: "Sweden",
    countryCode: "SE",
    latitude: 57.7089,
    longitude: 11.9746,
  },
  {
    name: "Malmö",
    country: "Sweden",
    countryCode: "SE",
    latitude: 55.605,
    longitude: 13.0038,
  },
  {
    name: "Uppsala",
    country: "Sweden",
    countryCode: "SE",
    latitude: 59.8586,
    longitude: 17.6389,
  },
  {
    name: "Linköping",
    country: "Sweden",
    countryCode: "SE",
    latitude: 58.4108,
    longitude: 15.6214,
  },
  {
    name: "Lund",
    country: "Sweden",
    countryCode: "SE",
    latitude: 55.7047,
    longitude: 13.191,
  },
  {
    name: "Västerås",
    country: "Sweden",
    countryCode: "SE",
    latitude: 59.6099,
    longitude: 16.5448,
  },
  {
    name: "Örebro",
    country: "Sweden",
    countryCode: "SE",
    latitude: 59.2741,
    longitude: 15.2066,
  },
  {
    name: "Helsingborg",
    country: "Sweden",
    countryCode: "SE",
    latitude: 56.0465,
    longitude: 12.6945,
  },
  {
    name: "Jönköping",
    country: "Sweden",
    countryCode: "SE",
    latitude: 57.7826,
    longitude: 14.1618,
  },
  {
    name: "Norrköping",
    country: "Sweden",
    countryCode: "SE",
    latitude: 58.5877,
    longitude: 16.1924,
  },
  {
    name: "Umeå",
    country: "Sweden",
    countryCode: "SE",
    latitude: 63.8258,
    longitude: 20.263,
  },
  {
    name: "Gävle",
    country: "Sweden",
    countryCode: "SE",
    latitude: 60.6749,
    longitude: 17.1417,
  },
  {
    name: "Borås",
    country: "Sweden",
    countryCode: "SE",
    latitude: 57.721,
    longitude: 12.9401,
  },
  {
    name: "Karlstad",
    country: "Sweden",
    countryCode: "SE",
    latitude: 59.4022,
    longitude: 13.5115,
  },
  {
    name: "Växjö",
    country: "Sweden",
    countryCode: "SE",
    latitude: 56.8777,
    longitude: 14.8091,
  },
];

const EUROPEAN_HUBS = [
  {
    name: "Berlin",
    country: "Germany",
    countryCode: "DE",
    latitude: 52.52,
    longitude: 13.405,
  },
  {
    name: "Munich",
    country: "Germany",
    countryCode: "DE",
    latitude: 48.1351,
    longitude: 11.582,
  },
  {
    name: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    latitude: 52.3676,
    longitude: 4.9041,
  },
  {
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    name: "Dublin",
    country: "Ireland",
    countryCode: "IE",
    latitude: 53.3498,
    longitude: -6.2603,
  },
  {
    name: "Copenhagen",
    country: "Denmark",
    countryCode: "DK",
    latitude: 55.6761,
    longitude: 12.5683,
  },
  {
    name: "Helsinki",
    country: "Finland",
    countryCode: "FI",
    latitude: 60.1699,
    longitude: 24.9384,
  },
  {
    name: "Oslo",
    country: "Norway",
    countryCode: "NO",
    latitude: 59.9139,
    longitude: 10.7522,
  },
  {
    name: "Zurich",
    country: "Switzerland",
    countryCode: "CH",
    latitude: 47.3769,
    longitude: 8.5417,
  },
  {
    name: "Paris",
    country: "France",
    countryCode: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    name: "Tallinn",
    country: "Estonia",
    countryCode: "EE",
    latitude: 59.437,
    longitude: 24.7535,
  },
  {
    name: "Warsaw",
    country: "Poland",
    countryCode: "PL",
    latitude: 52.2297,
    longitude: 21.0122,
  },
  {
    name: "Krakow",
    country: "Poland",
    countryCode: "PL",
    latitude: 50.0647,
    longitude: 19.945,
  },
];

// GeoDB API configuration
const GEODB_HOST = "wft-geo-db.p.rapidapi.com";
const GEODB_API_KEY =
  Deno.env.get("GEODB_API_KEY") || Deno.env.get("RAPIDAPI_KEY");

interface CityItem {
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { query, countryCode } = await req.json();

    // Basic validation
    if (!query || query.length < 2) {
      return Response.json({ cities: [] }, { headers: corsHeaders });
    }

    // 1. Hardcoded Swedish & European priority
    const swedishMatches: CityItem[] = SWEDISH_CITIES.filter(
      (city) =>
        city.name.toLowerCase().startsWith(query.toLowerCase()) &&
        (!countryCode || countryCode.toUpperCase() === "SE"),
    );

    const europeanMatches: CityItem[] = EUROPEAN_HUBS.filter((city) =>
      city.name.toLowerCase().startsWith(query.toLowerCase()),
    );

    // 2. Fetch from GeoDB (if API key available)
    let geodbResults: CityItem[] = [];
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
          const data = (await response.json()) as {
            data?: Array<Record<string, unknown>>;
          };
          geodbResults = (data.data || []).map((city) => ({
            name: String(city.name || ""),
            country: String(city.country || ""),
            countryCode: String(city.countryCode || ""),
            latitude: Number(city.latitude || 0),
            longitude: Number(city.longitude || 0),
          }));
        }
      } catch (e) {
        console.error("GeoDB fetch failed:", e);
        // Graceful fallback: return Swedish cities only
      }
    }

    // 3. Merge (Swedish first, European tech hubs, then GeoDB results, deduplicated)
    const seen = new Set<string>();
    const mergedCities = [
      ...swedishMatches,
      ...europeanMatches,
      ...geodbResults,
    ].filter((city) => {
      if (seen.has(city.name)) return false;
      seen.add(city.name);
      return true;
    });

    return Response.json(
      { cities: mergedCities.slice(0, 10) },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Geo autocomplete error:", error);
    return Response.json(
      {
        error: "geo_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
