/**
 * hooks/useEdgeScraper.ts
 * OpusHunter — Edge Scraper Hook
 * 2026-07-10 — Production Hardened: Circular JSON Crash Prevention & Explicit UI Alerts
 */

import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function useEdgeScraper() {
    const [isLoading, setIsLoading] = useState(false);
    const qc = useQueryClient();

    // We type payload as `any` because React Native might inject a Synthetic Event here.
    const triggerScrape = async (payload?: any) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated. Please log in again.');

            // ── CRITICAL FIX: The Circular JSON Crash ──
            // If a button calls <TouchableOpacity onPress={triggerScrape}>, the `payload` 
            // becomes a React Event object (which contains massive circular references like FiberNode).
            // We must sanitize it so we only pass plain objects to JSON.stringify.
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
                body: JSON.stringify(safePayload)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || result.detail || `HTTP Error ${res.status}`);
            }

            // Invalidate dashboard queries so the UI updates instantly
            await qc.invalidateQueries({ queryKey: ['pending_jobs'] });
            await qc.invalidateQueries({ queryKey: ['pipeline_metrics'] });

            // Explicit UI Feedback
            const msg = result.message || `Found ${result.count ?? 0} new jobs.`;
            if (Platform.OS === 'web') {
                window.alert(`✅ Scrape Complete\n\n${msg}`);
            } else {
                Alert.alert('Scrape Complete', msg);
            }

        } catch (err: any) {
            console.error('[useEdgeScraper] Failed:', err.message);

            const errorMsg = err.message === 'Failed to fetch'
                ? 'Network error. Ensure Supabase is running locally and EXPO_PUBLIC_SUPABASE_URL is correct.'
                : err.message;

            if (Platform.OS === 'web') {
                window.alert(`❌ Scraping Failed\n\n${errorMsg}`);
            } else {
                Alert.alert('Scraping Failed', errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return { triggerScrape, isLoading };
}