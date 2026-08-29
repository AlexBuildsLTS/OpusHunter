/**
 * app/(tabs)/index.tsx
 * OpusHunter — Primary Dashboard / Discover Screen.
 * Uses the aerospace cyan/blue theme, existing job components, and real Supabase data.
 * Features: Header, metrics, swipe deck for pending jobs, quick actions, and rate-limit banner.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Zap,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Target,
  ListChecks,
  FileText,
} from "lucide-react-native";
import { Typography } from "../../components/ui/Typography";
import { Card } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useJobs } from "../../hooks/useJobs";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase";
import { colors } from "../../constants/theme";
import { SafeAreaWrapper } from "components/shared/SafeAreaWrapper";
import { RateLimitBanner } from "components/jobcardsetup/RateLimitBanner";
import { SwipeDeck } from "components/jobcardsetup/SwipeDeck";
import { EmptyState } from "components/jobcardsetup/EmptyState";

const IS_WEB = Platform.OS === "web";

// ── Metric Card Component ────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  color,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: any;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={{ flex: 1 }}
    >
      <Card style={styles.metricCard}>
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: `${color}15`, borderColor: `${color}30` },
          ]}
        >
          <Icon size={18} color={color} />
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </Card>
    </Animated.View>
  );
}

// ── Quick Action Card ────────────────────────────────────────────────────────
function QuickAction({
  label,
  sub,
  route,
  color,
  icon: Icon,
}: {
  label: string;
  sub: string;
  route: any;
  color: string;
  icon: any;
}) {
  const router = useRouter();
  return (
    <Card
      variant="interactive"
      style={styles.quickActionCard}
      onPress={() => router.push(route)}
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
  );
}

// ── Main Dashboard Component ─────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = IS_WEB && width >= 1024;

  const { profile } = useAuthStore();
  const {
    jobs,
    isLoading,
    isError,
    runScrape,
    isScraping,
    rateLimit,
    updateStatus,
  } = useJobs();

  // ── Fetch Pipeline Metrics via RPC ─────────────────────────────────────────
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["pipeline_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_pipeline_metrics");
      if (error) throw error;
      return data as {
        discovered: number;
        saved: number;
        applied: number;
        interview: number;
        offer: number;
        rejected: number;
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const firstName = profile?.first_name?.split(" ")[0] || "Hunter";

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.scrollDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
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
            style={styles.scrapeBtn}
          >
            <RefreshCw size={14} color={colors.accent.cyan} /> Refresh
          </Button>
        </Animated.View>

        {/* ── Metrics Grid ── */}
        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={styles.metricsRow}
        >
          {metricsLoading ? (
            [0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Skeleton height={100} borderRadius={16} />
              </View>
            ))
          ) : (
            <>
              <MetricCard
                label="Discovered"
                value={metrics?.discovered ?? 0}
                color={colors.accent.blue}
                icon={Target}
                delay={100}
              />
              <MetricCard
                label="Saved"
                value={metrics?.saved ?? 0}
                color={colors.accent.cyan}
                icon={Zap}
                delay={150}
              />
              <MetricCard
                label="Applied"
                value={metrics?.applied ?? 0}
                color={colors.accent.green}
                icon={CheckCircle2}
                delay={200}
              />
              <MetricCard
                label="Interviews"
                value={metrics?.interview ?? 0}
                color={colors.accent.amber}
                icon={Clock}
                delay={250}
              />
            </>
          )}
        </Animated.View>

        {/* ── Pending Jobs Swipe Deck ── */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.deckSection}
        >
          <View style={styles.sectionHeader}>
            <Typography variant="h3" weight="bold" color="primary">
              Job Pipeline
            </Typography>
            <TouchableOpacity
              onPress={() => router.push("./(tabs)/pipeline")}
              style={styles.sectionLink}
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
              onSwipeUp={(job: any) =>
                updateStatus({ jobId: job.id, status: "applied" })
              }
            />
          ) : (
            <EmptyState onRunSearch={runScrape} hasScraped={true} />
          )}
        </Animated.View>

        {/* ── Quick Actions ── */}
        <Animated.View
          entering={FadeInDown.delay(280).springify()}
          style={styles.quickActions}
        >
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            QUICK ACTIONS
          </Typography>
          <QuickAction
            label="All Jobs"
            sub={`${jobs.length} in your pipeline`}
            route="/(tabs)/pipeline"
            color={colors.accent.cyan}
            icon={ListChecks}
          />
          <QuickAction
            label="Search Parameters"
            sub="Configure your search rules"
            route="/(tabs)/settings/profile"
            color={colors.accent.blue}
            icon={Briefcase}
          />
          <QuickAction
            label="Documents"
            sub="Manage CV & certifications"
            route="/(tabs)/settings/vault"
            color={colors.accent.amber}
            icon={FileText}
          />
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollDesktop: {
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  scrapeBtn: {
    flexDirection: "row",
    gap: 6,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    padding: 16,
    minWidth: 140,
    flex: 1,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text.dim,
    textTransform: "uppercase",
    marginTop: 2,
  },
  deckSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  centerCard: {
    alignItems: "center",
    padding: 24,
  },
  quickActions: {
    marginTop: 8,
  },
  sectionLabel: {
    marginBottom: 12,
  },
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
  quickSub: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
