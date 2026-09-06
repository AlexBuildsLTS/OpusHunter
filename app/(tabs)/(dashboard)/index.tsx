/**
 * app/(tabs)/(dashboard)/index.tsx
 * OpusHunter — Primary Dashboard / Discover Screen.
 * Features: Header, compact factual metrics, swipe deck, perfectly routed quick actions.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Linking,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Zap,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Target,
  ListChecks,
  FileText,
  Building2,
  MapPin,
  Sparkles,
  Copy,
  ExternalLink,
  DollarSign,
} from "lucide-react-native";
import { Typography } from "../../../components/ui/Typography";
import { Card } from "../../../components/ui/GlassCard";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { useJobs } from "../../../hooks/useJobs";
import { useAuthStore } from "../../../stores/authStore";
import { supabase } from "../../../lib/supabase";
import { colors, radius } from "../../../constants/theme";
import { SafeAreaWrapper } from "../../../components/shared/SafeAreaWrapper";
import { SwipeDeck } from "../../../components/jobcardsetup/SwipeDeck";
import { EmptyState } from "../../../components/jobcardsetup/EmptyState";
import * as Clipboard from "expo-clipboard";

const IS_WEB = Platform.OS === "web";

// ── Compact Horizontal Metric Card ───────────
const MetricCard = React.memo(
  ({ label, value, color, icon: Icon, delay = 0 }: any) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.metricCardWrapper}
    >
      <Card style={styles.metricCard}>
        <View style={styles.metricCardContent}>
          <View
            style={[
              styles.metricIcon,
              { backgroundColor: `${color}15`, borderColor: `${color}30` },
            ]}
          >
            <Icon size={18} color={color} />
          </View>
          <View style={styles.metricTextWrap}>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  ),
);

// ── Quick Action Card (FIXED: Wrapped in TouchableOpacity for routing) ──
const QuickAction = React.memo(
  ({ label, sub, route, color, icon: Icon, router }: any) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(route)}
      style={{ marginBottom: 8, minHeight: 44 }}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Card
        variant="interactive"
        style={[styles.quickActionCard, { marginBottom: 0 }]}
      >
        <View
          style={[
            styles.quickIcon,
            { backgroundColor: `${color}15`, borderColor: `${color}30` },
          ]}
        >
          <Icon size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.quickLabel, { color }]}>{label}</Text>
          <Text style={styles.quickSub}>{sub}</Text>
        </View>
        <ChevronRight size={18} color={`${color}70`} />
      </Card>
    </TouchableOpacity>
  ),
);

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = IS_WEB && width >= 1024;

  const { profile, user } = useAuthStore();
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<{
    body: string;
    ats_score?: number;
    strategy?: string;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedFormality, setSelectedFormality] = useState<string>(
    "technical_deep_dive",
  );
  const [selectedStrategy, setSelectedStrategy] =
    useState<string>("mirror_matching");
  const [copiedNotification, setCopiedNotification] = useState(false);

  const { jobs, isLoading, isError, runScrape, isScraping, updateStatus } =
    useJobs();

  // ── Fetch Pipeline Metrics via RPC ─────────────────────────────────────────
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
  } = useQuery({
    queryKey: ["pipeline_metrics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_pipeline_metrics");
      if (error) throw error;
      return data as any;
    },
    staleTime: 30_000,
  });

  const handleGenerateCoverLetter = async (job: any) => {
    if (!user || !job) return;
    setIsGeneratingLetter(true);
    setGeneratedLetter(null);
    setGenerationError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-cover-letter",
        {
          body: {
            userId: user.id,
            jobListingId: job.id,
            strategy: selectedStrategy,
            formality: selectedFormality,
          },
        },
      );

      if (error) throw error;

      if (data?.primary?.body) {
        setGeneratedLetter({
          body: data.primary.body,
          ats_score: data.primary.ats_score,
          strategy: data.primary.strategy,
        });
      } else if (data?.body) {
        setGeneratedLetter({
          body: data.body,
          ats_score: data.ats_score,
          strategy: data.strategy,
        });
      } else {
        throw new Error("The cover-letter service returned no letter content.");
      }
    } catch (err: any) {
      console.error("Cover letter synthesis error:", err);
      setGenerationError(
        err?.message ||
          "The listing-specific cover letter could not be generated.",
      );
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const copyToClipboard = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  }, []);

  const firstName = profile?.first_name?.split(" ")[0] || "Hunter";

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(20).springify()}
          style={styles.header}
        >
          <View style={{ flex: 1 }}>
            <Typography variant="h2" weight="bold" color="primary">
              Hello,{" "}
              <Text style={{ color: colors.accent.cyan }}>{firstName}</Text>
            </Typography>
            <Typography
              variant="bodySm"
              color="secondary"
              style={{ marginTop: 4 }}
            >
              Your pipeline is{" "}
              <Text style={{ color: colors.accent.green, fontWeight: "700" }}>
                active
              </Text>
            </Typography>
          </View>
          <Button
            variant="secondary"
            size="sm"
            onPress={runScrape}
            loading={isScraping}
          >
            <RefreshCw size={14} color={colors.accent.cyan} /> Refresh
          </Button>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={styles.metricsRow}
        >
          {metricsLoading ? (
            [0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Skeleton height={72} borderRadius={16} />
              </View>
            ))
          ) : (
            <>
              <MetricCard
                label="Discovered"
                value={metricsError ? "—" : (metrics?.discovered ?? 0)}
                color={colors.accent.blue}
                icon={Target}
                delay={150}
              />
              <MetricCard
                label="Saved"
                value={metricsError ? "—" : (metrics?.saved ?? 0)}
                color={colors.accent.cyan}
                icon={Zap}
                delay={150}
              />
              <MetricCard
                label="Applied"
                value={metricsError ? "—" : (metrics?.applied ?? 0)}
                color={colors.accent.green}
                icon={CheckCircle2}
                delay={150}
              />
            </>
          )}
        </Animated.View>
        {metricsError && (
          <Typography
            variant="caption"
            color="error"
            style={styles.metricsError}
          >
            Pipeline metrics are unavailable. Job data is still available below.
          </Typography>
        )}

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.deckSection}
        >
          <View style={styles.sectionHeader}>
            <Typography variant="h3" weight="bold" color="primary">
              💠
            </Typography>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/(dashboard)/pipeline")}
              style={styles.sectionLink}
              accessibilityRole="link"
              accessibilityLabel="View all pipeline jobs"
            >
              <Typography variant="bodySm" color="accent">
                View All
              </Typography>
              <ChevronRight size={14} color={colors.accent.cyan} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent.cyan} />
            </View>
          ) : isError ? (
            <Card style={styles.centerCard}>
              <AlertCircle size={28} color={colors.accent.red} />
              <Typography
                variant="bodySm"
                color="error"
                style={{ marginTop: 8 }}
              >
                Failed to load jobs
              </Typography>
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  queryClient.invalidateQueries({ queryKey: ["jobs"] })
                }
                style={{ marginTop: 12 }}
              >
                Retry
              </Button>
            </Card>
          ) : jobs.length > 0 ? (
            <SwipeDeck
              jobs={jobs}
              onSwipeRight={(job: any) =>
                updateStatus({ jobId: job.id, status: "saved" })
              }
              onSwipeLeft={(job: any) =>
                updateStatus({ jobId: job.id, status: "rejected" })
              }
              onSwipeUp={(job: any) => setSelectedJob(job)}
              onSelectJob={(job: any) => setSelectedJob(job)}
            />
          ) : (
            <EmptyState onRunSearch={runScrape} hasScraped={true} />
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(280).springify()}
          style={styles.quickActions}
        >
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            🛸
          </Typography>
          <QuickAction
            label="All Jobs"
            sub={`${jobs.length} in your pipeline`}
            route="/(tabs)/(dashboard)/pipeline"
            color={colors.accent.cyan}
            icon={ListChecks}
            router={router}
          />
          <QuickAction
            label="Search Parameters"
            sub="Configure your search rules"
            route="/(tabs)/(dashboard)/settings/profile"
            color={colors.accent.blue}
            icon={Briefcase}
            router={router}
          />
          <QuickAction
            label="Documents"
            sub="Manage CV & certifications"
            route="/(tabs)/(dashboard)/settings/documents"
            color={colors.accent.amber}
            icon={FileText}
            router={router}
          />
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={!!selectedJob}
        onClose={() => {
          setSelectedJob(null);
          setGeneratedLetter(null);
          setGenerationError(null);
        }}
        title="Position Specification & AI Synthesis"
        maxWidth={720}
      >
        {selectedJob && (
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeaderBlock}>
              <Typography variant="h3" weight="bold" color="primary">
                {selectedJob.title}
              </Typography>
              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaItem}>
                  <Building2 size={15} color={colors.accent.cyan} />
                  <Typography
                    variant="bodySm"
                    weight="semiBold"
                    color="primary"
                  >
                    {selectedJob.company || "Company Confidential"}
                  </Typography>
                </View>
                <View style={styles.modalMetaItem}>
                  <MapPin size={15} color={colors.text.secondary} />
                  <Typography variant="caption" color="secondary">
                    {selectedJob.location || "Remote"}
                  </Typography>
                </View>
                {selectedJob.salary && (
                  <View style={styles.modalMetaItem}>
                    <DollarSign size={15} color={colors.accent.green} />
                    <Typography
                      variant="caption"
                      style={{ color: colors.accent.green, fontWeight: "700" }}
                    >
                      {selectedJob.salary}
                    </Typography>
                  </View>
                )}
              </View>
            </View>

            {Array.isArray(selectedJob.tech_stack) &&
              selectedJob.tech_stack.length > 0 && (
                <View style={styles.modalDataBlock}>
                  <Typography
                    variant="caption"
                    weight="bold"
                    color="dim"
                    style={styles.modalSectionTitle}
                  >
                    VERIFIED SKILL ALIGNMENT & TECH STACK:
                  </Typography>
                  <View style={styles.techTagsRow}>
                    {selectedJob.tech_stack.map((t: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="default"
                        label={t}
                        size="sm"
                        dot={false}
                      />
                    ))}
                  </View>
                </View>
              )}

            <View style={styles.modalDataBlock}>
              <Typography
                variant="caption"
                weight="bold"
                color="dim"
                style={styles.modalSectionTitle}
              >
                ROLE DESCRIPTION & RESPONSIBILITIES:
              </Typography>
              <Typography
                variant="bodySm"
                color="secondary"
                style={styles.jobDescriptionText}
              >
                {selectedJob.description || "No description provided."}
              </Typography>
            </View>

            <View style={styles.strategyBlock}>
              <View style={styles.strategyHeader}>
                <Sparkles size={16} color={colors.accent.cyan} />
                <Typography variant="caption" weight="bold" color="primary">
                  AI FORMALITY & STRATEGY ENGINE:
                </Typography>
              </View>

              <Typography
                variant="caption"
                color="dim"
                style={{ marginBottom: 6 }}
              >
                Formality Profile:
              </Typography>
              <View style={styles.optionsRow}>
                {[
                  { id: "technical_deep_dive", label: "Technical Deep-Dive" },
                  { id: "formal_corporate", label: "Formal Corporate" },
                  { id: "executive_brief", label: "Executive Brief" },
                  { id: "storytelling", label: "Storytelling" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedFormality(item.id)}
                    style={[
                      styles.optionChip,
                      selectedFormality === item.id && styles.optionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedFormality === item.id &&
                          styles.optionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Typography
                variant="caption"
                color="dim"
                style={{ marginTop: 10, marginBottom: 6 }}
              >
                Targeting Method:
              </Typography>
              <View style={styles.optionsRow}>
                {[
                  { id: "mirror_matching", label: "ATS Keyword Mirroring" },
                  {
                    id: "achievement_amplification",
                    label: "Achievement Amplifier",
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedStrategy(item.id)}
                    style={[
                      styles.optionChip,
                      selectedStrategy === item.id && styles.optionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedStrategy === item.id && styles.optionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                variant="primary"
                size="md"
                onPress={() => handleGenerateCoverLetter(selectedJob)}
                loading={isGeneratingLetter}
                style={{ marginTop: 14 }}
              >
                <Sparkles size={16} color={colors.text.inverse} />
                <Text style={styles.btnActionText}>
                  {isGeneratingLetter
                    ? "Synthesizing Fact-Grounded Letter..."
                    : "Generate Custom AI Cover Letter"}
                </Text>
              </Button>
              {generationError && (
                <View accessibilityRole="alert" style={styles.generationError}>
                  <Typography variant="caption" color="error">
                    {generationError}
                  </Typography>
                </View>
              )}
            </View>

            {generatedLetter && (
              <View style={styles.generatedLetterSection}>
                <View style={styles.generatedMetaRow}>
                  <Typography variant="bodySm" weight="bold" color="primary">
                    Tailored Letter Preview
                  </Typography>
                  {generatedLetter.ats_score && (
                    <View style={styles.atsBadge}>
                      <Sparkles size={12} color={colors.accent.cyan} />
                      <Text style={styles.atsScoreText}>
                        ATS Score: {generatedLetter.ats_score}%
                      </Text>
                    </View>
                  )}
                </View>
                <Card style={styles.letterCard}>
                  <Text style={styles.letterBodyText}>
                    {generatedLetter.body}
                  </Text>
                </Card>
                <View style={styles.letterActionsRow}>
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => copyToClipboard(generatedLetter.body)}
                    style={{ flex: 1 }}
                  >
                    <Copy size={16} color={colors.text.inverse} />
                    <Text style={styles.btnActionText}>
                      {copiedNotification
                        ? "Copied to Clipboard!"
                        : "Copy Cover Letter"}
                    </Text>
                  </Button>
                </View>
              </View>
            )}

            {!generatedLetter && (
              <View style={styles.modalBottomRow}>
                {selectedJob.url && (
                  <Button
                    variant="secondary"
                    size="md"
                    onPress={() => {
                      if (selectedJob.url) {
                        Linking.openURL(selectedJob.url);
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    <ExternalLink size={16} color={colors.accent.cyan} />
                    <Text
                      style={[
                        styles.btnActionText,
                        { color: colors.accent.cyan },
                      ]}
                    >
                      Open Application URL
                    </Text>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="md"
                  onPress={() => {
                    updateStatus({ jobId: selectedJob.id, status: "saved" });
                    setSelectedJob(null);
                  }}
                >
                  Save to Pipeline
                </Button>
              </View>
            )}
          </ScrollView>
        )}
      </Modal>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent", minHeight: 0 },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 },
  scrollDesktop: { maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricCardWrapper: { flex: 1, minWidth: 100 },
  metricCard: { padding: 12, width: "100%" },
  metricCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  metricValue: { fontSize: 22, fontWeight: "900", lineHeight: 26 },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text.dim,
    textTransform: "uppercase",
    marginTop: 2,
  },
  deckSection: { marginBottom: 24 },
  metricsError: { marginTop: -14, marginBottom: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  center: { paddingVertical: 40, alignItems: "center" },
  centerCard: { alignItems: "center", padding: 24 },
  quickActions: { marginTop: 8 },
  sectionLabel: { marginBottom: 12 },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 8,
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: 2,
  },
  quickSub: { fontSize: 12, color: colors.text.secondary },
  modalScroll: { maxHeight: 520 },
  generationError: { marginTop: 10, lineHeight: 18 },
  modalHeaderBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  modalMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  modalMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  modalDataBlock: { marginBottom: 16 },
  modalSectionTitle: { marginBottom: 6, letterSpacing: 0.5 },
  techTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  jobDescriptionText: {
    lineHeight: 20,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  strategyBlock: {
    backgroundColor: "rgba(6, 182, 212, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  strategyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  optionChipActive: {
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderColor: colors.accent.cyan,
  },
  optionText: { fontSize: 12, color: colors.text.secondary },
  optionTextActive: { color: colors.accent.cyan, fontWeight: "700" },
  btnActionText: { fontWeight: "700", fontSize: 13 },
  generatedLetterSection: { marginTop: 10, marginBottom: 16 },
  generatedMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  atsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  atsScoreText: { color: colors.accent.cyan, fontSize: 11, fontWeight: "800" },
  letterCard: {
    padding: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: colors.surface.border,
    marginBottom: 12,
  },
  letterBodyText: {
    color: colors.text.primary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  letterActionsRow: { flexDirection: "row", gap: 10 },
  modalBottomRow: { flexDirection: "row", gap: 10, marginTop: 8 },
});
