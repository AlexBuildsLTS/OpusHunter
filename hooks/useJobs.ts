/**
 * hooks/useJobs.ts
 * OpusHunter — Job Data Hook (TanStack Query + Zustand).
 * Fetches jobs, triggers scrape Edge Function with filters (including lat/lng).
 * Handles optimistic status updates and rate limits.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { useJobStore } from "../stores/jobStore";
import type { Database } from "../types/database.types";

type JobListing = Database["public"]["Tables"]["job_vault"]["Row"];
type JobApplicationStatus =
  Database["public"]["Enums"]["application_status_enum"];

export function useJobs() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [rateLimit, setRateLimit] = useState<{
    limited: boolean;
    nextAvailableAt: string | null;
  }>({ limited: false, nextAvailableAt: null });
  const [isScraping, setIsScraping] = useState(false);
  const { filters } = useJobStore();

  // Fetch Jobs from Supabase
  const fetchJobs = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("job_vault")
      .select("*")
      .eq("user_id", user.id)
      .order("scraped_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    useJobStore.setState({ jobs: data || [] });
    return data || [];
  };

  const jobsQuery = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: fetchJobs,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Trigger Scrape Edge Function (passing full filters object including lat/lng)
  const runScrape = async (overrideParams?: any, options?: any) => {
    if (!user) throw new Error("No user");
    setIsScraping(true);

    const { data, error } = await supabase.functions.invoke("scrape-jobs", {
      body: {
        userId: user.id,
        searchParams: {
          ...filters, // Includes keywords, workTypes, cities, radiusKm, latitude, longitude
          ...(overrideParams || {}),
        },
        ...(options || {}),
      },
    });

    if (error) {
      let detailedMsg = error.message || "Scrape failed";
      // FunctionsHttpError contains the response context from the Edge Function
      if ("context" in error && error.context) {
        try {
          const body = await (error as any).context.json();
          if (body?.error === "rate_limited") {
            setRateLimit({
              limited: true,
              nextAvailableAt: body.nextAvailableAt || null,
            });
            detailedMsg =
              "Scrape rate limit reached. Please wait for cooldown.";
          } else if (body?.message) {
            detailedMsg = body.message;
          }
        } catch {
          // fallback to error.message
        }
      }

      if (detailedMsg.includes("rate_limited")) {
        setRateLimit({ limited: true, nextAvailableAt: detailedMsg });
      }

      throw new Error(detailedMsg);
    }

    await queryClient.invalidateQueries({ queryKey: ["jobs", user.id] });
    setRateLimit({ limited: false, nextAvailableAt: null });
    return data;
  };

  const scrapeMutation = useMutation({
    mutationFn: (args?: { overrideParams?: any; options?: any }) =>
      runScrape(args?.overrideParams, args?.options),
    onError: (error) => {
      console.error("Scrape failed:", error);
    },
    onSettled: () => {
      setIsScraping(false);
    },
  });

  const triggerScrape = async (overrideParams?: any, options?: any) => {
    return scrapeMutation.mutateAsync({ overrideParams, options });
  };

  // Update Job Status
  const updateStatus = async ({
    jobId,
    status,
  }: {
    jobId: string;
    status: JobApplicationStatus;
  }) => {
    if (!user) throw new Error("No user");
    const { error } = await supabase.from("job_applications").upsert(
      {
        user_id: user.id,
        job_id: jobId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,job_id" },
    );
    if (error) throw error;
    useJobStore.getState().removeFromDeck(jobId);
  };

  const statusMutation = useMutation({
    mutationFn: updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["applications", user?.id] });
    },
  });

  return {
    jobs: jobsQuery.data || [],
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    runScrape,
    triggerScrape,
    isScraping: scrapeMutation.isPending || isScraping,
    rateLimit,
    rateLimitStatus: rateLimit,
    checkRateLimit: async () => rateLimit,
    updateStatus: statusMutation.mutateAsync,
    isUpdatingStatus: statusMutation.isPending,
  };
}
