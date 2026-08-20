/**
 * store/usePipelineStore.ts
 * OpusHunter — Global Pipeline State
 *
 * WHAT CHANGED AND WHY:
 * 1. FIXED INFINITE LOOP: `setJobQueue` now deep-compares incoming job arrays against
 *    the existing state. If the IDs match, it returns the existing state reference,
 *    aborting the React re-render cycle and preventing the `Maximum update depth exceeded` crash.
 * 2. ARCHITECTURE: Pure synchronous Zustand state. Zero Supabase API calls.
 */

import { create } from "zustand";
import type { Job, PipelineMetrics } from "../types/app.types";

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

  // Safety check: Prevent infinite render loops by blocking identical state updates
  setJobQueue: (jobs) =>
    set((state) => {
      if (
        state.jobQueue.length === jobs.length &&
        state.jobQueue.every((j, i) => j.id === jobs[i].id)
      ) {
        return state; // Abort update, break loop
      }
      return { jobQueue: jobs };
    }),

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
