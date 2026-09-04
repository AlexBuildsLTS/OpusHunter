/**
 * app/job/[id].tsx
 * OpusHunter — Job Detail Screen.
 * Fetches real job data, displays full description, and triggers AI Cover Letter generation.
 * STRICT POLICY: Truthful rendering. Clean fallback if description is missing.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Text,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { colors, radius } from "../../../../constants/theme";
import {
  ArrowLeft,
  MapPin,
  Banknote,
  Briefcase,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "../../../../types/database.types";

type JobListing = Database["public"]["Tables"]["job_vault"]["Row"];

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      if (!id) throw new Error("No job ID");
      const { data, error } = await supabase
        .from("job_vault")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as JobListing;
    },
  });

  const handleGenerateCoverLetter = async () => {
    if (!user || !job) return;
    setGenerating(true);
    setGenerationError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-cover-letter",
        {
          body: { userId: user.id, jobListingId: job.id },
        },
      );

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["cover-letters", user.id],
      });
      if (data?.cover_letter_id) {
        router.push(
          `/configuration/cover-letter/${data.cover_letter_id}` as any,
        );
      }
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyNow = async () => {
    if (!job?.url) return;
    await Linking.openURL(job.url);
  };

  if (isLoading || !job) {
    return (
      <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.loading}>
          <Typography color="secondary">Loading job details...</Typography>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Typography variant="h4" weight="semiBold" color="primary">
          Job Details
        </Typography>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.jobCard}>
          <View style={styles.companyRow}>
            <View style={styles.logoWrap}>
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  style={styles.logo}
                  alt={job.company}
                />
              ) : (
                <Typography variant="h3" weight="bold" color="accent">
                  {job.company?.[0] || "?"}
                </Typography>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="h3" weight="bold" color="primary">
                {job.title}
              </Typography>
              <Typography variant="bodySm" color="secondary">
                {job.company}
              </Typography>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <MapPin size={16} color={colors.accent.cyan} />
              <Typography variant="bodySm" color="secondary">
                {job.location || "Remote"}
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Banknote size={16} color={colors.accent.cyan} />
              <Typography variant="bodySm" color="secondary">
                {job.salary_min && job.salary_max
                  ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.currency}`
                  : "Salary Not Disclosed"}
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Briefcase size={16} color={colors.accent.cyan} />
              <Typography
                variant="bodySm"
                color="secondary"
                style={{ textTransform: "capitalize" }}
              >
                {job.work_type || "Remote"}
              </Typography>
            </View>
            <View style={styles.detailRow}>
              <Clock size={16} color={colors.accent.cyan} />
              <Typography variant="bodySm" color="secondary">
                {job.posted_at
                  ? new Date(job.posted_at).toLocaleDateString()
                  : "Recently"}
              </Typography>
            </View>
          </View>
        </Card>

        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Sparkles size={20} color={colors.accent.cyan} />
            <Typography variant="bodySm" weight="bold" color="primary">
              AI Cover Letter
            </Typography>
          </View>
          <Typography
            variant="caption"
            color="secondary"
            style={{ marginBottom: 12 }}
          >
            Our AI reads your CV, certifications, and this specific job
            description to craft a personalized, tailored cover letter. Seconds
            to generate.
          </Typography>

          {generationError && (
            <View style={styles.errorBox}>
              <Typography variant="bodySm" color="error">
                {generationError}
              </Typography>
            </View>
          )}

          <Button
            onPress={handleGenerateCoverLetter}
            loading={generating}
            style={styles.generateBtn}
          >
            <Sparkles size={16} color={colors.text.inverse} /> Generate Cover
            Letter
          </Button>
        </Card>

        <Card style={styles.descCard}>
          <Typography
            variant="h4"
            weight="bold"
            color="primary"
            style={{ marginBottom: 12 }}
          >
            Description
          </Typography>

          {/* ─── TRUTH ENFORCEMENT ─── */}
          {job.description && job.description.trim().length > 0 ? (
            <Typography
              variant="bodySm"
              color="secondary"
              style={{ lineHeight: 22 }}
            >
              {job.description}
            </Typography>
          ) : (
            <View style={{ marginTop: 12, alignItems: "flex-start" }}>
              <Text
                style={{ color: "#94A3B8", fontSize: 13, marginBottom: 12 }}
              >
                Full description available natively on{" "}
                {job.source === "linkedin" ? "LinkedIn" : job.source}.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    job.url || job.source_url || "https://linkedin.com",
                  )
                }
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#CBD5E1", fontSize: 13, fontWeight: "600" }}
                >
                  Read Full Post
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <Button
          variant="primary"
          onPress={handleApplyNow}
          style={styles.applyBtn}
        >
          Apply Now
        </Button>
      </ScrollView>

      <LoadingOverlay
        visible={generating}
        message="AI is crafting your cover letter..."
        subMessage="Analyzing your skills against this specific role."
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface.card,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  jobCard: { padding: 20, marginBottom: 16 },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,210,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "100%", height: "100%", resizeMode: "contain" },
  detailsGrid: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiCard: {
    padding: 20,
    marginBottom: 16,
    borderColor: "rgba(0,210,255,0.2)",
    borderWidth: 1,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  generateBtn: { marginTop: 12, flexDirection: "row", gap: 6 },
  descCard: { padding: 20, marginBottom: 16 },
  applyBtn: { marginTop: 8 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
