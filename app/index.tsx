/**
 * app/admin/index.tsx
 * OpusHunter — Global Telemetry & Fleet Surveillance
 * Architecture: Expo Router v57, TanStack Query v5, NativeWind v4
 *
 * WHAT THIS DOES:
 *   1. Real-Time Token Burn: Queries the newly migrated `api_key_usage_logs` table.
 *   2. Cost Surveillance: Calculates live API footprint costs (USD) across Gemini and RapidAPI.
 *   3. Fleet Analytics: Aggregates active users, pending jobs, and successful applications.
 *   4. Zero-Lag Rendering: Utilizes the dependency-free SVG `DonutChart` and `BarChart` components.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  Key,
  Users,
  Activity,
  Database,
  ChevronRight,
  Zap,
  ShieldAlert,
  Cpu,
  BarChart3,
  Globe,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { C } from "../lib/theme";
import { GlassCard } from "../components/ui/GlassCard";
import { DonutChart } from "../components/charts/DonutChart";
import { BarChart } from "../components/charts/BarChart";
import { PageContainer } from "../components/layout/PageContainer";

const IS_WEB = Platform.OS === "web";

// ─── MICRO-COMPONENTS ─────────────────────────────────────────────────────────

const StatBox = ({ label, value, color, icon: Icon, subtext }: any) => (
  <GlassCard tint="frost" padding="md" style={s.statBox}>
    <View
      style={[
        s.statIconWrap,
        { backgroundColor: `${color}15`, borderColor: `${color}30` },
      ]}
    >
      <Icon size={20} color={color} />
    </View>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {subtext && <Text style={s.statSubtext}>{subtext}</Text>}
  </GlassCard>
);

// ─── MAIN DASHBOARD ORCHESTRATOR ─────────────────────────────────────────────

export default function AdminIndexScreen() {
  const router = useRouter();

  // 1. Fetch Fleet Aggregates
  const { data: fleetStats, isLoading: loadingFleet } = useQuery({
    queryKey: ["admin_fleet_stats"],
    queryFn: async () => {
      const [users, apps, jobs, keys] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true }),
        supabase.from("job_vault").select("id", { count: "exact", head: true }),
        supabase
          .from("api_keys")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);
      return {
        users: users.count ?? 0,
        apps: apps.count ?? 0,
        jobs: jobs.count ?? 0,
        apiKeys: keys.count ?? 0,
      };
    },
    staleTime: 30000,
  });

  // 2. Fetch Live API Telemetry (From the new migration)
  const { data: telemetry, isLoading: loadingTelemetry } = useQuery({
    queryKey: ["admin_api_telemetry"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7); // Last 7 days

      const { data, error } = await supabase
        .from("api_key_usage_logs")
        .select(
          "provider, key_source, tokens_used, cost_estimate_usd, created_at",
        )
        .gte("created_at", since.toISOString());

      if (error) throw error;
      return data || [];
    },
    staleTime: 15000,
  });

  // 3. Process Telemetry Data for SVG Charts
  const processedData = useMemo(() => {
    if (!telemetry) return { totalCost: 0, byProvider: [], timeline: [] };

    let totalCost = 0;
    let geminiTokens = 0;
    let rapidApiHits = 0;

    // Base 7-day timeline structure
    const timelineMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      timelineMap[d.toISOString().slice(0, 10)] = 0;
    }

    telemetry.forEach((log) => {
      totalCost += Number(log.cost_estimate_usd || 0);
      const dateKey = log.created_at.slice(0, 10);
      if (timelineMap[dateKey] !== undefined) {
        timelineMap[dateKey] += Number(log.cost_estimate_usd || 0);
      }

      if (log.provider === "gemini") geminiTokens += log.tokens_used;
      if (log.provider === "rapidapi") rapidApiHits += 1;
    });

    const timeline = Object.entries(timelineMap).map(([date, cost]) => {
      const d = new Date(date);
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: Number(cost.toFixed(4)),
      };
    });

    const byProvider = [
      { label: "Gemini (Tokens)", value: geminiTokens, color: C.purple },
      { label: "RapidAPI (Reqs)", value: rapidApiHits, color: C.cyan },
    ];

    return { totalCost, byProvider, timeline };
  }, [telemetry]);

  const MENU_ROUTES = [
    {
      id: "keys",
      label: "API Key Pool",
      sub: "Manage BYOK and global fallback keys",
      icon: Key,
      color: C.cyan,
      route: "/admin/api-keys",
    },
    {
      id: "users",
      label: "User Directory",
      sub: "Mutate roles and inspect pipelines",
      icon: Users,
      color: C.purple,
      route: "/admin/users",
    },
    {
      id: "support",
      label: "Active Tickets",
      sub: "Resolve user issues and network blocks",
      icon: ShieldAlert,
      color: C.pink,
      route: "/(tabs)/settings/support",
    },
  ];

  if (loadingFleet || loadingTelemetry) {
    return (
      <PageContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={s.loadingText}>Synchronizing Telemetry...</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={s.header}
        >
          <View style={s.headerIcon}>
            <Globe size={28} color={C.cyan} />
          </View>
          <View>
            <Text style={s.headerTitle}>Global Telemetry</Text>
            <Text style={s.headerSub}>OpusHunter Engine Command Center</Text>
          </View>
        </Animated.View>

        {/* ── Fleet Aggregate Stats ── */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={s.gridRow}
        >
          <StatBox
            label="Active Users"
            value={fleetStats?.users}
            color={C.cyan}
            icon={Users}
            subtext="Registered identities"
          />
          <StatBox
            label="Applications"
            value={fleetStats?.apps}
            color={C.purple}
            icon={Activity}
            subtext="Dispatched to ATS"
          />
          <StatBox
            label="Jobs Vaulted"
            value={fleetStats?.jobs}
            color={C.green}
            icon={Database}
            subtext="Scraped & deduplicated"
          />
          <StatBox
            label="Active Keys"
            value={fleetStats?.apiKeys}
            color={C.amber}
            icon={Key}
            subtext="Available in shared pool"
          />
        </Animated.View>

        {/* ── API Burn & Cost Charts ── */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={s.chartRow}
        >
          {/* Cost Timeline Chart */}
          <GlassCard tint="frost" padding="lg" style={s.mainChartCard}>
            <View style={s.chartHeader}>
              <BarChart3 size={18} color={C.green} />
              <Text style={s.chartTitle}>7-DAY INFERENCE COST (USD)</Text>
            </View>
            <Text style={s.costMetric}>
              ${processedData.totalCost.toFixed(4)}
            </Text>
            <View style={{ height: 180, marginTop: 20 }}>
              <BarChart
                data={processedData.timeline}
                color={C.green}
                height={160}
              />
            </View>
          </GlassCard>

          {/* Usage Distribution Chart */}
          <GlassCard tint="frost" padding="lg" style={s.sideChartCard}>
            <View style={s.chartHeader}>
              <Cpu size={18} color={C.purple} />
              <Text style={s.chartTitle}>COMPUTE LOAD</Text>
            </View>
            <View style={s.donutWrap}>
              <DonutChart
                data={processedData.byProvider}
                size={150}
                strokeWidth={18}
                centerLabel="TOTAL"
                centerValue={processedData.byProvider.reduce(
                  (acc, curr) => acc + curr.value,
                  0,
                )}
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Navigation Routing Matrix ── */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={s.navGrid}
        >
          <Text style={s.sectionHeader}>SYSTEM MODULES</Text>
          {MENU_ROUTES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <GlassCard tint="frost" padding="md" style={s.navCard}>
                <View
                  style={[
                    s.navIconBox,
                    {
                      backgroundColor: `${item.color}15`,
                      borderColor: `${item.color}35`,
                    },
                  ]}
                >
                  <item.icon size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.navTitle, { color: item.color }]}>
                    {item.label}
                  </Text>
                  <Text style={s.navSub}>{item.sub}</Text>
                </View>
                <ChevronRight size={20} color={C.dim} />
              </GlassCard>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: IS_WEB ? 40 : 60,
    paddingBottom: 100,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: "800",
    color: C.cyan,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${C.cyan}10`,
    borderWidth: 1,
    borderColor: `${C.cyan}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "700",
    color: C.sub,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 20,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statSubtext: {
    fontSize: 10,
    color: C.dim,
    marginTop: 6,
  },
  chartRow: {
    flexDirection: IS_WEB ? "row" : "column",
    gap: 16,
    marginBottom: 32,
  },
  mainChartCard: {
    flex: 2,
    minWidth: IS_WEB ? 400 : "100%",
    borderRadius: 24,
  },
  sideChartCard: {
    flex: 1,
    minWidth: IS_WEB ? 300 : "100%",
    borderRadius: 24,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: C.text,
    letterSpacing: 1.5,
  },
  costMetric: {
    fontSize: 42,
    fontWeight: "900",
    color: C.green,
    letterSpacing: -1,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  navGrid: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: C.sub,
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 4,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 20,
  },
  navIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  navSub: {
    fontSize: 12,
    color: C.sub,
    fontWeight: "500",
  },
});
