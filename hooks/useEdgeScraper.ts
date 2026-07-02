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
                };
            }

            // Otherwise read the user's active automation rules
            const { data: rules, error } = await supabase
                .from('automation_rules')
                .select('keywords, location, work_types')
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

            return {
                keywords: allKeywords,
                location: primaryLocation,
                work_types: allWorkTypes,
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
                // Supabase wraps edge function errors — extract the message
                const message =
                    (error as unknown as { context?: { message?: string } })?.context?.message ??
                    error.message ??
                    'Edge function invocation failed.';
                throw new Error(message);
            }

            if (!data) throw new Error('No data returned from scrape-jobs function.');

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