/**
 * components/jobcardsetup/ActiveTargetCard.tsx
 * High-production Aerospace Glassmorphic Target Box.
 * Renders the single active pipeline target card (or multiple for admin),
 * displays skills/geo/workplace/documents criteria, and has a 1-tap "Start Scrape" trigger
 * with real-time status and member vs admin quota visibility.
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, radius } from "../../constants/theme";
import { C } from "../../lib/theme";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Briefcase,
  Layers,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  Crown,
  Settings,
  RefreshCw,
  Zap,
  Globe2,
  DollarSign,
  ChevronRight,
} from "lucide-react-native";
import { useJobs } from "../../hooks/useJobs";
import { useAuthStore } from "../../stores/authStore";

interface ActiveTargetCardProps {
  onEditRules?: () => void;
  onViewPipeline?: () => void;
  isAdmin?: boolean;
}

export function ActiveTargetCard({
  onEditRules,
  onViewPipeline,
  isAdmin = false,
}: ActiveTargetCardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isMobile = width < 600;
  const { profile } = useAuthStore();
  const { triggerScrape, isScraping, rateLimitStatus, checkRateLimit } =
    useJobs();

  const [scrapeSuccessMsg, setScrapeSuccessMsg] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const title = profile?.professional_title || "Java Fullstack Developer";
  const roles = profile?.target_roles || [];
  const cities = profile?.target_cities || ["Stockholm"];
  const countries = profile?.target_countries || ["Sweden"];
  const radiusKm = profile?.location_radius_km || 50;
  const workTypes = profile?.work_type_preferences || ["remote", "hybrid"];
  const seniority = profile?.seniority_level || "mid";
  const maxDaily = profile?.max_daily_applications || 10;
  const salaryMin = profile?.salary_min;
  const salaryMax = profile?.salary_max;
  const currency = profile?.salary_currency || "SEK";

  const handleStartScrape = async () => {
    if (isScraping) return;
    setScrapeSuccessMsg(null);
    setScrapeError(null);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      const res = await triggerScrape(undefined, {
        limit: 25,
        forceFresh: true,
      });

      const harvestedCount =
        res?.count ?? res?.scraped ?? res?.listings?.length ?? 0;
      const uniqueCount = res?.deduplicated ?? res?.count ?? harvestedCount;

      if (res && harvestedCount > 0) {
        setScrapeSuccessMsg(
          `Successfully harvested ${harvestedCount} targeted jobs (${uniqueCount} unique). Auto-classified into Vault.`,
        );
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        }
      } else if (res && res.rateLimited) {
        setScrapeError(
          `Rate limit engaged: ${res.retryAfterSeconds || 60}s cooldown remaining.`,
        );
      } else {
        setScrapeSuccessMsg(
          "Scan complete. Radar checked all live endpoints; pipeline is up to date.",
        );
      }
    } catch (err: any) {
      setScrapeError(err.message || "Failed to trigger automated scrape.");
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      style={styles.cardBoxWrapper}
    >
      {/* Background Glow Effect */}
      <View style={styles.glowUnderlay} />

      <View style={styles.cardBox}>
        {/* Card Header Ribbon */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.headerLeft}>
            <View style={styles.statusPulseDot}>
              <View style={styles.pulseInner} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.tierTagRow}>
                <Text style={styles.cardSuperTitle}>
                  RADAR PIPELINE TARGET 01
                </Text>
                {isAdmin ? (
                  <View style={styles.adminTierBadge}>
                    <Crown size={11} color="#FBBF24" />
                    <Text style={styles.adminTierText}>ADMIN • UNLIMITED</Text>
                  </View>
                ) : (
                  <View style={styles.memberTierBadge}>
                    <ShieldCheck size={11} color={colors.accent.cyan} />
                    <Text style={styles.memberTierText}>MEMBER • 1 ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.targetJobTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>
          </View>

          {onEditRules && (
            <TouchableOpacity
              onPress={onEditRules}
              style={styles.tuneButton}
              activeOpacity={0.8}
            >
              <Settings size={14} color="#94A3B8" />
              <Text style={styles.tuneButtonText}>Tune Rules</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Target Parameters Grid */}
        <View style={styles.paramsGrid}>
          {/* Geolocation */}
          <View
            style={[styles.paramItem, { width: isMobile ? "100%" : "48.5%" }]}
          >
            <View style={styles.paramIconBox}>
              <MapPin size={14} color={colors.accent.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paramLabel}>GEO RADAR & RADIUS</Text>
              <Text style={styles.paramValue} numberOfLines={1}>
                {cities.join(", ")} ({countries.join(", ")}) • {radiusKm} km
              </Text>
            </View>
          </View>

          {/* Workplace & Seniority */}
          <View
            style={[styles.paramItem, { width: isMobile ? "100%" : "48.5%" }]}
          >
            <View style={styles.paramIconBox}>
              <Briefcase size={14} color={colors.accent.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paramLabel}>WORK MODEL & SENIORITY</Text>
              <Text style={styles.paramValue} numberOfLines={1}>
                {workTypes.map((w) => w.toUpperCase()).join(" / ")} •{" "}
                {seniority.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Alternate Roles */}
          <View
            style={[styles.paramItem, { width: isMobile ? "100%" : "48.5%" }]}
          >
            <View style={styles.paramIconBox}>
              <Layers size={14} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paramLabel}>ALTERNATE TITLES</Text>
              <Text style={styles.paramValue} numberOfLines={1}>
                {roles.length > 0 ? roles.join(", ") : "Single Focus Target"}
              </Text>
            </View>
          </View>

          {/* Compensation & Rate */}
          <View
            style={[styles.paramItem, { width: isMobile ? "100%" : "48.5%" }]}
          >
            <View style={styles.paramIconBox}>
              <DollarSign size={14} color="#34D399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paramLabel}>SALARY FLOOR & PACE</Text>
              <Text style={styles.paramValue} numberOfLines={1}>
                {salaryMin
                  ? `${salaryMin} - ${salaryMax || "+"} ${currency}`
                  : "Market Standard"}{" "}
                • {maxDaily || 30} max applications/day
              </Text>
            </View>
          </View>
        </View>

        {/* Live Status / Alerts */}
        {scrapeSuccessMsg && (
          <View style={styles.successBox}>
            <CheckCircle2
              size={16}
              color="#10B981"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.successText}>{scrapeSuccessMsg}</Text>
          </View>
        )}

        {scrapeError && (
          <View style={styles.errorBox}>
            <AlertTriangle
              size={16}
              color={C.pink}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{scrapeError}</Text>
          </View>
        )}

        {/* Action Button Strip */}
        <View
          style={[
            styles.actionStrip,
            { flexDirection: isMobile ? "column" : "row" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.startScrapeBtn,
              isScraping && styles.btnDisabled,
              isMobile && { width: "100%" },
            ]}
            onPress={handleStartScrape}
            disabled={isScraping}
            activeOpacity={0.85}
          >
            {isScraping ? (
              <>
                <ActivityIndicator size="small" color="#050811" />
                <Text style={styles.startScrapeBtnText}>
                  SWEEPING LIVE JOB ENDPOINTS...
                </Text>
              </>
            ) : (
              <>
                <View style={styles.playIconCircle}>
                  <Play size={13} color="#050811" fill="#050811" />
                </View>
                <Text style={styles.startScrapeBtnText}>
                  START SCRAPE FROM THIS TARGET
                </Text>
              </>
            )}
          </TouchableOpacity>

          {onViewPipeline && (
            <TouchableOpacity
              style={[
                styles.viewPipelineBtn,
                isMobile && { width: "100%", justifyContent: "center" },
              ]}
              onPress={onViewPipeline}
              activeOpacity={0.8}
            >
              <Text style={styles.viewPipelineBtnText}>View Pipeline</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardBoxWrapper: {
    marginVertical: 12,
    position: "relative",
  },
  glowUnderlay: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: radius.xl,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
    ...Platform.select({
      web: { filter: "blur(24px)" } as any,
    }),
  },
  cardBox: {
    backgroundColor: "rgba(10, 15, 29, 0.92)",
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: "rgba(0, 242, 254, 0.35)",
    padding: 20,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        boxShadow:
          "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.12)",
      } as any,
    }),
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusPulseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.4)",
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.cyan,
  },
  tierTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardSuperTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1.2,
  },
  memberTierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    gap: 4,
  },
  memberTierText: {
    color: colors.accent.cyan,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  adminTierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    gap: 4,
  },
  adminTierText: {
    color: "#FBBF24",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  targetJobTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  tuneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 6,
  },
  tuneButtonText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  paramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  paramItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 10,
  },
  paramIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  paramLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  paramValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: C.pink,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  actionStrip: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  startScrapeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.cyan,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 0 24px rgba(0, 242, 254, 0.4)",
      } as any,
    }),
  },
  btnDisabled: {
    opacity: 0.7,
  },
  playIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(5, 8, 17, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  startScrapeBtnText: {
    color: "#050811",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  viewPipelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  viewPipelineBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
