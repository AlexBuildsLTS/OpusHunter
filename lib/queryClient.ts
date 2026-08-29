/**
 * lib/queryClient.ts
 * OpusHunter — TanStack Query Client
 *
 * Central cache config. Query keys are defined here too (queryKeys object)
 * so every hook uses the exact same key shape — mismatched keys (e.g. one
 * hook using ['jobs', userId] and another using ['jobs', userId, {}]) is a
 * classic cause of stale/duplicate cache entries that "randomly" don't
 * update after a mutation.
 */

import { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 30 * 60 * 1000, // 30 min
      retry: (failureCount, error: any) => {
        // Don't burn retries on auth/permission errors — they won't
        // resolve themselves, and RLS denials come back as PostgREST 401/403.
        const status = error?.status ?? error?.code;
        if (status === 401 || status === 403 || status === "PGRST301")
          return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Refocus refetch is genuinely useful on web (user tabs back in after
      // a while) but just burns battery/data on native with no equivalent
      // "focus" signal worth acting on the same way.
      refetchOnWindowFocus: Platform.OS === "web",
    },
    mutations: {
      retry: false, // mutations must never silently retry — could double-apply
    },
  },
});

/**
 * Single source of truth for query key shapes. Every hook in hooks/*.ts
 * MUST build its keys from here, never inline a raw array literal.
 */
export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  userContext: (userId: string) => ["user-context", userId] as const,
  resumeDocuments: (userId: string) => ["resume-documents", userId] as const,
  certifications: (userId: string) => ["certifications", userId] as const,
  jobs: (userId: string, filters?: Record<string, unknown>) =>
    ["jobs", userId, filters ?? {}] as const,
  job: (jobId: string) => ["job", jobId] as const,
  applications: (userId: string) => ["applications", userId] as const,
  application: (applicationId: string) =>
    ["application", applicationId] as const,
  coverLetter: (coverLetterId: string) =>
    ["cover-letter", coverLetterId] as const,
  coverLetters: (userId: string) => ["cover-letters", userId] as const,
  automationRules: (userId: string) => ["automation-rules", userId] as const,
  connectedEmailAccounts: (userId: string) =>
    ["connected-email-accounts", userId] as const,
  rateLimit: (userId: string) => ["rate-limit", userId] as const,
  pipelineMetrics: (userId: string) => ["pipeline-metrics", userId] as const,
  adminStats: () => ["admin", "stats"] as const,
  adminUsers: (page: number) => ["admin", "users", page] as const,
  adminApiKeys: () => ["admin", "api-keys"] as const,
} as const;
