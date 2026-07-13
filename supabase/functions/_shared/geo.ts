/**
 * supabase/functions/_shared/geo.ts
 * Great-circle distance (Haversine), Deno-side. Mirrors lib/distance.ts's
 * formula — kept as a separate file on purpose: edge functions deploy
 * independently of the Expo app and can't import from its lib/ directory.
 * If you change the formula, change it in both places.
 */

const EARTH_RADIUS_KM = 6371;
const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

/**
 * Converts degrees to radians.
 */
function toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two coordinates using Haversine formula.
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export function distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return (
        EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
}

/**
 * Determines if a job location is within commute distance.
 * Remote jobs always pass; onsite/hybrid jobs pass if within maxDistanceKm,
 * or if either coordinate is unknown (can't verify, so don't silently drop).
 * @param isRemote - Whether the job is remote
 * @param originLat - User's latitude in degrees
 * @param originLon - User's longitude in degrees
 * @param jobLat - Job's latitude in degrees
 * @param jobLon - Job's longitude in degrees
 * @param maxDistanceKm - Maximum acceptable commute distance in kilometers
 * @returns True if the job should be kept based on distance criteria
 */
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
    if (
        originLat == null ||
        originLon == null ||
        jobLat == null ||
        jobLon == null
    ) {
        return true;
    }
    return distanceKm(originLat, originLon, jobLat, jobLon) <= maxDistanceKm;
}

/**
 * Converts kilometers to miles.
 * @param km - Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
    return km * KM_TO_MILES;
}

/**
 * Converts miles to kilometers.
 * @param miles - Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
    return miles * MILES_TO_KM;
}
