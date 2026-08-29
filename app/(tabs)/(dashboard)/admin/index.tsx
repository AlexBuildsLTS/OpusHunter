/**
 * app/admin/index.tsx
 * OpusHunter — Admin Dashboard.
 * Displays real-time stats (Users, Apps, Letters, API Cost). Clean card layout.
 */

import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Card } from "../../../../components/ui/GlassCard";
import { Typography } from "../../../../components/ui/Typography";
import { Badge } from "../../../../components/ui/Badge";
import { supabase } from "../../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { colors, radius } from "../../../../constants/theme";
import {
  Users,
  Send,
  FileText,
  DollarSign,
  ArrowRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import type { Database } from "../../../../types/database.types";
import { SafeAreaWrapper } from "components/shared/SafeAreaWrapper";

export default function AdminDashboard() {
  const router = useRouter();

  // Fetch Admin Stats via SECURITY DEFINER RPC (server-side)
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
      if (error) throw error;
      return data as any;
    },
  });

  const statItems = [
    {
      label: "Total Users",
      value: stats?.total_users || 0,
      icon: Users,
      color: colors.accent.cyan,
    },
    {
      label: "Applications",
      value: stats?.total_applications || 0,
      icon: Send,
      color: colors.accent.blue,
    },
    {
      label: "Cover Letters",
      value: stats?.total_cover_letters || 0,
      icon: FileText,
      color: colors.accent.green,
    },
    {
      label: "API Cost (USD)",
      value: `$${stats?.cost_this_month?.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: colors.accent.amber,
    },
  ];

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          Admin Control
        </Typography>
        <Badge variant="roleAdmin" label="Admin" dot />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.grid}>
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card
                key={index}
                style={[styles.statCard, { borderColor: `${item.color}30` }]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Icon size={24} color={item.color} />
                </View>
                <Typography
                  variant="h3"
                  weight="bold"
                  color="primary"
                  style={styles.statValue}
                >
                  {isLoading ? "..." : item.value}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {item.label}
                </Typography>
              </Card>
            );
          })}
        </View>

        {/* Quick Actions */}
        <Typography
          variant="caption"
          color="secondary"
          style={styles.sectionLabel}
        >
          MANAGE
        </Typography>
        <Card
          variant="interactive"
          style={styles.linkCard}
          onPress={() => router.push("./(tabs)/admin/users")}
        >
          <View style={styles.linkIcon}>
            <Users size={20} color={colors.accent.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="bodySm" weight="bold" color="primary">
              User Management
            </Typography>
            <Typography variant="caption" color="secondary">
              View all users, change roles
            </Typography>
          </View>
          <ArrowRight size={18} color={colors.text.dim} />
        </Card>

        <Card
          variant="interactive"
          style={styles.linkCard}
          onPress={() => router.push("./(tabs)/admin/api-keys")}
        >
          <View
            style={[
              styles.linkIcon,
              { backgroundColor: "rgba(245,158,11,0.1)" },
            ]}
          >
            <DollarSign size={20} color={colors.accent.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="bodySm" weight="bold" color="primary">
              System API Keys
            </Typography>
            <Typography variant="caption" color="secondary">
              Gemini, RapidAPI, Fallbacks
            </Typography>
          </View>
          <ArrowRight size={18} color={colors.text.dim} />
        </Card>

        <Card
          variant="interactive"
          style={styles.linkCard}
          onPress={() => router.push("/(tabs)/admin/usage-logs" as any)}
        >
          <View
            style={[
              styles.linkIcon,
              { backgroundColor: "rgba(16,185,129,0.1)" },
            ]}
          >
            <FileText size={20} color={colors.accent.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="bodySm" weight="bold" color="primary">
              Usage Logs
            </Typography>
            <Typography variant="caption" color="secondary">
              Track tokens & costs
            </Typography>
          </View>
          <ArrowRight size={18} color={colors.text.dim} />
        </Card>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: { width: "48%", padding: 16, alignItems: "flex-start", gap: 8 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 28 },
  sectionLabel: { marginTop: 8, marginBottom: 8, paddingHorizontal: 8 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    marginBottom: 8,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(0,210,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
