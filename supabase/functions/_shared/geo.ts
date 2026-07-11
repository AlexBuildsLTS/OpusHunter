/**
 * supabase/functions/_shared/geo.ts
 * Great-circle distance (Haversine), Deno-side. Mirrors lib/distance.ts's
 * formula — kept as a separate file on purpose: edge functions deploy
 * independently of the Expo app and can't import from its lib/ directory.
 * If you change the formula, change it in both places.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True when a job should be kept: remote jobs always pass; onsite/hybrid jobs
 *  pass if within maxDistanceKm, or if either coordinate is unknown (can't
 *  verify, so don't silently drop a possibly-good match). */
export function withinCommuteDistance(
    isRemote: boolean,
    originLat: number | null,
    originLon: number | null,
    jobLat: number | null,
    jobLon: number | null,
    maxDistanceKm: number | null,
): boolean {
    if (isRemote) return true;
    if (maxDistanceKm == null) return true;
    if (originLat == null || originLon == null || jobLat == null || jobLon == null) return true;
    return distanceKm(originLat, originLon, jobLat, jobLon) <= maxDistanceKm;
}