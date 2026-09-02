/**
 * app/(tabs)/(dashboard)/admin/index.tsx
 * OpusHunter — Kernel Admin Command Center
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * - 120fps Reanimated Wandering Core + Deep Nebula Ambient Engine
 * - Real-Time Telemetry & Metric Synchronization via Supabase Channels
 * - Interactive SaaS Forecaster 2.0 with margin, MRR, ARR, and deduction engine
 * - Identity Registry Live Feed with role badges and BYO-Key telemetry
 * - Engine Stream Event Log with token burn metrics and latency tracking
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect, useMemo, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  FadeInDown,
  Easing,
  useFrameCallback,
} from "react-native-reanimated";
import {
  Users,
  Lock,
  Layers,
  Coins,
  Server,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Activity,
  Cpu,
  History,
  RefreshCcw,
  Zap,
  ArrowUpRight,
  KeyRound,
  ArrowBigLeftDash,
  ExternalLink,
  Receipt,
  Landmark,
  Clock,
  FileText,
  Send,
  Sparkles,
} from "lucide-react-native";

import { supabase } from "../../../../lib/supabase";
import { Database } from "../../../../types/database.types";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { FadeIn } from "../../../../components/shared/FadeIn";
import { cn } from "../../../../lib/utils";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── TYPES ───
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];
type CoverLetter = Database["public"]["Tables"]["cover_letters"]["Row"];
type ApiKeyUsageLog = Database["public"]["Tables"]["api_key_usage_logs"]["Row"];

type EnrichedUsageLog = ApiKeyUsageLog & {
  user_name?: string;
  user_role?: string;
};

interface TelemetrySnapshot {
  users: { total: number; premium: number; admin: number; members: number };
  apps: { total: number; successful: number; failed: number };
  letters: { total: number; avgScore: number };
  infra: {
    totalTokensBurned: number;
    totalCostUsd: number;
    avgTokensPerCall: number;
    latencyMs: string;
  };
  keys: { count: number; active: number };
}

// ─── THEME ───
const THEME = {
  obsidian: "#000012",
  cyan: "#00F0FF",
  danger: "#FF007F",
  success: "#32FF00",
  warning: "#F59E0B",
  purple: "#8A2BE2",
  slate: "#94a3b8",
  pink: "#FF007F",
};

const IS_WEB = Platform.OS === "web";

const strictInputStyle = {
  flex: 1,
  height: "100%",
  color: "#FFFFFF",
  fontSize: 13,
  paddingVertical: 0,
  margin: 0,
  textAlignVertical: "center",
  ...(IS_WEB ? { outlineStyle: "none" } : {}),
} as any;

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: AMBIENT ENGINE (Wandering Core + Nebula)
// ══════════════════════════════════════════════════════════════════════════════

const SingleRipple = memo(({ color, delay, duration, maxSize }: any) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.sin) }),
        -1,
        false,
      ),
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, maxSize]),
    height: interpolate(progress.value, [0, 1], [0, maxSize]),
    borderRadius: interpolate(progress.value, [0, 1], [0, maxSize / 2]),
    opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 0.15, 0.02, 0]),
    borderWidth: interpolate(progress.value, [0, 1], [60, 20]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          borderColor: color,
          backgroundColor: "transparent",
        },
        animatedStyle,
      ]}
    />
  );
});
SingleRipple.displayName = "SingleRipple";

interface GlidingEmitterProps {
  coreSize: number;
  color: string;
  maxWaveSize: number;
  waveCount: number;
  baseDuration: number;
}

const WanderingCore = memo(
  ({
    coreSize,
    color,
    maxWaveSize,
    waveCount,
    baseDuration,
  }: GlidingEmitterProps) => {
    const { width, height } = Dimensions.get("window");
    const time = useSharedValue(0);
    const stagger = baseDuration / waveCount;

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame === null) return;
      time.value += frameInfo.timeSincePreviousFrame / 3000;
    });

    const animatedPosition = useAnimatedStyle(() => {
      const xOffset = Math.sin(time.value * 0.4) * (width * 0.3);
      const yOffset = Math.cos(time.value * 0.3) * (height * 0.2);

      return {
        transform: [
          { translateX: width / 2 + xOffset },
          { translateY: height / 2 + yOffset },
        ],
      };
    });

    const corePulse = useSharedValue(0.4);
    useEffect(() => {
      corePulse.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, [corePulse]);

    const coreStyle = useAnimatedStyle(() => ({
      opacity: interpolate(corePulse.value, [0.4, 1], [0.4, 1]),
      transform: [{ scale: interpolate(corePulse.value, [0.4, 1], [0.5, 1]) }],
    }));

    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedPosition,
        ]}
      >
        {Array.from({ length: waveCount }).map((_, index) => (
          <SingleRipple
            key={`ripple-${index}`}
            color={color}
            delay={index * stagger}
            duration={baseDuration}
            maxSize={maxWaveSize}
          />
        ))}

        <Animated.View
          style={[
            coreStyle,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              backgroundColor: color,
              shadowColor: color,
              shadowRadius: 15,
              shadowOpacity: 1,
              shadowOffset: { width: 0, height: 0 },
              ...(IS_WEB ? ({ boxShadow: `0 0 20px ${color}` } as any) : {}),
            },
          ]}
        />
      </Animated.View>
    );
  },
);
WanderingCore.displayName = "WanderingCore";

const OrganicOrb = memo(
  ({
    color,
    size,
    initialX,
    initialY,
    speedX,
    speedY,
    phaseOffsetX,
    phaseOffsetY,
    opacityBase,
  }: any) => {
    const { width, height } = Dimensions.get("window");
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame === null) return;
      time.value += frameInfo.timeSincePreviousFrame / 1000;
    });

    const animatedStyle = useAnimatedStyle(() => {
      const xOffset =
        Math.sin(time.value * speedX + phaseOffsetX) * (width * 0.3);
      const yOffset =
        Math.cos(time.value * speedY + phaseOffsetY) * (height * 0.2);
      const breathe = 1 + Math.sin(time.value * 0.5) * 0.15;

      return {
        transform: [
          { translateX: initialX + xOffset },
          { translateY: initialY + yOffset },
          { scale: breathe },
        ],
        opacity: opacityBase + Math.sin(time.value * 0.5) * 0.02,
      };
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -size / 2,
            left: -size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            ...(IS_WEB ? ({ filter: "blur(60px)" } as any) : {}),
          },
          animatedStyle,
        ]}
      />
    );
  },
);
OrganicOrb.displayName = "OrganicOrb";

const AmbientArchitecture = memo(() => {
  const { width, height } = Dimensions.get("window");
  const isDesktop = width >= 1024;
  const massiveWaveRadius = isDesktop ? width * 0.4 : height * 1.0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <OrganicOrb
        color={THEME.pink}
        size={width * 0.6}
        initialX={width * 0.8}
        initialY={height * 0.6}
        speedX={0.15}
        speedY={0.2}
        phaseOffsetX={Math.PI}
        phaseOffsetY={0}
        opacityBase={0.06}
      />
      <OrganicOrb
        color={THEME.cyan}
        size={width * 0.4}
        initialX={width * 0.5}
        initialY={height * 0.8}
        speedX={0.25}
        speedY={0.1}
        phaseOffsetX={Math.PI / 4}
        phaseOffsetY={Math.PI}
        opacityBase={0.04}
      />
      <WanderingCore
        coreSize={14}
        color="#02AABC"
        maxWaveSize={massiveWaveRadius}
        waveCount={4}
        baseDuration={12000}
      />
    </View>
  );
});
AmbientArchitecture.displayName = "AmbientArchitecture";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: MASTER DASHBOARD CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminCommandCenter() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const isMobile = SCREEN_WIDTH < 768;

  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"OPERATIONAL" | "DEGRADED">(
    "OPERATIONAL",
  );
  const [expandedAlerts, setExpandedAlerts] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    users: { total: 0, premium: 0, admin: 0, members: 0 },
    apps: { total: 0, successful: 0, failed: 0 },
    letters: { total: 0, avgScore: 0 },
    infra: {
      totalTokensBurned: 0,
      totalCostUsd: 0,
      avgTokensPerCall: 0,
      latencyMs: "0ms",
    },
    keys: { count: 0, active: 0 },
  });

  const [registryPreview, setRegistryPreview] = useState<Profile[]>([]);
  const [failedApps, setFailedApps] = useState<JobApplication[]>([]);
  const [liveStream, setLiveStream] = useState<EnrichedUsageLog[]>([]);

  // SaaS Forecaster Simulation Inputs
  const [inputs, setInputs] = useState({
    mau: "2500",
    subPrice: "29",
    avgAppsPerUser: "25",
    storeFee: "15",
    taxRate: "20",
  });

  const synchronizeTelemetry = useCallback(async () => {
    const syncStartTime = Date.now();
    try {
      const [
        { data: profiles },
        { data: applications },
        { data: letters },
        { data: usageLogs },
        { data: systemKeys },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("job_applications")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("cover_letters")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("api_key_usage_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("system_api_keys").select("id, is_active"),
      ]);

      const dbLatency = Date.now() - syncStartTime;

      const safeProfiles = (profiles as Profile[]) || [];
      const safeApps = (applications as JobApplication[]) || [];
      const safeLetters = (letters as CoverLetter[]) || [];
      const safeLogs = (usageLogs as ApiKeyUsageLog[]) || [];
      const safeKeys =
        (systemKeys as { id: string; is_active: boolean }[]) || [];

      const premiumCount = safeProfiles.filter(
        (p) => p.role === "premium",
      ).length;
      const adminCount = safeProfiles.filter((p) => p.role === "admin").length;
      const memberCount = safeProfiles.filter(
        (p) => p.role === "member",
      ).length;

      const totalTokens = safeLogs.reduce(
        (acc, curr) => acc + (curr.tokens_used || 0),
        0,
      );
      const totalCost = safeLogs.reduce(
        (acc, curr) => acc + Number(curr.cost_estimate_usd || 0),
        0,
      );
      const avgTokens =
        safeLogs.length > 0 ? Math.round(totalTokens / safeLogs.length) : 0;

      const failedApplicationList = safeApps.filter(
        (a) => a.status === "rejected",
      );

      const validScores = safeLetters
        .map((l) => l.ats_score)
        .filter((s): s is number => typeof s === "number");
      const avgScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((a, b) => a + b, 0) / validScores.length,
            )
          : 0;

      setTelemetry({
        users: {
          total: safeProfiles.length,
          premium: premiumCount,
          admin: adminCount,
          members: memberCount,
        },
        apps: {
          total: safeApps.length,
          successful: safeApps.filter(
            (a) =>
              a.status === "applied" ||
              a.status === "offer" ||
              a.status === "interview",
          ).length,
          failed: failedApplicationList.length,
        },
        letters: {
          total: safeLetters.length,
          avgScore,
        },
        infra: {
          totalTokensBurned: totalTokens,
          totalCostUsd: totalCost,
          avgTokensPerCall: avgTokens,
          latencyMs: `${dbLatency}ms`,
        },
        keys: {
          count: safeKeys.length,
          active: safeKeys.filter((k) => k.is_active).length,
        },
      });

      setFailedApps(failedApplicationList.slice(0, 10));
      setRegistryPreview(safeProfiles.slice(0, 6));

      // Enrich real-time usage log stream with matching profile info
      setLiveStream(
        safeLogs.map((log) => {
          const matchedProfile = safeProfiles.find((p) => p.id === log.user_id);
          const fullName = matchedProfile
            ? `${matchedProfile.first_name || ""} ${matchedProfile.last_name || ""}`.trim()
            : null;
          return {
            ...log,
            user_name:
              fullName ||
              matchedProfile?.email?.split("@")[0] ||
              (log.user_id
                ? `USR: ${log.user_id.slice(0, 8)}`
                : "System Daemon"),
            user_role: matchedProfile?.role || "member",
          };
        }),
      );

      setHealthStatus(dbLatency > 2000 ? "DEGRADED" : "OPERATIONAL");
    } catch (err) {
      console.error("[TELEMETRY FAULT]:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    synchronizeTelemetry();
    const channel = supabase
      .channel(`admin_kernel_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        synchronizeTelemetry,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications" },
        synchronizeTelemetry,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cover_letters" },
        synchronizeTelemetry,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "api_key_usage_logs" },
        synchronizeTelemetry,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [synchronizeTelemetry]);

  // SaaS Forecaster Computed Metrics
  const saasFinancials = useMemo(() => {
    const mau = parseFloat(inputs.mau) || 0;
    const price = parseFloat(inputs.subPrice) || 0;
    const avgApps = parseFloat(inputs.avgAppsPerUser) || 0;
    const feePct = parseFloat(inputs.storeFee) || 0;
    const taxPct = parseFloat(inputs.taxRate) || 0;

    const grossMRR = mau * price;
    const storeFeeDeduction = grossMRR * (feePct / 100);
    const taxDeduction = grossMRR * (taxPct / 100);
    const netAfterPlatforms = grossMRR - storeFeeDeduction - taxDeduction;

    // AI generation cost per user (avg tokens per generation: ~2200, $0.50/M tokens)
    const estimatedCostPerApp =
      ((telemetry.infra.avgTokensPerCall || 2000) / 1000000) * 0.65;
    const totalApiBurnCost = mau * avgApps * estimatedCostPerApp;

    const netProfit = netAfterPlatforms - totalApiBurnCost;
    const margin = grossMRR > 0 ? (netProfit / grossMRR) * 100 : 0;
    const arr = netProfit * 12;

    return {
      gross: grossMRR,
      storeCut: storeFeeDeduction,
      taxCut: taxDeduction,
      apiCost: totalApiBurnCost,
      net: netProfit,
      arr,
      margin,
    };
  }, [inputs, telemetry.infra.avgTokensPerCall]);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
      <View
        style={[StyleSheet.absoluteFill, { zIndex: -1, elevation: -1 }]}
        pointerEvents="none"
      >
        <AmbientArchitecture />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{
              paddingHorizontal: isMobile ? 16 : 36,
              paddingTop: 20,
              paddingBottom: 140,
              maxWidth: 1240,
              alignSelf: "center",
              width: "100%",
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  synchronizeTelemetry();
                }}
                tintColor={THEME.cyan}
              />
            }
          >
            {/* ════════ 1. COMMAND HEADER ════════ */}
            <FadeIn delay={100} className="z-50 mb-10 flex-col">
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/(dashboard)")}
                delayPressIn={0}
                className="mb-6 flex-row items-center gap-x-2.5 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                activeOpacity={0.7}
              >
                <ArrowBigLeftDash size={18} color={THEME.cyan} />
                <Text className="font-mono text-xs font-bold tracking-wider text-white/80">
                  DASHBOARD
                </Text>
              </TouchableOpacity>

              <View className="w-full flex-row items-start justify-between">
                <View>
                  <Text className="font-mono text-3xl font-black uppercase tracking-widest text-white md:text-4xl">
                    KERNEL
                  </Text>
                  <Text className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00F0FF]/80 md:text-xs">
                    OpusHunter Admin Command Center
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setRefreshing(true);
                      synchronizeTelemetry();
                    }}
                    delayPressIn={0}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-95"
                  >
                    <RefreshCcw size={16} color={THEME.cyan} />
                  </TouchableOpacity>

                  <View
                    style={{
                      shadowColor:
                        healthStatus === "OPERATIONAL"
                          ? THEME.success
                          : THEME.warning,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      elevation: 4,
                      ...(IS_WEB
                        ? ({
                            boxShadow: `0 4px 14px ${healthStatus === "OPERATIONAL" ? THEME.success : THEME.warning}40`,
                          } as any)
                        : {}),
                    }}
                    className={cn(
                      "flex-row items-center rounded-full border px-4 py-2.5",
                      healthStatus === "OPERATIONAL"
                        ? "border-[#17fcb8]/40 bg-[#32FF00]/10"
                        : "border-[#F59E0B]/40 bg-[#01111f]/10",
                    )}
                  >
                    <Activity
                      size={13}
                      color={
                        healthStatus === "OPERATIONAL"
                          ? THEME.success
                          : THEME.warning
                      }
                    />
                    <Text
                      className={cn(
                        "ml-2 font-mono text-[10px] font-black uppercase tracking-widest md:text-[11px]",
                        healthStatus === "OPERATIONAL"
                          ? "text-[#00ffd5]"
                          : "text-[#F59E0B]",
                      )}
                    >
                      {healthStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </FadeIn>

            {/* ════════ 2. DIAGNOSTICS BAR ════════ */}
            <FadeIn delay={200}>
              <GlassCard className="mb-10 flex-col gap-4 rounded-3xl border border-white/5 bg-white/[0.015] p-5 md:flex-row md:items-center md:justify-between md:rounded-[32px] md:p-6">
                <View className="flex-row items-center gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                    <Server size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                      Database Latency
                    </Text>
                    <Text className="font-mono text-base font-black text-white/90">
                      {telemetry.infra.latencyMs}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl border border-[#32FF00]/20 bg-[#32FF00]/10">
                    <Lock size={20} color={THEME.success} />
                  </View>
                  <View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                      Security Clearance
                    </Text>
                    <Text className="font-mono text-base font-black text-[#32FF00]">
                      RLS & Definer Active
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                    <ShieldCheck size={20} color={THEME.warning} />
                  </View>
                  <View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                      System Heartbeat
                    </Text>
                    <Text className="font-mono text-base font-black text-[#F59E0B]">
                      {healthStatus}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </FadeIn>

            {/* ════════ 3. MANAGER SNAPSHOT TILES ════════ */}
            <View className="mb-6 flex-row items-center gap-3">
              <Layers size={14} color="#fff" />
              <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                Telemetry & Modules
              </Text>
            </View>

            <View className="mb-10 flex-col flex-wrap gap-4 md:flex-row">
              {/* Tile 1: User Accounts */}
              <View className="w-full min-w-[240px] md:flex-1">
                <GlassCard className="h-40 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-0">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    delayPressIn={0}
                    onPress={() =>
                      router.navigate("/(tabs)/(dashboard)/admin/users")
                    }
                    className="flex-1 flex-col justify-between p-6 transition-colors hover:bg-white/[0.03]"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10">
                        <Users size={18} color={THEME.cyan} />
                      </View>
                      <ArrowUpRight
                        size={18}
                        color={THEME.cyan}
                        opacity={0.6}
                      />
                    </View>
                    <View>
                      <Text className="font-mono text-3xl font-black text-white">
                        {telemetry.users.total}
                      </Text>
                      <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                        Total Users ({telemetry.users.premium} Premium)
                      </Text>
                    </View>
                  </TouchableOpacity>
                </GlassCard>
              </View>

              {/* Tile 2: Job Applications */}
              <View className="w-full min-w-[240px] md:flex-1">
                <GlassCard className="h-40 flex-col justify-between rounded-3xl border-white/5 bg-white/[0.015] p-6">
                  <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/10">
                    <Send size={18} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-mono text-3xl font-black text-[#3B82F6]">
                      {telemetry.apps.total}
                    </Text>
                    <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                      Pipeline Applications
                    </Text>
                  </View>
                </GlassCard>
              </View>

              {/* Tile 3: AI Cover Letters */}
              <View className="w-full min-w-[240px] md:flex-1">
                <GlassCard className="h-40 flex-col justify-between rounded-3xl border-white/5 bg-white/[0.015] p-6">
                  <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#8A2BE2]/20 bg-[#8A2BE2]/10">
                    <FileText size={18} color={THEME.purple} />
                  </View>
                  <View>
                    <Text className="font-mono text-3xl font-black text-[#8A2BE2]">
                      {telemetry.letters.total}
                    </Text>
                    <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                      Cover Letters (Avg {telemetry.letters.avgScore}%)
                    </Text>
                  </View>
                </GlassCard>
              </View>

              {/* Tile 4: System Alerts */}
              <View className="w-full min-w-[240px] md:flex-1">
                <GlassCard className="min-h-[160px] flex-col justify-between rounded-3xl border-white/5 bg-white/[0.015] p-6">
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#FF007F]/20 bg-[#FF007F]/10">
                      <AlertTriangle
                        size={18}
                        color={
                          telemetry.apps.failed > 0 ? THEME.danger : "#64748b"
                        }
                      />
                    </View>
                    {telemetry.apps.failed > 0 && (
                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => {
                          LayoutAnimation.configureNext(
                            LayoutAnimation.Presets.easeInEaseOut,
                          );
                          setExpandedAlerts(!expandedAlerts);
                        }}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 active:scale-95"
                      >
                        <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white">
                          {expandedAlerts ? "HIDE" : "LOGS"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {expandedAlerts ? (
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      className="mt-2 max-h-[80px]"
                    >
                      {failedApps.map((a) => (
                        <View
                          key={a.id}
                          className="border-b border-white/5 py-2"
                        >
                          <Text
                            className="text-[10px] font-bold text-[#FF007F]"
                            numberOfLines={1}
                          >
                            {a.notes ||
                              a.ats_provider ||
                              `Job Ref: ${a.job_id.slice(0, 8)}`}
                          </Text>
                          <Text className="mt-0.5 font-mono text-[8px] text-white/40">
                            Status: {a.status} •{" "}
                            {new Date(a.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View>
                      <Text
                        className={cn(
                          "font-mono text-3xl font-black",
                          telemetry.apps.failed > 0
                            ? "text-[#FF007F]"
                            : "text-white/80",
                        )}
                      >
                        {telemetry.apps.failed}
                      </Text>
                      <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                        Application Rejections
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </View>
            </View>

            {/* ════════ 4. SYSTEM API VAULT BANNER ════════ */}
            <View className="mb-6 flex-row items-center gap-3">
              <KeyRound size={14} color="#fff" />
              <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                API Cascade & Fallback Routing
              </Text>
            </View>

            <GlassCard className="mb-12 flex-col items-center justify-between gap-y-6 rounded-3xl border border-white/5 bg-white/[0.015] p-6 md:flex-row md:gap-y-0 md:p-8">
              <View>
                <Text className="mb-2 font-mono text-xl font-black uppercase tracking-widest text-white">
                  Autonomous API Key Vault
                </Text>
                <Text className="max-w-[420px] text-xs leading-relaxed text-white/50">
                  Manage multi-provider fallback cascades (Gemini, OpenAI,
                  Anthropic, Groq, RapidAPI), inspect token burn telemetry, and
                  configure active system credentials.
                </Text>
                <View className="mt-4 flex-row items-center gap-5">
                  <View>
                    <Text className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                      System Fallback Keys
                    </Text>
                    <Text className="font-mono text-sm font-black text-[#00F0FF]">
                      {telemetry.keys.active} / {telemetry.keys.count} Active
                    </Text>
                  </View>
                  <View className="h-6 w-[1px] bg-white/10" />
                  <View>
                    <Text className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                      Estimated API Burn
                    </Text>
                    <Text className="font-mono text-sm font-black text-[#32FF00]">
                      ${telemetry.infra.totalCostUsd.toFixed(3)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.navigate("/(tabs)/(dashboard)/admin/api-keys")
                }
                delayPressIn={0}
                className="w-full flex-row items-center justify-center rounded-2xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-8 py-4 transition-transform active:scale-95 md:w-auto"
              >
                <Text className="mr-3 font-mono text-xs font-black uppercase tracking-widest text-[#00F0FF]">
                  Enter Key Vault
                </Text>
                <ExternalLink size={16} color={THEME.cyan} />
              </TouchableOpacity>
            </GlassCard>

            {/* ════════ 5. SAAS FORECASTER 2.0 ════════ */}
            <View className="mb-6 flex-row items-center gap-3">
              <Coins size={14} color="#facc15" />
              <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                Economic Engine & SaaS Forecaster
              </Text>
            </View>

            <GlassCard className="mb-12 rounded-3xl border-white/5 bg-white/[0.015] p-6 md:p-8">
              <View className="flex-col gap-8 lg:flex-row">
                {/* Inputs */}
                <View className="flex-1 border-white/10 pb-8 lg:border-r lg:pb-0 lg:pr-8">
                  <Text className="mb-4 font-mono text-xs font-black uppercase tracking-widest text-white/80">
                    Simulation Parameters
                  </Text>
                  <View className="flex-col gap-4">
                    <View className="flex-col gap-4 sm:flex-row">
                      <View className="flex-1">
                        <Text className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-white/50">
                          Active Users (MAU)
                        </Text>
                        <View className="h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
                          <TextInput
                            keyboardType="numeric"
                            value={inputs.mau}
                            onChangeText={(v) =>
                              setInputs((p) => ({ ...p, mau: v }))
                            }
                            style={strictInputStyle}
                          />
                        </View>
                      </View>
                      <View className="flex-1">
                        <Text className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-white/50">
                          Premium Sub ($/mo)
                        </Text>
                        <View className="h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
                          <TextInput
                            keyboardType="numeric"
                            value={inputs.subPrice}
                            onChangeText={(v) =>
                              setInputs((p) => ({ ...p, subPrice: v }))
                            }
                            style={strictInputStyle}
                          />
                        </View>
                      </View>
                    </View>

                    <View className="flex-col gap-4 sm:flex-row">
                      <View className="flex-1">
                        <View className="mb-2 flex-row items-center gap-1.5">
                          <Clock size={12} color={THEME.warning} />
                          <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/80">
                            Avg Apps/User
                          </Text>
                        </View>
                        <View className="h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
                          <TextInput
                            keyboardType="numeric"
                            value={inputs.avgAppsPerUser}
                            onChangeText={(v) =>
                              setInputs((p) => ({ ...p, avgAppsPerUser: v }))
                            }
                            style={strictInputStyle}
                          />
                        </View>
                      </View>
                      <View className="flex-1">
                        <View className="mb-2 flex-row items-center gap-1.5">
                          <Landmark size={12} color={THEME.danger} />
                          <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/80">
                            Platform Cut %
                          </Text>
                        </View>
                        <View className="h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
                          <TextInput
                            keyboardType="numeric"
                            value={inputs.storeFee}
                            onChangeText={(v) =>
                              setInputs((p) => ({ ...p, storeFee: v }))
                            }
                            style={strictInputStyle}
                          />
                        </View>
                      </View>
                      <View className="flex-1">
                        <View className="mb-2 flex-row items-center gap-1.5">
                          <Receipt size={12} color={THEME.danger} />
                          <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/80">
                            VAT / Tax %
                          </Text>
                        </View>
                        <View className="h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
                          <TextInput
                            keyboardType="numeric"
                            value={inputs.taxRate}
                            onChangeText={(v) =>
                              setInputs((p) => ({ ...p, taxRate: v }))
                            }
                            style={strictInputStyle}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Outputs */}
                <View className="flex-1 justify-center">
                  <View className="mb-6 flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <View>
                      <Text className="mb-1 font-mono text-[10px] font-black uppercase tracking-widest text-white/40">
                        Gross MRR
                      </Text>
                      <Text className="font-mono text-3xl font-black tracking-tighter text-white sm:text-4xl">
                        {formatter.format(saasFinancials.gross)}
                      </Text>
                    </View>
                    <View className="items-start gap-1 sm:items-end">
                      <Text className="font-mono text-[10px] text-[#FF007F]">
                        - {formatter.format(saasFinancials.storeCut)} (Platform)
                      </Text>
                      <Text className="font-mono text-[10px] text-[#FF007F]">
                        - {formatter.format(saasFinancials.taxCut)} (VAT/Tax)
                      </Text>
                      <Text className="font-mono text-[10px] text-[#8A2BE2]">
                        - {formatter.format(saasFinancials.apiCost)} (AI API
                        Burn)
                      </Text>
                    </View>
                  </View>

                  <View className="flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <View>
                      <Text className="mb-1 font-mono text-[10px] font-black uppercase tracking-widest text-[#32FF00]">
                        Net MRR Forecast
                      </Text>
                      <Text className="font-mono text-2xl font-black tracking-tighter text-[#32FF00] sm:text-3xl">
                        {formatter.format(saasFinancials.net)}
                      </Text>
                      <Text className="mt-1 font-mono text-[10px] text-white/40">
                        ARR: {formatter.format(saasFinancials.arr)}
                      </Text>
                    </View>
                    <View className="items-start sm:items-end">
                      <Text className="mb-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                        Net Margin
                      </Text>
                      <Text className="font-mono text-2xl font-black text-white">
                        {saasFinancials.margin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </GlassCard>

            {/* ════════ 6. IDENTITY REGISTRY PREVIEW ════════ */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Users size={14} color="#fff" />
                <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                  User Registry Live Preview
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.navigate("/(tabs)/(dashboard)/admin/users")
                }
                className="flex-row items-center gap-1.5"
              >
                <Text className="font-mono text-xs font-bold text-[#00F0FF]">
                  View All
                </Text>
                <ChevronRight size={14} color="#00F0FF" />
              </TouchableOpacity>
            </View>

            <GlassCard className="mb-12 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-0">
              <View className="hidden flex-row items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4 md:flex">
                <Text className="w-1/3 pr-4 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  User Identity
                </Text>
                <Text className="w-1/4 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  Role Clearance
                </Text>
                <Text className="w-1/4 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  Profile Status
                </Text>
                <View className="w-8" />
              </View>

              {registryPreview.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <ActivityIndicator color={THEME.cyan} />
                </View>
              ) : (
                registryPreview.map((profile, idx) => {
                  const fullName =
                    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                    "Anonymous Hunter";
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      activeOpacity={0.7}
                      delayPressIn={0}
                      onPress={() =>
                        router.navigate("/(tabs)/(dashboard)/admin/users")
                      }
                      className={cn(
                        "flex-col px-6 py-4 transition-colors hover:bg-white/[0.02] md:flex-row md:items-center",
                        idx !== registryPreview.length - 1 &&
                          "border-b border-white/5",
                      )}
                    >
                      <View className="mb-3 w-full md:mb-0 md:w-1/3 md:pr-4">
                        <Text
                          className="text-sm font-bold text-white/90 md:text-xs"
                          numberOfLines={1}
                        >
                          {fullName}
                        </Text>
                        <Text
                          className="mt-0.5 font-mono text-[10px] text-white/40 md:text-[9px]"
                          numberOfLines={1}
                        >
                          {profile.email}
                        </Text>
                      </View>

                      <View className="mb-3 w-full flex-row md:mb-0 md:w-1/4">
                        <View
                          className={cn(
                            "rounded-full border px-2.5 py-1",
                            profile.role === "admin"
                              ? "border-[#8A2BE2]/30 bg-[#8A2BE2]/10"
                              : profile.role === "premium"
                                ? "border-[#00F0FF]/30 bg-[#00F0FF]/10"
                                : "border-white/10 bg-white/5",
                          )}
                        >
                          <Text
                            className={cn(
                              "font-mono text-[8px] font-black uppercase tracking-widest",
                              profile.role === "admin"
                                ? "text-[#8A2BE2]"
                                : profile.role === "premium"
                                  ? "text-[#00F0FF]"
                                  : "text-white/50",
                            )}
                          >
                            {profile.role || "MEMBER"}
                          </Text>
                        </View>
                      </View>

                      <View className="mb-2 w-full flex-row items-center gap-2 md:mb-0 md:w-1/4">
                        <Sparkles
                          size={12}
                          color={
                            profile.profile_complete
                              ? THEME.success
                              : THEME.warning
                          }
                        />
                        <Text className="font-mono text-[10px] font-bold text-white/70 md:text-[9px]">
                          {profile.profile_complete
                            ? "Complete"
                            : "Pending Setup"}
                        </Text>
                      </View>

                      <View className="hidden w-8 items-end md:flex">
                        <ChevronRight size={14} color="#ffffff30" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </GlassCard>

            {/* ════════ 7. REAL-TIME ENGINE STREAM ════════ */}
            <View className="mb-6 flex-row items-center gap-3">
              <History size={14} color="#fff" />
              <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                Real-Time API & Engine Stream
              </Text>
            </View>

            <GlassCard className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.015] p-0">
              <View className="hidden flex-row items-center border-b border-white/5 bg-white/[0.02] px-6 py-4 md:flex">
                <Text className="w-1/3 pr-4 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  Function & Provider
                </Text>
                <Text className="flex-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  Telemetry Metadata
                </Text>
                <Text className="w-24 text-right font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                  Timestamp
                </Text>
              </View>

              {liveStream.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Text className="font-mono text-xs uppercase tracking-widest text-white/40">
                    Awaiting live engine transactions...
                  </Text>
                </View>
              ) : (
                liveStream.map((log, idx) => (
                  <Animated.View
                    key={log.id}
                    entering={FadeInDown.delay(idx * 40)}
                    style={IS_WEB ? { width: "100%" } : undefined}
                  >
                    <View
                      className={cn(
                        "flex-col px-6 py-4 transition-colors hover:bg-white/[0.03] md:flex-row md:items-center",
                        idx !== liveStream.length - 1 &&
                          "border-b border-white/5",
                      )}
                    >
                      <View className="mb-3 w-full flex-row items-center justify-between pr-0 md:mb-0 md:w-1/3 md:pr-4">
                        <View className="flex-1 flex-row items-center pr-2">
                          <View className="mr-3 h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                            {log.function_name?.includes("cover") ? (
                              <Cpu size={14} color={THEME.purple} />
                            ) : (
                              <Zap size={14} color={THEME.cyan} />
                            )}
                          </View>
                          <View>
                            <Text
                              className="shrink font-mono text-xs font-bold tracking-wide text-white/90 md:text-sm"
                              numberOfLines={1}
                            >
                              {log.function_name || "engine-action"}
                            </Text>
                            <Text className="mt-0.5 font-mono text-[9px] uppercase text-white/40">
                              {log.provider} • {log.key_source}
                            </Text>
                          </View>
                        </View>
                        <Text className="ml-2 shrink-0 font-mono text-[9px] text-white/40 md:hidden">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </Text>
                      </View>

                      <View className="w-full flex-row flex-wrap items-center gap-2 md:flex-1">
                        <View className="rounded-lg border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-2 py-1">
                          <Text className="font-mono text-[8px] font-bold text-[#00F0FF] md:text-[9px]">
                            {log.tokens_used || 0} TOKENS
                          </Text>
                        </View>
                        {log.cost_estimate_usd > 0 && (
                          <View className="rounded-lg border border-[#32FF00]/20 bg-[#32FF00]/10 px-2 py-1">
                            <Text className="font-mono text-[8px] font-bold text-[#32FF00] md:text-[9px]">
                              ${Number(log.cost_estimate_usd).toFixed(4)}
                            </Text>
                          </View>
                        )}
                        <View className="mt-1 flex-row items-center gap-1.5 md:mt-0">
                          <Text className="font-mono text-[8px] font-black uppercase tracking-widest text-white/50 md:text-[9px]">
                            {log.user_name}
                          </Text>
                          {log.user_role === "admin" && (
                            <View className="rounded border border-[#8A2BE2]/30 bg-[#8A2BE2]/15 px-1.5 py-0.5">
                              <Text className="font-mono text-[7px] font-bold uppercase tracking-wider text-[#8A2BE2]">
                                Admin
                              </Text>
                            </View>
                          )}
                          {log.user_role === "premium" && (
                            <View className="rounded border border-[#00F0FF]/30 bg-[#00F0FF]/15 px-1.5 py-0.5">
                              <Text className="font-mono text-[7px] font-bold uppercase tracking-wider text-[#00F0FF]">
                                Premium
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View className="hidden w-24 items-end justify-end pl-4 md:flex">
                        <Text className="text-right font-mono text-[10px] text-white/40">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ))
              )}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
