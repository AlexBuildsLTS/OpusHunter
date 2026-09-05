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
import { C } from "../../constants/theme";
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
import { RateLimitBanner } from "./RateLimitBanner";

interface ActiveTargetCardProps {
  onEditRules?: () => void;
  onViewPipeline?: () => void;
  isAdmin?: boolean;
}

const SCRAPE_SOURCES = [
  { key: "jobtech", label: "JobTech" },
  { key: "thehub", label: "The Hub" },
  { key: "jsearch", label: "RapidAPI / JSearch" },
  { key: "adzuna", label: "Adzuna" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

const ADZUNA_COUNTRIES = new Set([
  "gb",
  "us",
  "at",
  "au",
  "be",
  "br",
  "ca",
  "de",
  "es",
  "fr",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "ru",
  "sg",
  "za",
]);

const COUNTRY_CODES: Record<string, string> = {
  sweden: "se",
  sverige: "se",
  "united kingdom": "gb",
  uk: "gb",
  england: "gb",
  norway: "no",
  denmark: "dk",
  finland: "fi",
};

function normalizeCountry(country: string) {
  const normalized = country.trim().toLowerCase();
  return COUNTRY_CODES[normalized] || normalized.replace(/[^a-z]/g, "");
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

  const [batchSize, setBatchSize] = useState(isAdmin ? 100 : 25);
  const [enabledSources, setEnabledSources] = useState<
    Record<(typeof SCRAPE_SOURCES)[number]["key"], boolean>
  >(
    () =>
      Object.fromEntries(
        SCRAPE_SOURCES.map(({ key }) => [key, true]),
      ) as Record<(typeof SCRAPE_SOURCES)[number]["key"], boolean>,
  );
  const [scrapeSuccessMsg, setScrapeSuccessMsg] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const title = profile?.professional_title || "Target profile not configured";
  const roles = profile?.target_roles || [];
  const cities = profile?.target_cities || [];
  const countries = profile?.target_countries || [];
  const radiusKm = profile?.location_radius_km;
  const workTypes = profile?.work_type_preferences || [];
  const seniority = profile?.seniority_level || "not configured";
  const maxDaily = profile?.max_daily_applications;
  const salaryMin = profile?.salary_min;
  const salaryMax = profile?.salary_max;
  const currency = profile?.salary_currency || "";
  const selectedCountryCodes = countries.map(normalizeCountry);
  const relevantSources = SCRAPE_SOURCES.filter(({ key }) => {
    if (key === "linkedin" || key === "jsearch") return true;
    if (key === "jobtech") return selectedCountryCodes.includes("se");
    if (key === "thehub")
      return selectedCountryCodes.some((country) =>
        ["se", "dk", "no", "fi"].includes(country),
      );
    if (key === "adzuna")
      return selectedCountryCodes.some((country) =>
        ADZUNA_COUNTRIES.has(country),
      );
    return false;
  });

  const handleStartScrape = async () => {
    if (isScraping || rateLimitStatus.limited) return;
    setScrapeSuccessMsg(null);
    setScrapeError(null);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      const res = await triggerScrape(undefined, {
        batchSize,
        enableSources: enabledSources,
        forceFresh: true,
      });

      const harvestedCount =
        res?.count ?? res?.scraped ?? res?.listings?.length ?? 0;
      const uniqueCount = res?.totalNew ?? harvestedCount;

      if (res && harvestedCount > 0) {
        setScrapeSuccessMsg(
          `Added ${uniqueCount} new jobs to your Vault. The live systems returned ${res.totalScraped ?? harvestedCount} listings and ${res.totalUniqueFetched ?? uniqueCount} unique listings before existing jobs were removed.`,
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
          res?.totalScraped > 0
            ? `Scan complete. Live systems returned ${res.totalScraped} listings, but they are already in your Vault. Change the target, page, or enabled systems for different results.`
            : "Scan complete. The enabled live systems returned no listings for this target. Check the selected countries, source credentials, and system toggles.",
        );
      }
    } catch (err: any) {
      setScrapeError(err.message || "Failed to trigger automated scrape.");
    }
  };

  const toggleSource = (source: (typeof SCRAPE_SOURCES)[number]["key"]) => {
    setEnabledSources((current) => {
      const enabledCount = Object.values(current).filter(Boolean).length;
      if (current[source] && enabledCount === 1) return current;
      return { ...current, [source]: !current[source] };
    });
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      style={styles.cardBoxWrapper}
    >
      {/* Background Glow Effect */}
      <View style={styles.glowUnderlay} />

      <View style={styles.cardBox}>
        {/* Rate Limit Banner */}
        <RateLimitBanner
          limited={rateLimitStatus.limited}
          nextAvailableAt={
            rateLimitStatus.nextAvailableAt
              ? new Date(rateLimitStatus.nextAvailableAt)
              : null
          }
          onRefresh={handleStartScrape}
        />

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
                    <Text style={styles.adminTierText}>ADMIN</Text>
                  </View>
                ) : (
                  <View style={styles.memberTierBadge}>
                    <ShieldCheck size={11} color={colors.accent.cyan} />
                    <Text style={styles.memberTierText}>MEMBER</Text>
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
              accessibilityRole="button"
              accessibilityLabel="Edit targeting rules"
            >
              <Settings size={15} color="#94A3B8" />
              <Text style={styles.tuneButtonText}>API's</Text>
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
                {cities.length ? cities.join(", ") : "Location not configured"}
                {countries.length ? ` (${countries.join(", ")})` : ""}
                {radiusKm ? ` • ${radiusKm} km` : ""}
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
                {workTypes.length
                  ? workTypes.map((w: string) => w.toUpperCase()).join(" / ")
                  : "Work model not configured"}
                {" • "}
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
                {roles.length > 0
                  ? roles.join(", ")
                  : "No alternate titles configured"}
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
                {salaryMin != null
                  ? `${salaryMin} - ${salaryMax ?? "+"} ${currency}`
                  : "Compensation not configured"}{" "}
                •{" "}
                {maxDaily != null
                  ? `${maxDaily} max applications/day`
                  : "Daily limit not configured"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.scrapeOptions}>
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>RESULTS PER SWEEP</Text>
            <View style={styles.optionRow}>
              {[25, 50, 100, 200]
                .filter(
                  (size) =>
                    isAdmin || size <= (profile?.role === "premium" ? 50 : 25),
                )
                .map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setBatchSize(size)}
                    style={[
                      styles.optionChip,
                      batchSize === size && styles.optionChipActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: batchSize === size }}
                    accessibilityLabel={`Request ${size} new jobs per sweep`}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        batchSize === size && styles.optionChipTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>LIVE SYSTEMS</Text>
            <View style={styles.sourceRow}>
              {relevantSources.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleSource(key)}
                  style={[
                    styles.sourceChip,
                    enabledSources[key] && styles.sourceChipActive,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: enabledSources[key] }}
                  accessibilityLabel={`${enabledSources[key] ? "Disable" : "Enable"} ${label}`}
                >
                  <Text
                    style={[
                      styles.sourceChipText,
                      enabledSources[key] && styles.sourceChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
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

        {scrapeError && !rateLimitStatus.limited && (
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
              (isScraping || rateLimitStatus.limited) && styles.btnDisabled,
              isMobile && { width: "100%" },
            ]}
            onPress={handleStartScrape}
            disabled={isScraping || rateLimitStatus.limited}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isScraping
                ? "Searching live job endpoints"
                : "Start live job search"
            }
            accessibilityState={{
              disabled: isScraping || rateLimitStatus.limited,
              busy: isScraping,
            }}
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
                  {rateLimitStatus.limited
                    ? "RATE LIMITED"
                    : "START SCRAPE FROM THIS TARGET"}
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
              accessibilityRole="link"
              accessibilityLabel="View job pipeline"
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
    // REMOVED: filter: "blur(24px)" - Fatal to Android performance
  },
  cardBox: {
    backgroundColor: "rgba(10, 15, 29, 0.95)", // Increased opacity slightly to compensate for no blur
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: "rgba(0, 242, 254, 0.35)",
    padding: 20,
    ...Platform.select({
      web: {
        // REMOVED: backdropFilter: "blur(20px)"
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 242, 254, 0.08)",
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
    minHeight: 44,
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
  scrapeOptions: {
    gap: 14,
    marginBottom: 16,
    paddingTop: 2,
  },
  optionGroup: {
    gap: 7,
  },
  optionLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    minHeight: 38,
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionChipActive: {
    borderColor: colors.accent.cyan,
    backgroundColor: "rgba(0, 242, 254, 0.14)",
  },
  optionChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: colors.accent.cyan,
  },
  sourceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  sourceChip: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(15, 23, 42, 0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  sourceChipActive: {
    borderColor: "rgba(0, 242, 254, 0.62)",
    backgroundColor: "rgba(0, 242, 254, 0.1)",
  },
  sourceChipText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
  },
  sourceChipTextActive: {
    color: colors.accent.cyan,
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
    minHeight: 44,
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
