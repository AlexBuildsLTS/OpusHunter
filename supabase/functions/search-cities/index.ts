/**
 * supabase/functions/search-cities/index.ts
 * OpusHunter — Worldwide City Search
 * 2026-07-03 — NEW
 *
 * WHY THIS EXISTS: SetupWizard/Configure's location step was a hardcoded
 * 14-city chip list ("London, New York, Berlin..."). That's not worldwide,
 * it's a demo. This proxies to GeoDB Cities API (RapidAPI — verified real,
 * live endpoints, not guessed) for two things:
 *   1. `?q=` — name-prefix autocomplete against every city on Wikidata,
 *      not a fixed list.
 *   2. `?lat=&lon=` — nearest populated places to a coordinate, used to
 *      default the location step to where the person actually is (see
 *      hooks/useCitySearch.ts's `searchNearby`, called after the client
 *      gets permission via expo-location).
 *
 * Uses the SAME BYOK → pool → env RapidAPI key cascade as scrape-jobs, via
 * the existing _shared/keyResolver.ts — no new key-management pattern
 * introduced, no new secret to configure beyond what RAPIDAPI_KEY already
 * covers.
 *
 * Verified endpoints (GeoDB Cities API, https://wft-geo-db.p.rapidapi.com):
 *   GET /v1/geo/cities?namePrefix={q}&limit=10&sort=-population
 *   GET /v1/geo/locations/{lat}{lon}/nearbyPlaces?radius=50&distanceUnit=KM&limit=8&sort=-population
 *     (lat/lon are concatenated with their sign as the separator, e.g.
 *     "40.7128-74.0060" or "59.3293+18.0686" — this is GeoDB's actual path
 *     format, not a made-up convention.)
 */
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKey, markKeyUsed } from '../_shared/keyResolver.ts';
import { verifyUser } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEODB_HOST = 'wft-geo-db.p.rapidapi.com';

interface CityResult {
    id: number;
    city: string;
    region: string | null;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    population: number | null;
}

function mapGeoDbCity(raw: any): CityResult {
    return {
        id: raw.id,
        city: raw.city ?? raw.name,
        region: raw.region ?? null,
        country: raw.country,
        countryCode: raw.countryCode,
        latitude: raw.latitude,
        longitude: raw.longitude,
        population: raw.population ?? null,
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

        const resolved = await resolveKey(admin, user.id, 'rapidapi');
        if (!resolved) {
            return new Response(
                JSON.stringify({ error: 'No RapidAPI key available (BYOK/pool/env all empty).' }),
                { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
            );
        }

        const geoUrl = q
            ? `https://${GEODB_HOST}/v1/geo/cities?namePrefix=${encodeURIComponent(q)}&limit=10&sort=-population&minPopulation=1000`
            : `https://${GEODB_HOST}/v1/geo/locations/${signedCoord(Number(lat))}${signedCoord(Number(lon))}/nearbyPlaces?radius=75&distanceUnit=KM&limit=8&sort=-population`;

        const geoRes = await fetch(geoUrl, {
            headers: { 'x-rapidapi-key': resolved.key, 'x-rapidapi-host': GEODB_HOST },
        });

        if (!geoRes.ok) {
            const body = await geoRes.text();
            return new Response(
                JSON.stringify({ error: `GeoDB returned ${geoRes.status}`, detail: body.slice(0, 300) }),
                { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
            );
        }

        const json = await geoRes.json();
        await markKeyUsed(admin, resolved);

        const results: CityResult[] = (json.data ?? []).map(mapGeoDbCity);

        return new Response(JSON.stringify({ results, source: resolved.source }), {
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