/**
 * hooks/useEdgeScraper.ts
 * OpusHunter — Job Scraping Hook
 *
 * Previously an empty file — this is the full implementation.
 *
 * Responsibilities:
 *   - Invoke the `scrape-jobs` Deno Edge Function with the user's
 *     keywords / location / work_types payload
 *   - Uses TanStack Query useMutation (not useQuery — scraping is a command,
 *     not a read; it should never run automatically on mount)
 *   - On success: invalidates the `pipeline_jobs` query so the dashboard
 *     card stack refreshes automatically
 *   - Exposes typed loading / error / success state for the UI to bind to
 *   - Reads active automation rules from Supabase so the caller doesn't
 *     need to pass anything — just call `triggerScrape()`
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapePayload {
    keywords: string[];
    location: string;
    work_types: string[];
    /** 2026-07-06 — ADDED: previously captured in the Rules form and saved
     *  to automation_rules, but never read past that point — scrape-jobs
     *  had no idea these columns existed. Now forwarded through so the
     *  scraper can actually filter on them. See scrape-jobs/index.ts. */
    experience_levels: string[];
    remote_preference: string;
    salary_min: number | null;
}

export interface ScrapeResult {
    message: string;
    count: number;
    summary?: Array<{ rule: string; fetched: number; new: number; key_source?: string }>;
    rules_processed?: number;
}

export interface UseEdgeScraperReturn {
    /** Fire the scrape. Optionally override keywords/location/work_types.
     *  If no override provided, reads from the user's active automation_rules. */
    triggerScrape: (override?: Partial<ScrapePayload>) => void;

    /** Async version — awaitable if you need to sequence after it completes. */
    triggerScrapeAsync: (override?: Partial<ScrapePayload>) => Promise<ScrapeResult>;

    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: string | null;
    lastResult: ScrapeResult | null;

    /** Reset mutation state back to idle */
    reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEdgeScraper(): UseEdgeScraperReturn {
    const queryClient = useQueryClient();

    // ── Resolve payload from automation_rules if no override given ────────────

    const resolvePayload = useCallback(
        async (override?: Partial<ScrapePayload>): Promise<ScrapePayload> => {
            // If caller passes a full override, use it directly
            if (
                override?.keywords?.length &&
                override?.location
            ) {
                return {
                    keywords: override.keywords,
                    location: override.location,
                    work_types: override.work_types ?? [],
                    experience_levels: override.experience_levels ?? [],
                    remote_preference: override.remote_preference ?? 'any',
                    salary_min: override.salary_min ?? null,
                };
            }

            // Otherwise read the user's active automation rules
            const { data: rules, error } = await supabase
                .from('automation_rules')
                .select('keywords, location, work_types, experience_levels, remote_preference, salary_min')
                .eq('is_active', true)
                .limit(10);

            if (error) throw new Error(`Failed to load automation rules: ${error.message}`);
            if (!rules || rules.length === 0) {
                throw new Error(
                    'No active search rules found. Please configure at least one keyword set before scraping.',
                );
            }

            // Merge all active rules into one payload
            // (de-duplicate keywords, take first rule's location as primary)
            const allKeywords = [...new Set(rules.flatMap((r) => r.keywords ?? []))];
            const allWorkTypes = [...new Set(rules.flatMap((r) => r.work_types ?? []))];
            const primaryLocation = override?.location ?? rules[0].location ?? 'Remote';

            // 2026-07-06 — ADDED. Merge strategy across multiple active rules
            // (documented explicitly rather than left as an implicit guess):
            //   - experience_levels: union — a job matching ANY selected level
            //     across ANY active rule should surface, consistent with how
            //     keywords are already unioned above.
            //   - remote_preference: only applied if every active rule agrees;
            //     otherwise default to 'any' rather than arbitrarily picking
            //     one rule's preference over another's.
            //   - salary_min: the LOWEST floor among rules that set one. This
            //     matches the union/OR semantics used for keywords/experience
            //     above — it's more permissive, not more restrictive, so a
            //     rule with no salary requirement isn't silently overridden
            //     by a stricter one it has nothing to do with.
            const allExperienceLevels = [...new Set(rules.flatMap((r) => r.experience_levels ?? []))];
            const remotePrefs = new Set(rules.map((r) => r.remote_preference ?? 'any'));
            const mergedRemotePreference = remotePrefs.size === 1 ? [...remotePrefs][0] : 'any';
            const salaryFloors = rules.map((r) => r.salary_min).filter((v): v is number => typeof v === 'number');
            const mergedSalaryMin = salaryFloors.length ? Math.min(...salaryFloors) : null;

            return {
                keywords: allKeywords,
                location: primaryLocation,
                work_types: allWorkTypes,
                experience_levels: allExperienceLevels,
                remote_preference: mergedRemotePreference,
                salary_min: mergedSalaryMin,
            };
        },
        [],
    );

    // ── TanStack mutation ─────────────────────────────────────────────────────

    const mutation = useMutation<ScrapeResult, Error, Partial<ScrapePayload> | undefined>({
        mutationFn: async (override) => {
            const payload = await resolvePayload(override);

            const { data, error } = await supabase.functions.invoke<ScrapeResult>('scrape-jobs', {
                body: payload,
            });

            if (error) {
                // Supabase wraps edge function HTTP errors — the real message
                // is in the response body, not error.message (which is always
                // the generic "Edge Function returned a non-2xx status code").
                let message = error.message ?? 'Edge function invocation failed.';
                try {
                    const ctx = (error as unknown as { context?: Response })?.context;
                    if (ctx && typeof ctx.json === 'function') {
                        const body = await ctx.json();
                        message = body?.error ?? body?.message ?? JSON.stringify(body) ?? message;
                    } else if (ctx && typeof ctx.text === 'function') {
                        const text = await ctx.text();
                        if (text) message = text;
                    }
                } catch {
                    // body already consumed or not parseable — fall back to error.message
                }
                throw new Error(message);
            }

            if (!data) throw new Error('No data returned from scrape-jobs function.');

            // Validate response structure
            if (typeof data !== 'object' || data === null) {
                throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
            }

            return data;
        },

        onSuccess: (data) => {
            // Invalidate the dashboard job queue so it refetches with new jobs
            queryClient.invalidateQueries({ queryKey: ['pipeline_jobs'] });
            // Also invalidate metrics — new jobs mean pending count may change
            queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });

            console.log(`[useEdgeScraper] Scrape complete: ${data.count} jobs ingested`);
        },

        onError: (error) => {
            console.error('[useEdgeScraper] Scrape failed:', error.message);
        },
    });

    // ── Public API ────────────────────────────────────────────────────────────

    const triggerScrape = useCallback(
        (override?: Partial<ScrapePayload>) => {
            mutation.mutate(override);
        },
        [mutation],
    );

    const triggerScrapeAsync = useCallback(
        async (override?: Partial<ScrapePayload>): Promise<ScrapeResult> => {
            return mutation.mutateAsync(override);
        },
        [mutation],
    );

    return {
        triggerScrape,
        triggerScrapeAsync,
        isLoading: mutation.isPending,
        isSuccess: mutation.isSuccess,
        isError: mutation.isError,
        error: mutation.error?.message ?? null,
        lastResult: mutation.data ?? null,
        reset: mutation.reset,
    };
}