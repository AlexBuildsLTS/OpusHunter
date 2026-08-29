import { create } from "zustand";

export interface Job {
  id: string;
  title: string;
  company: string;
  status?: string;
  [key: string]: any;
}

interface JobState {
  removeFromDeck(jobId: string): unknown;
  jobs: Job[];
  loading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  filters: {
    keywords?: string[];
    workTypes?: string[];
    cities?: string[];
    radiusKm?: number;
    latitude?: number | null;
    longitude?: number | null;
  };
  setFilters: (filters: Partial<JobState["filters"]>) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  filters: {},
  removeFromDeck: (jobId: string) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
    }));
  },
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      set({ jobs: data, loading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      set({ error: message, loading: false });
    }
  },
}));

export { useJobStore as useJobs };
