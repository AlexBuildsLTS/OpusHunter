/**
 * components/job/KanbanBoard.tsx
 * OpusHunter — Drag-and-Drop Kanban Board (Refined).
 * Cross-platform (iOS/Android/Web). Reanimated + Gesture Handler for 120fps.
 * Custom drag logic to avoid external library breakage on Web.
 * Includes internal JobCardCompact component for clean rendering.
 * Handles optimistic status updates via TanStack Query.
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Card } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { Typography } from "../ui/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { colors, radius } from "../../constants/theme";
import type { Database } from "../../types/database.types";

type Application = Database["public"]["Tables"]["job_applications"]["Row"] & {
  job_vault: Database["public"]["Tables"]["job_vault"]["Row"];
};

type Status = Database["public"]["Enums"]["application_status_enum"];

const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: "discovered", label: "Discovered", color: colors.status.discovered },
  { key: "saved", label: "Saved", color: colors.status.saved },
  { key: "applied", label: "Applied", color: colors.status.applied },
  { key: "interview", label: "Interview", color: colors.status.interview },
  { key: "offer", label: "Offer", color: colors.status.offer },
  { key: "rejected", label: "Rejected", color: colors.status.rejected },
];

interface KanbanBoardProps {
  applications: Application[];
  isLoading: boolean;
}

/** Internal Job Card Component (Compact) */
function JobCardCompact({ app }: { app: Application }) {
  const job = app.job_vault;
  return (
    <Card variant="interactive" style={styles.compactCard}>
      <View style={styles.compactHeader}>
        <View style={styles.compactTitleWrap}>
          <Typography
            variant="bodySm"
            weight="semiBold"
            color="primary"
            numberOfLines={2}
          >
            {job.title}
          </Typography>
          <Typography variant="caption" color="secondary" numberOfLines={1}>
            {job.company}
          </Typography>
        </View>
      </View>
      <View style={styles.compactFooter}>
        <Badge variant="default" label={job.source} size="sm" dot={false} />
        <Typography variant="caption" color="dim">
          {job.location || "Remote"}
        </Typography>
      </View>
    </Card>
  );
}

export function KanbanBoard({ applications, isLoading }: KanbanBoardProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  // Optimistic update logic on drag end
  const handleDrop = async (appId: string, newStatus: Status) => {
    if (!user) return;

    // Optimistically update UI
    queryClient.setQueryData(["applications", user.id], (old: any) =>
      (old || []).map((a: Application) =>
        a.id === appId ? { ...a, status: newStatus } : a,
      ),
    );

    // Persist to Supabase
    await supabase
      .from("job_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId);

    queryClient.invalidateQueries({ queryKey: ["applications", user.id] });
  };

  /** Drag Card Component (Internal) */
  function DraggableCard({ app }: { app: Application }) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        scale.value = 1.05;
      })
      .onEnd((e) => {
        // Determine nearest column based on absolute X position
        const columnWidth = 280;
        const startX = e.absoluteX - e.translationX;
        const columnIndex = Math.floor((startX + e.translationX) / columnWidth);
        const newStatus =
          COLUMNS[Math.min(Math.max(columnIndex, 0), COLUMNS.length - 1)]?.key;

        // Reset position
        translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
        scale.value = withSpring(1, { damping: 15, stiffness: 180 });

        if (newStatus && newStatus !== app.status) {
          runOnJS(handleDrop)(app.id, newStatus);
        }
      });

    const animStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: 10,
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={animStyle}>
          <JobCardCompact app={app} />
        </Animated.View>
      </GestureDetector>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Typography color="secondary">Loading pipeline...</Typography>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.board}
    >
      {COLUMNS.map((col) => {
        const colApps = applications.filter((a) => a.status === col.key);
        return (
          <View key={col.key} style={styles.column}>
            {/* Column Header */}
            <View style={styles.columnHeader}>
              <View
                style={[styles.statusDot, { backgroundColor: col.color }]}
              />
              <Typography variant="bodySm" weight="bold" color="primary">
                {col.label}
              </Typography>
              <Typography variant="caption" color="secondary">
                {colApps.length}
              </Typography>
            </View>

            {/* Cards */}
            <View style={styles.columnBody}>
              {colApps.length === 0 ? (
                <View style={styles.emptyColumn}>
                  <Typography variant="caption" color="dim">
                    No applications
                  </Typography>
                </View>
              ) : (
                colApps.map((app) => <DraggableCard key={app.id} app={app} />)
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  board: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  column: {
    width: 280,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.xl,
    padding: 12,
    marginBottom: 16,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnBody: {
    gap: 8,
  },
  emptyColumn: {
    paddingVertical: 20,
    alignItems: "center",
  },
  compactCard: {
    padding: 12,
  },
  compactHeader: {
    marginBottom: 8,
  },
  compactTitleWrap: {
    gap: 4,
  },
  compactFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
