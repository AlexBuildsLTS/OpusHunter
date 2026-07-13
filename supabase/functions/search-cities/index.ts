/**
 * supabase/functions/search-cities/index.ts
 * OpusHunter — Worldwide Location Search (cities + countries)
 * 2026-07-03 — NEW
 * 2026-07-04 — Upgraded to retry across the full resolved key pool on 429.
 * 2026-07-04 (later) — Now also searches countries in parallel, not just
 * cities. Real gap: someone whose rule is "Any" work-mode (remote OR
 * hybrid OR onsite) often wants to target a whole country ("Sweden"), not
 * commit to one city — the old cities-only search made that impossible.
 * Results are tagged `type: 'city' | 'country'` so the client can render
 * them distinctly (see components/features/configure/LocationAutocomplete.tsx).
 *
 * WHY THIS EXISTS: SetupWizard/Configure's location step was a hardcoded
 * 14-city chip list ("London, New York, Berlin..."). That's not worldwide,
 * it's a demo. This proxies to GeoDB Cities API (RapidAPI — verified real,
 * live endpoints, not guessed):
 *   1. `?q=` — name-prefix search against cities AND countries.
 *   2. `?lat=&lon=` — nearest populated places to a coordinate, used to
 *      default the location step to where the person actually is.
 *
 * Uses the SAME BYOK → pool → env RapidAPI key cascade as scrape-jobs, via
 * the existing _shared/keyResolver.ts.
 *
 * Verified endpoints (GeoDB Cities API, https://wft-geo-db.p.rapidapi.com):
 *   GET /v1/geo/cities?namePrefix={q}&limit=10&sort=-population
 *   GET /v1/geo/countries?namePrefix={q}&limit=5
 *   GET /v1/geo/locations/{lat}{lon}/nearbyPlaces?radius=50&distanceUnit=KM&limit=8&sort=-population
 */
import { serve } from 'std/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKeyPool, markKeyUsed } from '../_shared/keyResolver.ts';
import { verifyUser } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEODB_HOST = 'wft-geo-db.p.rapidapi.com';
const FETCH_TIMEOUT_MS = 10000;
const CITIES_LIMIT = 8;
const COUNTRIES_LIMIT = 5;
const NEARBY_LIMIT = 8;
const NEARBY_RADIUS_KM = 75;
const MIN_POPULATION = 1000;
const COORD_DIGITS = 4;

interface RawGeoDbCity {
	id: number;
	city?: string;
	name?: string;
	region?: string | null;
	country: string;
	countryCode: string;
	latitude: number | null;
	longitude: number | null;
	population?: number | null;
}

interface RawGeoDbCountry {
	wikiDataId?: string | number;
	code: string;
	name: string;
}

interface GeoDbResponse<T> {
	data?: T[];
}

interface CityResult {
    id: number;
    type: 'city' | 'country';
    city: string;
    region: string | null;
    country: string;
    countryCode: string;
    latitude: number | null;
    longitude: number | null;
    population: number | null;
}

function mapGeoDbCity(raw: any): CityResult {
    return {
        id: raw.id,
        type: 'city',
        city: raw.city ?? raw.name,
        region: raw.region ?? null,
        country: raw.country,
        countryCode: raw.countryCode,
        latitude: raw.latitude,
        longitude: raw.longitude,
        population: raw.population ?? null,
    };
}

function mapGeoDbCountry(raw: any): CityResult {
    return {
        id: raw.wikiDataId ? Number(String(raw.wikiDataId).replace(/\D/g, '')) || raw.code : raw.code,
        type: 'country',
        city: raw.name,          // the "city" field doubles as the display name for countries too
        region: null,
        country: raw.name,
        countryCode: raw.code,
        latitude: null,
        longitude: null,
        population: null,
    };
}

function signedCoord(n: number, digits = 4): string {
    const fixed = n.toFixed(digits);
    return n >= 0 ? `+${fixed}` : fixed; // negative already carries its '-'
}

serve(async (req: Request) => {
    const cors = getCorsHeaders();
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const admin = createAdminClient();
        const user = await verifyUser(req);

        const url = new URL(req.url);
        const q = url.searchParams.get('q')?.trim();
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');

        if (!q && !(lat && lon)) {
            return new Response(JSON.stringify({ error: 'Provide either ?q= or ?lat=&lon=' }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        const keyPool = await resolveKeyPool(admin, user.id, 'rapidapi');
        if (keyPool.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No RapidAPI key available (BYOK/pool/env all empty).' }),
                { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
            );
        }

        async function fetchWithPool(url: string): Promise<{ res: Response; usedKey: typeof keyPool[number] } | null> {
            let lastError = '';
            for (const resolved of keyPool) {
                const res = await fetch(url, {
                    headers: { 'x-rapidapi-key': resolved.key, 'x-rapidapi-host': GEODB_HOST },
                });
                if (res.status === 429) {
                    lastError = `429 rate-limited (${resolved.source} key)`;
                    continue;
                }
                return { res, usedKey: resolved };
            }
            console.error(`search-cities: all keys exhausted — ${lastError}`);
            return null;
        }

        if (q) {
            // Text search: cities + countries in parallel — someone with an
            // "Any" work-mode rule often wants a whole country ("Sweden"),
            // not forced into picking one city.
            const citiesUrl = `https://${GEODB_HOST}/v1/geo/cities?namePrefix=${encodeURIComponent(q)}&limit=8&sort=-population&minPopulation=1000`;
            const countriesUrl = `https://${GEODB_HOST}/v1/geo/countries?namePrefix=${encodeURIComponent(q)}&limit=5`;

            const [citiesOutcome, countriesOutcome] = await Promise.all([
                fetchWithPool(citiesUrl),
                fetchWithPool(countriesUrl),
            ]);

            if (!citiesOutcome && !countriesOutcome) {
                return new Response(
                    JSON.stringify({ error: `All ${keyPool.length} RapidAPI keys rate-limited.` }),
                    { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
                );
            }

            const results: CityResult[] = [];
            let source = 'env';

            if (countriesOutcome?.res.ok) {
                const json = await countriesOutcome.res.json();
                results.push(...(json.data ?? []).map(mapGeoDbCountry));
                await markKeyUsed(admin, countriesOutcome.usedKey);
                source = countriesOutcome.usedKey.source;
            }
            if (citiesOutcome?.res.ok) {
                const json = await citiesOutcome.res.json();
                results.push(...(json.data ?? []).map(mapGeoDbCity));
                await markKeyUsed(admin, citiesOutcome.usedKey);
                source = citiesOutcome.usedKey.source;
            }

            // Countries first (broader match), then cities by population.
            return new Response(JSON.stringify({ results, source }), {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        // Nearby-by-coordinates path (geolocation default) — cities only,
        // a "nearby country" doesn't make sense the way "nearby city" does.
        const nearbyUrl = `https://${GEODB_HOST}/v1/geo/locations/${signedCoord(Number(lat))}${signedCoord(Number(lon))}/nearbyPlaces?radius=75&distanceUnit=KM&limit=8&sort=-population`;
        const outcome = await fetchWithPool(nearbyUrl);

        if (!outcome) {
            return new Response(
                JSON.stringify({ error: `All ${keyPool.length} RapidAPI keys rate-limited.` }),
                { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
            );
        }
        if (!outcome.res.ok) {
            const body = await outcome.res.text();
            return new Response(
                JSON.stringify({ error: `GeoDB returned ${outcome.res.status}`, detail: body.slice(0, 300) }),
                { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
            );
        }

        const json = await outcome.res.json();
        await markKeyUsed(admin, outcome.usedKey);
        const results: CityResult[] = (json.data ?? []).map(mapGeoDbCity);

        return new Response(JSON.stringify({ results, source: outcome.usedKey.source }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error.';
        return new Response(JSON.stringify({ error: message }), {
            status: 401,
            headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
    }
});