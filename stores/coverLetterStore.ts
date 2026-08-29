/**
 * stores/coverLetterStore.ts
 * OpusHunter — Cover Letter State Management (Zustand) (Refined & Verified).
 * Manages: generation state, current job ID, A/B/C strategy selection,
 * alternative versions, and error handling.
 * Matches cover_letters and cover_letter_strategy_enum from database.types.ts.
 */

import { create } from "zustand";
import type { Database } from "../types/database.types";

type CoverLetterStrategy =
  Database["public"]["Enums"]["cover_letter_strategy_enum"];

interface LetterVersion {
  strategy: CoverLetterStrategy;
  body: string;
  ats_score: number | null;
  specificity_score: number | null;
}

interface CoverLetterStore {
  // State
  generatingForJobId: string | null;
  generationProgress: number; // 0 to 100
  selectedStrategy: CoverLetterStrategy;
  currentVersions: LetterVersion[];
  generationError: string | null;

  // Actions
  startGeneration: (jobId: string) => void;
  setProgress: (progress: number) => void;
  setVersions: (versions: LetterVersion[]) => void;
  selectStrategy: (strategy: CoverLetterStrategy) => void;
  setGenerationError: (error: string | null) => void;
  clearGeneration: () => void;
}

const DEFAULT_STRATEGY: CoverLetterStrategy = "mirror_matching";

export const useCoverLetterStore = create<CoverLetterStore>((set) => ({
  // Initial State
  generatingForJobId: null,
  generationProgress: 0,
  selectedStrategy: DEFAULT_STRATEGY,
  currentVersions: [],
  generationError: null,

  // Actions
  startGeneration: (jobId) =>
    set({
      generatingForJobId: jobId,
      generationProgress: 0,
      generationError: null,
      currentVersions: [],
    }),

  setProgress: (progress) =>
    set({ generationProgress: Math.min(100, Math.max(0, progress)) }),

  setVersions: (versions) =>
    set({
      currentVersions: versions,
      // Auto-select the highest-scoring version if available
      selectedStrategy:
        versions.length > 0
          ? (versions.reduce((best, v) =>
              (v.ats_score || 0) > (best.ats_score || 0) ? v : best,
            ).strategy ?? DEFAULT_STRATEGY)
          : DEFAULT_STRATEGY,
      generationProgress: 100,
    }),

  selectStrategy: (strategy) => set({ selectedStrategy: strategy }),

  setGenerationError: (error) => set({ generationError: error }),

  clearGeneration: () =>
    set({
      generatingForJobId: null,
      generationProgress: 0,
      selectedStrategy: DEFAULT_STRATEGY,
      currentVersions: [],
      generationError: null,
    }),
}));
