/**
 * hooks/useEdgeScraper.ts
 * OpusHunter — Edge Scraper Hook
 *
 * 2026-07-14 — FIXED: replaced window.alert()/Alert.alert() with real
 * result state the caller renders in a themed modal
 * (components/ui/ScrapeResultModal.tsx). A native browser alert box has
 * no place in a polished cross-platform product — wrong font, wrong
 * colors, no dark mode, blocks the JS thread on web, and looks completely
 * different again on native. This hook's job is now just: do the fetch,
 * sanitize the payload, expose what happened. Rendering it is the
 * caller's job, once, in one real component.
 *
 * Circular-JSON payload sanitization (unchanged): a <TouchableOpacity
 * onPress={triggerScrape}> passes a React SyntheticEvent as the first
 * arg — trying to JSON.stringify that crashes on circular refs (FiberNode
 * etc). Detected and discarded before it reaches the request body.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export interface ScrapeRuleSummary {
    rule: string;
    fetched: number;
    new: number;
    filtered_by_distance?: number;
    key_source?: string;
}

export interface ScrapeResult {
    ok: boolean;
    title: string;
    message: string;
    count?: number;
    summary?: ScrapeRuleSummary[];
}

export function useEdgeScraper() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ScrapeResult | null>(null);
    const qc = useQueryClient();

    const dismissResult = useCallback(() => setResult(null), []);

    const triggerScrape = useCallback(async (payload?: any) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated. Please log in again.');

            // Discard anything that looks like a React event rather than a
            // real payload — see file header.
            let safePayload = {};
            if (
                payload &&
                typeof payload === 'object' &&
                !('nativeEvent' in payload) &&
                !('preventDefault' in payload) &&
                !('_dispatchInstances' in payload) &&
                !('_targetInst' in payload) &&
                !(typeof payload.type === 'string' && 'target' in payload)
            ) {
                safePayload = payload;
            }

            const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/scrape-jobs`;
            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(safePayload),
            });

            const body = await res.json();
            if (!res.ok) {
                throw new Error(body.error || body.detail || `HTTP Error ${res.status}`);
            }

            await qc.invalidateQueries({ queryKey: ['pending_jobs'] });
            await qc.invalidateQueries({ queryKey: ['all_jobs'] });
            await qc.invalidateQueries({ queryKey: ['pipeline_metrics'] });

            setResult({
                ok: true,
                title: 'Scrape Complete',
                message: body.message || `Found ${body.count ?? 0} new jobs.`,
                count: body.count,
                summary: body.summary,
            });
        } catch (err: any) {
            console.error('[useEdgeScraper] Failed:', err.message);
            const message = err.message === 'Failed to fetch'
                ? 'Network error — check your connection and try again.'
                : err.message;
            setResult({ ok: false, title: 'Scrape Failed', message });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, qc]);

    return { triggerScrape, isLoading, result, dismissResult };
}