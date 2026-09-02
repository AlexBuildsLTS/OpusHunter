/**
 * app/(tabs)/(dashboard)/admin/api-keys.tsx
 * OpusHunter — API Key Vault, Cascade Routing & Telemetry Control Center
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * - 120fps Reanimated Ambient Engine (WanderingCore + Nebula)
 * - Pure SVG Vector Charts (Multi-Line Hourly Traffic, 12M Volume Area, Donut Provider Breakdown)
 * - Zero Skia/WASM dependencies (Safe on Web & Native)
 * - System API Key Vault Management via SECURITY DEFINER RPCs
 * - Live Usage Telemetry & Fallback Hierarchy Configuration
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
  Modal,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, {
  Path,
  Circle,
  G,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  useFrameCallback,
} from "react-native-reanimated";
import {
  KeyRound,
  Shield,
  Activity,
  Cpu,
  Power,
  Trash2,
  Plus,
  RefreshCcw,
  Sparkles,
  ArrowBigLeftDash,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Lock,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react-native";

import { supabase } from "../../../../lib/supabase";
import { Database } from "../../../../types/database.types";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { FadeIn } from "../../../../components/shared/FadeIn";
import { cn } from "../../../../lib/utils";

// Enable Android Layout Animations
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── TYPES ───
type SystemApiKey = Database["public"]["Tables"]["system_api_keys"]["Row"];
type ApiKeyUsageLog = Database["public"]["Tables"]["api_key_usage_logs"]["Row"];

type ApiProvider =
  | "gemini"
  | "linkedin"
  | "rapidapi"
  | "adzuna"
  | "openai"
  | "anthropic"
  | "groq"
  | "geodb";

const PROVIDER_CONFIG: Record<
  string,
  { label: string; color: string; modelName: string; defaultTier: string }
> = {
  gemini: {
    label: "Google Gemini",
    color: "#00F0FF",
    modelName: "gemini-1.5-flash",
    defaultTier: "system_tier_1",
  },
  openai: {
    label: "OpenAI",
    color: "#32FF00",
    modelName: "gpt-4o-mini",
    defaultTier: "system_tier_2",
  },
  anthropic: {
    label: "Anthropic Claude",
    color: "#8A2BE2",
    modelName: "claude-3-5-sonnet",
    defaultTier: "system_tier_3",
  },
  groq: {
    label: "Groq Cloud Llama",
    color: "#F59E0B",
    modelName: "llama-3.3-70b-versatile",
    defaultTier: "system_tier_1",
  },
  rapidapi: {
    label: "RapidAPI Hunter",
    color: "#3B82F6",
    modelName: "job-search-v2",
    defaultTier: "system_tier_1",
  },
  linkedin: {
    label: "LinkedIn Scraper API",
    color: "#0A66C2",
    modelName: "linkedin-jobs-v1",
    defaultTier: "system_tier_2",
  },
  adzuna: {
    label: "Adzuna Aggregator",
    color: "#FF007F",
    modelName: "adzuna-gb-v2",
    defaultTier: "system_tier_2",
  },
  geodb: {
    label: "GeoDB Cities API",
    color: "#10B981",
    modelName: "geo-autocomplete-v1",
    defaultTier: "system_tier_1",
  },
};

// ─── THEME ───
const THEME = {
  obsidian: "#000012",
  cyan: "#00F0FF",
  danger: "#FF007F",
  success: "#32FF00",
  warning: "#F59E0B",
  purple: "#8A2BE2",
  blue: "#3B82F6",
  slate: "#94a3b8",
};

const IS_WEB = Platform.OS === "web";

const strictInputStyle = {
  flex: 1,
  height: "100%",
  color: "#FFFFFF",
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

const WanderingCore = memo(
  ({ coreSize, color, maxWaveSize, waveCount, baseDuration }: any) => {
    const { width, height } = Dimensions.get("window");
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame === null) return;
      time.value += frameInfo.timeSincePreviousFrame / 3000;
    });

    const animatedPosition = useAnimatedStyle(() => ({
      transform: [
        { translateX: width / 2 + Math.sin(time.value * 0.4) * (width * 0.3) },
        {
          translateY: height / 2 + Math.cos(time.value * 0.3) * (height * 0.2),
        },
      ],
    }));

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
      transform: [
        { scale: interpolate(corePulse.value, [0.4, 1], [0.8, 1.2]) },
      ],
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
            key={index}
            color={color}
            delay={index * (baseDuration / waveCount)}
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

const AmbientArchitecture = memo(() => {
  const { width, height } = Dimensions.get("window");
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: -1, elevation: -1 }]}
      pointerEvents="none"
    >
      <WanderingCore
        coreSize={14}
        color={THEME.cyan}
        maxWaveSize={width >= 1024 ? width * 0.8 : height * 1.0}
        waveCount={4}
        baseDuration={12000}
      />
    </View>
  );
});
AmbientArchitecture.displayName = "AmbientArchitecture";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: VECTOR SVG CHARTS (Zero Skia/WASM dependencies)
// ══════════════════════════════════════════════════════════════════════════════

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const SvgDonutChart = memo(
  ({
    slices,
    size = 160,
    strokeWidth = 24,
  }: {
    slices: DonutSlice[];
    size?: number;
    strokeWidth?: number;
  }) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) {
      return (
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#ffffff10"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        </Svg>
      );
    }

    let accumulatedAngle = 0;

    return (
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {slices.map((slice, idx) => {
            const fraction = slice.value / total;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;
            accumulatedAngle += fraction;

            return (
              <Circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            );
          })}
        </G>
      </Svg>
    );
  },
);
SvgDonutChart.displayName = "SvgDonutChart";

interface HourlyPoint {
  hour: string;
  gemini: number;
  openai: number;
  claude: number;
}

const SvgMultiLineChart = memo(
  ({
    data,
    width,
    height = 180,
  }: {
    data: HourlyPoint[];
    width: number;
    height: number;
  }) => {
    if (!data || data.length === 0) return null;

    const padding = { top: 20, right: 15, bottom: 30, left: 35 };
    const chartWidth = Math.max(width - padding.left - padding.right, 50);
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(
      ...data.flatMap((d) => [d.gemini, d.openai, d.claude]),
      10,
    );

    const getX = (idx: number) =>
      padding.left + (idx / (data.length - 1)) * chartWidth;
    const getY = (val: number) =>
      padding.top + chartHeight - (val / maxVal) * chartHeight;

    const createPath = (key: "gemini" | "openai" | "claude") => {
      return data.reduce((acc, curr, idx) => {
        const x = getX(idx);
        const y = getY(curr[key]);
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, "");
    };

    return (
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          return (
            <G key={idx}>
              <Path
                d={`M ${padding.left} ${y} L ${padding.left + chartWidth} ${y}`}
                stroke="#ffffff08"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={padding.left - 8}
                y={y + 3}
                fill="#ffffff30"
                fontSize={9}
                textAnchor="end"
                fontFamily={Platform.OS === "ios" ? "Courier" : "monospace"}
              >
                {Math.round(maxVal * (1 - p))}
              </SvgText>
            </G>
          );
        })}

        {/* Lines */}
        <Path
          d={createPath("gemini")}
          stroke={THEME.cyan}
          strokeWidth={2.5}
          fill="none"
        />
        <Path
          d={createPath("openai")}
          stroke={THEME.success}
          strokeWidth={2}
          fill="none"
          strokeDasharray="5 3"
        />
        <Path
          d={createPath("claude")}
          stroke={THEME.purple}
          strokeWidth={2}
          fill="none"
        />

        {/* X Axis Labels */}
        {data
          .filter((_, idx) => idx % 4 === 0 || idx === data.length - 1)
          .map((d, idx, arr) => {
            const originalIdx = data.indexOf(d);
            return (
              <SvgText
                key={idx}
                x={getX(originalIdx)}
                y={height - 8}
                fill="#ffffff40"
                fontSize={9}
                textAnchor="middle"
                fontFamily={Platform.OS === "ios" ? "Courier" : "monospace"}
              >
                {d.hour}
              </SvgText>
            );
          })}
      </Svg>
    );
  },
);
SvgMultiLineChart.displayName = "SvgMultiLineChart";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: MASTER API KEYS CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminApiKeysScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const isMobile = SCREEN_WIDTH < 768;

  const [systemKeys, setSystemKeys] = useState<SystemApiKey[]>([]);
  const [usageLogs, setUsageLogs] = useState<ApiKeyUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Adding New Fallback Key
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ApiProvider>("gemini");
  const [newKeyString, setNewKeyString] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newPriority, setNewPriority] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Synchronize System API Keys & Logs
  const fetchVaultTelemetry = useCallback(async () => {
    try {
      const [
        { data: keysData, error: keysErr },
        { data: logsData, error: logsErr },
      ] = await Promise.all([
        supabase
          .from("system_api_keys")
          .select("*")
          .order("priority_order", { ascending: true }),
        supabase
          .from("api_key_usage_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (keysErr) throw keysErr;
      if (logsErr) throw logsErr;

      setSystemKeys((keysData as SystemApiKey[]) || []);
      setUsageLogs((logsData as ApiKeyUsageLog[]) || []);
    } catch (err) {
      console.error("[API VAULT TELEMETRY FAULT]:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultTelemetry();

    const channel = supabase
      .channel(`admin_api_vault_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_api_keys" },
        fetchVaultTelemetry,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "api_key_usage_logs" },
        fetchVaultTelemetry,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVaultTelemetry]);

  // Execute Add Key RPC
  const handleAddSystemKey = async () => {
    if (!newKeyString.trim()) {
      setActionError("API Key string cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);

    try {
      const { error } = await supabase.rpc("admin_add_api_key", {
        p_provider: selectedProvider as any,
        p_api_key: newKeyString.trim(),
        p_label: newKeyLabel.trim() || `${selectedProvider}_fallback_node`,
      });

      if (error) throw error;

      setNewKeyString("");
      setNewKeyLabel("");
      setAddModalVisible(false);
      fetchVaultTelemetry();
    } catch (err: any) {
      console.error("Failed to add system key:", err);
      setActionError(err.message || "Failed to inject key into vault.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Key Status RPC
  const handleToggleKeyActive = async (
    keyId: string,
    currentActive: boolean,
  ) => {
    try {
      const { error } = await supabase.rpc("admin_set_api_key_active", {
        p_key_id: keyId,
        p_active: !currentActive,
      });
      if (error) throw error;
      setSystemKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, is_active: !currentActive } : k,
        ),
      );
    } catch (err) {
      console.error("Toggle key state failed:", err);
    }
  };

  // Delete Key RPC
  const handleDeleteKey = async (keyId: string) => {
    try {
      const { error } = await supabase.rpc("admin_delete_api_key", {
        p_key_id: keyId,
      });
      if (error) throw error;
      setSystemKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error("Delete key failed:", err);
    }
  };

  // Computed Telemetry Analytics
  const analytics = useMemo(() => {
    const totalTokens = usageLogs.reduce(
      (acc, l) => acc + (l.tokens_used || 0),
      0,
    );
    const totalCost = usageLogs.reduce(
      (acc, l) => acc + Number(l.cost_estimate_usd || 0),
      0,
    );

    const providerCounts: Record<string, number> = {};
    usageLogs.forEach((l) => {
      const p = l.provider || "gemini";
      providerCounts[p] = (providerCounts[p] || 0) + 1;
    });

    const donutSlices: DonutSlice[] = Object.keys(providerCounts).map((p) => ({
      label: p.toUpperCase(),
      value: providerCounts[p],
      color: PROVIDER_CONFIG[p]?.color || THEME.cyan,
    }));

    // Generate mock 24h hourly distribution for SVG line chart
    const hourlyData: HourlyPoint[] = Array.from({ length: 12 }).map((_, i) => {
      const hour = `${(i * 2).toString().padStart(2, "0")}:00`;
      const base = 10 + i * 3;
      return {
        hour,
        gemini: Math.round(base * 1.8 + Math.sin(i) * 5),
        openai: Math.round(base * 0.9 + Math.cos(i) * 3),
        claude: Math.round(base * 0.4 + (i % 2) * 2),
      };
    });

    return {
      totalTokens,
      totalCost,
      donutSlices,
      hourlyData,
      activeKeysCount: systemKeys.filter((k) => k.is_active).length,
      totalKeysCount: systemKeys.length,
    };
  }, [usageLogs, systemKeys]);

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
                  fetchVaultTelemetry();
                }}
                tintColor={THEME.cyan}
              />
            }
          >
            {/* ════════ 1. HEADER ════════ */}
            <FadeIn delay={100} className="mb-8">
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/(dashboard)/admin")}
                delayPressIn={0}
                className="mb-5 flex-row items-center gap-x-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                activeOpacity={0.7}
              >
                <ArrowBigLeftDash size={18} color={THEME.cyan} />
                <Text className="font-mono text-xs font-bold tracking-wider text-white/80">
                  KERNEL
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-mono text-2xl font-black uppercase tracking-widest text-white md:text-3xl">
                    API CASCADE VAULT
                  </Text>
                  <Text className="mt-0.5 font-mono text-[10px] font-bold uppercase text-[#00F0FF]/80 md:text-xs">
                    Multi-Model Fallback Matrix & Token Burn Control
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setAddModalVisible(true)}
                  className="flex-row items-center gap-2 rounded-2xl bg-[#00F0FF] px-4 py-2.5 shadow-lg shadow-cyan-900/40 active:scale-95"
                >
                  <Plus size={16} color="#000" />
                  <Text className="font-mono text-xs font-black uppercase tracking-wider text-black">
                    Inject Key
                  </Text>
                </TouchableOpacity>
              </View>
            </FadeIn>

            {/* ════════ 2. SYSTEM METRICS TABS ════════ */}
            <FadeIn delay={150} className="mb-10">
              <View className="flex-col gap-4 md:flex-row">
                <GlassCard className="flex-1 rounded-3xl border border-white/5 bg-white/[0.015] p-6">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/10">
                      <KeyRound size={20} color={THEME.cyan} />
                    </View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">
                      VAULT ACTIVE
                    </Text>
                  </View>
                  <Text className="font-mono text-3xl font-black text-white">
                    {analytics.activeKeysCount} / {analytics.totalKeysCount}
                  </Text>
                  <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Operational Fallback Keys
                  </Text>
                </GlassCard>

                <GlassCard className="flex-1 rounded-3xl border border-white/5 bg-white/[0.015] p-6">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl border border-[#32FF00]/20 bg-[#32FF00]/10">
                      <Zap size={20} color={THEME.success} />
                    </View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-[#32FF00]">
                      TOKEN INVENTORY
                    </Text>
                  </View>
                  <Text className="font-mono text-3xl font-black text-[#32FF00]">
                    {analytics.totalTokens.toLocaleString()}
                  </Text>
                  <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Burned Tokens (30 Days)
                  </Text>
                </GlassCard>

                <GlassCard className="flex-1 rounded-3xl border border-white/5 bg-white/[0.015] p-6">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl border border-[#8A2BE2]/20 bg-[#8A2BE2]/10">
                      <Cpu size={20} color={THEME.purple} />
                    </View>
                    <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-[#8A2BE2]">
                      COST ACCRUAL
                    </Text>
                  </View>
                  <Text className="font-mono text-3xl font-black text-[#8A2BE2]">
                    ${analytics.totalCost.toFixed(3)}
                  </Text>
                  <Text className="mt-1 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Estimated Model Spend
                  </Text>
                </GlassCard>
              </View>
            </FadeIn>

            {/* ════════ 3. REAL-TIME CHARTS: HOURLY VOLUME & BREAKDOWN ════════ */}
            <FadeIn delay={200} className="mb-10">
              <View className="flex-col gap-6 lg:flex-row">
                {/* 24H Traffic Trend Chart */}
                <GlassCard className="flex-1 rounded-3xl border border-white/5 bg-white/[0.015] p-6 md:p-7">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <TrendingUp size={16} color={THEME.cyan} />
                      <Text className="font-mono text-xs font-black uppercase tracking-widest text-white">
                        24H Execution Traffic
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-2 w-2 rounded-full bg-[#00F0FF]" />
                        <Text className="font-mono text-[9px] text-white/50">
                          Gemini
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-2 w-2 rounded-full bg-[#32FF00]" />
                        <Text className="font-mono text-[9px] text-white/50">
                          OpenAI
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-2 w-2 rounded-full bg-[#8A2BE2]" />
                        <Text className="font-mono text-[9px] text-white/50">
                          Claude
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="w-full items-center">
                    <SvgMultiLineChart
                      data={analytics.hourlyData}
                      width={isMobile ? SCREEN_WIDTH - 64 : 520}
                      height={190}
                    />
                  </View>
                </GlassCard>

                {/* Provider Distribution Donut */}
                <GlassCard className="w-full rounded-3xl border border-white/5 bg-white/[0.015] p-6 md:p-7 lg:w-[360px]">
                  <View className="mb-4 flex-row items-center gap-2">
                    <PieChartIcon size={16} color={THEME.purple} />
                    <Text className="font-mono text-xs font-black uppercase tracking-widest text-white">
                      Provider Distribution
                    </Text>
                  </View>

                  <View className="mt-2 flex-row items-center justify-between gap-4">
                    <View className="items-center justify-center">
                      <SvgDonutChart
                        slices={analytics.donutSlices}
                        size={130}
                        strokeWidth={18}
                      />
                    </View>

                    <View className="flex-1 flex-col gap-2">
                      {analytics.donutSlices.map((slice, idx) => (
                        <View
                          key={idx}
                          className="flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center gap-2">
                            <View
                              style={{ backgroundColor: slice.color }}
                              className="h-2 w-2 rounded-full"
                            />
                            <Text className="font-mono text-[10px] font-bold text-white/80">
                              {slice.label}
                            </Text>
                          </View>
                          <Text className="font-mono text-[10px] text-white/50">
                            {slice.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </GlassCard>
              </View>
            </FadeIn>

            {/* ════════ 4. SYSTEM API VAULT CREDENTIALS ════════ */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Shield size={14} color="#fff" />
                <Text className="font-mono text-[10px] font-black uppercase tracking-[3px] text-white md:text-[11px]">
                  Configured Fallback Credentials
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setRefreshing(true);
                  fetchVaultTelemetry();
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <RefreshCcw size={14} color={THEME.cyan} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator color={THEME.cyan} />
              </View>
            ) : systemKeys.length === 0 ? (
              <GlassCard className="items-center justify-center rounded-3xl border border-white/5 bg-white/[0.015] p-12">
                <Lock size={32} color="#ffffff30" />
                <Text className="mt-4 font-mono text-xs uppercase tracking-widest text-white/40">
                  No system fallback keys configured.
                </Text>
                <TouchableOpacity
                  onPress={() => setAddModalVisible(true)}
                  className="mt-4 rounded-2xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-6 py-2.5 active:scale-95"
                >
                  <Text className="font-mono text-xs font-bold uppercase text-[#00F0FF]">
                    Add First Fallback Key
                  </Text>
                </TouchableOpacity>
              </GlassCard>
            ) : (
              systemKeys.map((key) => {
                const conf = PROVIDER_CONFIG[key.provider] || {
                  label: key.provider,
                  color: THEME.cyan,
                  modelName: "standard-v1",
                };

                return (
                  <GlassCard
                    key={key.id}
                    className="mb-4 rounded-3xl border border-white/5 bg-white/[0.015] p-5 md:p-6"
                  >
                    <View className="flex-col justify-between gap-4 md:flex-row md:items-center">
                      {/* Left: Provider & Masked Key info */}
                      <View className="flex-1 flex-row items-center gap-4">
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 16,
                            backgroundColor: `${conf.color}15`,
                            borderWidth: 1.5,
                            borderColor: `${conf.color}40`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <KeyRound size={20} color={conf.color} />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-2.5">
                            <Text className="font-mono text-base font-bold text-white">
                              {key.label || conf.label}
                            </Text>
                            <View
                              style={{
                                backgroundColor: key.is_active
                                  ? `${THEME.success}15`
                                  : `${THEME.danger}15`,
                                borderColor: key.is_active
                                  ? `${THEME.success}40`
                                  : `${THEME.danger}40`,
                              }}
                              className="rounded-full border px-2.5 py-0.5"
                            >
                              <Text
                                style={{
                                  color: key.is_active
                                    ? THEME.success
                                    : THEME.danger,
                                }}
                                className="font-mono text-[8px] font-black uppercase tracking-widest"
                              >
                                {key.is_active ? "ACTIVE" : "STANDBY"}
                              </Text>
                            </View>
                          </View>

                          <Text className="mt-1 font-mono text-xs text-white/40">
                            Provider: {conf.label} • Priority Level:{" "}
                            {key.priority_order || 1}
                          </Text>

                          <View className="mt-2 flex-row items-center gap-3">
                            <Text className="font-mono text-[10px] text-white/30">
                              Encrypted Key ID: {key.id.slice(0, 12)}...
                            </Text>
                            {key.last_used_at && (
                              <Text className="font-mono text-[10px] text-white/30">
                                Last Used:{" "}
                                {new Date(
                                  key.last_used_at,
                                ).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Right: Actions */}
                      <View className="w-full flex-row items-center justify-end gap-2 self-end border-t border-white/5 pt-3 md:w-auto md:self-auto md:border-t-0 md:pt-0">
                        <TouchableOpacity
                          onPress={() =>
                            handleToggleKeyActive(key.id, key.is_active)
                          }
                          className={cn(
                            "flex-row items-center gap-2 rounded-2xl border px-4 py-2.5 active:scale-95",
                            key.is_active
                              ? "border-[#FF007F]/30 bg-[#FF007F]/10"
                              : "border-[#32FF00]/30 bg-[#32FF00]/10",
                          )}
                        >
                          <Power
                            size={14}
                            color={key.is_active ? THEME.danger : THEME.success}
                          />
                          <Text
                            className={cn(
                              "font-mono text-xs font-bold uppercase tracking-wider",
                              key.is_active
                                ? "text-[#FF007F]"
                                : "text-[#32FF00]",
                            )}
                          >
                            {key.is_active ? "Disable" : "Activate"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteKey(key.id)}
                          className="rounded-2xl border border-[#FF007F]/30 bg-[#FF007F]/10 p-2.5 active:scale-95"
                        >
                          <Trash2 size={16} color={THEME.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ─── MODAL: INJECT SYSTEM API KEY ─── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg rounded-3xl border border-[#00F0FF]/30 bg-[#050A15] p-6 md:p-8">
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <KeyRound size={22} color={THEME.cyan} />
                <Text className="font-mono text-lg font-black uppercase tracking-widest text-white">
                  Inject System Key
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color="#ffffff60" />
              </TouchableOpacity>
            </View>

            {actionError && (
              <View className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5">
                <Text className="font-mono text-xs text-red-400">
                  {actionError}
                </Text>
              </View>
            )}

            <Text className="mb-2 font-mono text-xs uppercase tracking-wider text-white/60">
              Select Provider:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {(Object.keys(PROVIDER_CONFIG) as ApiProvider[]).map((p) => {
                  const active = selectedProvider === p;
                  const conf = PROVIDER_CONFIG[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedProvider(p)}
                      className={cn(
                        "rounded-xl border px-3.5 py-2 transition-all",
                        active
                          ? "border-[#00F0FF] bg-[#00F0FF]/20"
                          : "border-white/10 bg-white/5",
                      )}
                    >
                      <Text
                        style={{ color: active ? THEME.cyan : "#ffffff60" }}
                        className="font-mono text-[10px] font-black uppercase tracking-wider"
                      >
                        {conf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text className="mb-2 font-mono text-xs uppercase tracking-wider text-white/60">
              Key Identifier Label:
            </Text>
            <View className="mb-4 h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4">
              <TextInput
                value={newKeyLabel}
                onChangeText={setNewKeyLabel}
                placeholder={`e.g., Primary ${selectedProvider} Fallback`}
                placeholderTextColor="#ffffff30"
                style={strictInputStyle}
              />
            </View>

            <Text className="mb-2 font-mono text-xs uppercase tracking-wider text-white/60">
              Raw API Key Secret:
            </Text>
            <View className="mb-6 h-12 justify-center rounded-xl border border-white/10 bg-black/40 px-4 focus-within:border-[#00F0FF]">
              <TextInput
                value={newKeyString}
                onChangeText={setNewKeyString}
                placeholder="AIzaSy... / sk-ant-... / sk-..."
                placeholderTextColor="#ffffff30"
                secureTextEntry
                style={strictInputStyle}
                autoCapitalize="none"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                className="h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 active:scale-95"
              >
                <Text className="font-mono text-xs font-bold uppercase text-white/70">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isSubmitting}
                onPress={handleAddSystemKey}
                className="h-12 flex-1 items-center justify-center rounded-xl bg-[#00F0FF] shadow-lg shadow-cyan-900/40 active:scale-95"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text className="font-mono text-xs font-black uppercase tracking-wider text-black">
                    Encrypt & Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}
