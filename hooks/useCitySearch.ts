/**
 * hooks/useCitySearch.ts
 * OpusHunter — Worldwide City Search + Geolocation Default
 * 2026-07-03 — NEW
 *
 * Cross-platform: `expo-location` (already a dependency — ~56.0.18) wraps
 * the browser Geolocation API on web and native location services on
 * iOS/Android with one call, so `requestNearby()` works identically on
 * all three targets. Permission is asked for explicitly and the person can
 * decline — search-by-typing (`search(query)`) works with zero permissions
 * either way.
 */

import { useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export interface CityResult {
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

export interface UseCitySearchReturn {
    results: CityResult[];
    loading: boolean;
    error: string | null;
    /** Debounced (350ms) name-prefix search — call on every keystroke. */
    search: (query: string) => void;
    /** Asks for location permission, then returns nearby cities biggest-first.
     *  Returns [] (not throw) if permission is denied — callers should just
     *  leave the input empty in that case, not show an error. */
    requestNearby: () => Promise<CityResult[]>;
    permissionDenied: boolean;
}

const DEBOUNCE_MS = 350;

export function useCitySearch(): UseCitySearchReturn {
    const [results, setResults] = useState<CityResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestSeq = useRef(0);

    const runQuery = useCallback(async (params: URLSearchParams) => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error: fnError } = await supabase.functions.invoke(
                `search-cities?${params.toString()}`,
                { method: 'GET' as any },
            );
            if (seq !== requestSeq.current) return []; // a newer keystroke superseded this one
            if (fnError) throw new Error(fnError.message);
            const list: CityResult[] = data?.results ?? [];
            setResults(list);
            return list;
        } catch (e) {
            if (seq !== requestSeq.current) return [];
            setError(e instanceof Error ? e.message : 'City search failed.');
            setResults([]);
            return [];
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, []);

    const search = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(() => {
            runQuery(new URLSearchParams({ q: trimmed }));
        }, DEBOUNCE_MS);
    }, [runQuery]);

    const requestNearby = useCallback(async (): Promise<CityResult[]> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setPermissionDenied(true);
                return [];
            }
            setPermissionDenied(false);
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            return await runQuery(
                new URLSearchParams({
                    lat: String(position.coords.latitude),
                    lon: String(position.coords.longitude),
                }),
            );
        } catch {
            // Location services off, web permission dismissed without a
            // clear grant/deny, etc — treat the same as "declined": no
            // error banner, caller just leaves the field empty.
            setPermissionDenied(true);
            return [];
        }
    }, [runQuery]);

    return { results, loading, error, search, requestNearby, permissionDenied };
}