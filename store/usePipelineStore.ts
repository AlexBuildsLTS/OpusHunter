/**
 * store/usePipelineStore.ts
 * OpusHunter — Global Pipeline State
 *
 * Zustand store. Zero direct Supabase calls here —
 * all async work lives in hooks/components; the store
 * is pure synchronous state + actions.
 */

import { create } from 'zustand';
import type { Job, PipelineMetrics } from '@/types/app.types';

interface PipelineState {
    // ─── Job queue ────────────────────────────────────────────────────────────
    jobQueue: Job[];
    setJobQueue: (jobs: Job[]) => void;
    popJob: () => void;

    // ─── CV ───────────────────────────────────────────────────────────────────
    currentCV: string | null;
    hasCVUploaded: boolean;
    setCurrentCV: (cvUrl: string | null) => void;

    // ─── Metrics ──────────────────────────────────────────────────────────────
    metrics: PipelineMetrics;
    setMetrics: (metrics: PipelineMetrics) => void;
    incrementMatches: () => void;

    // ─── Processing ───────────────────────────────────────────────────────────
    isProcessing: boolean;
    setProcessing: (status: boolean) => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
    // ─── Job queue ────────────────────────────────────────────────────────────
    jobQueue: [],
    setJobQueue: (jobs) => set({ jobQueue: jobs }),
    popJob: () => set((state) => ({ jobQueue: state.jobQueue.slice(1) })),

    // ─── CV ───────────────────────────────────────────────────────────────────
    currentCV: null,
    hasCVUploaded: false,
    setCurrentCV: (cvUrl) =>
        set({ currentCV: cvUrl, hasCVUploaded: cvUrl !== null }),

    // ─── Metrics ──────────────────────────────────────────────────────────────
    metrics: { matches: 0, pending: 0, interviews: 0 },
    setMetrics: (metrics) => set({ metrics }),
    incrementMatches: () =>
        set((state) => ({
            metrics: {
                ...state.metrics,
                matches: state.metrics.matches + 1,
            },
        })),

    // ─── Processing ───────────────────────────────────────────────────────────
    isProcessing: false,
    setProcessing: (status) => set({ isProcessing: status }),
}));