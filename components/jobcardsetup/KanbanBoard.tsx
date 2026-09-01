/**
 * components/jobcardsetup/KanbanBoard.tsx
 * OpusHunter — Drag-and-Drop + Quick-Action Kanban Board.
 * Cross-platform (iOS/Android/Web). Reanimated + Gesture Handler for 120fps.
 * Includes interactive cards, one-tap column transitions, and detailed preview modal.
 * Handles optimistic status updates via TanStack Query.
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  ChevronRight,
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react-native";
import { Card } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { Typography } from "../ui/Typography";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { colors, radius, shadows } from "../../constants/theme";
import { springs } from "../../constants/animations";
import type { Database } from "../../types/database.types";

export type Application =
  Database["public"]["Tables"]["job_applications"]["Row"] & {
    job_vault: Database["public"]["Tables"]["job_vault"]["Row"];
  };

export type Status = Database["public"]["Enums"]["application_status_enum"];

export const COLUMNS: {
  key: Status;
  label: string;
  color: string;
  nextStatus?: Status;
}[] = [
  {
    key: "discovered",
    label: "Discovered",
    color: colors.status.discovered,
    nextStatus: "saved",
  },
  {
    key: "saved",
    label: "Saved",
    color: colors.status.saved,
    nextStatus: "applied",
  },
  {
    key: "applied",
    label: "Applied",
    color: colors.status.applied,
    nextStatus: "interview",
  },
  {
    key: "interview",
    label: "Interview",
    color: colors.status.interview,
    nextStatus: "offer",
  },
  { key: "offer", label: "Offer", color: colors.status.offer },
  {
    key: "rejected",
    label: "Rejected",
    color: colors.status.rejected,
    nextStatus: "saved",
  },
];

const COLUMN_WIDTH = 290;

interface KanbanBoardProps {
  applications: Application[];
  isLoading: boolean;
  onSelectApplication?: (app: Application) => void;
}

function triggerHaptic(type: "grab" | "drop" | "action") {
  if (Platform.OS === "web") return;
  if (type === "grab") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } else if (type === "drop") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  }
}

/** Internal Job Card Component (Compact & Interactive) */
function JobCardCompact({
  app,
  onPress,
  onAdvance,
  onReject,
}: {
  app: Application;
  onPress: () => void;
  onAdvance: () => void;
  onReject: () => void;
}) {
  const job = app.job_vault;
  const colConfig = COLUMNS.find((c) => c.key === app.status);

  // Format salary text
  const salaryText =
    job?.salary_min && job?.salary_max
      ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max / 1000)}k`
      : job?.salary_min
        ? `From $${Math.round(job.salary_min / 1000)}k`
        : null;

  return (
    <Pressable onPress={onPress}>
      <Card variant="interactive" style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <View style={styles.compactTitleWrap}>
            <Typography
              variant="bodySm"
              weight="semiBold"
              color="primary"
              numberOfLines={2}
            >
              {job?.title || "Untitled Position"}
            </Typography>
            <View style={styles.companyRow}>
              <Building2 size={12} color={colors.text.secondary} />
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {job?.company || "Company Confidential"}
              </Typography>
            </View>
          </View>
        </View>

        {/* Location & Salary Info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={11} color={colors.text.dim} />
            <Typography variant="caption" color="dim" numberOfLines={1}>
              {job?.location || "Remote"}
            </Typography>
          </View>
          {salaryText && (
            <View style={styles.metaItem}>
              <DollarSign size={11} color={colors.accent.green} />
              <Typography
                variant="caption"
                style={{ color: colors.accent.green, fontWeight: "600" }}
              >
                {salaryText}
              </Typography>
            </View>
          )}
        </View>

        {/* Card Footer with Source Badge and Fast Progression Buttons */}
        <View style={styles.compactFooter}>
          <Badge
            variant="default"
            label={(job?.source || "radar").toUpperCase()}
            size="sm"
            dot={false}
          />

          <View style={styles.cardActions}>
            {app.status !== "rejected" && app.status !== "offer" && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
                style={styles.iconActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XCircle size={15} color={colors.text.dim} />
              </TouchableOpacity>
            )}

            {colConfig?.nextStatus && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onAdvance();
                }}
                style={[
                  styles.advanceBtn,
                  {
                    backgroundColor: `${colConfig.color}20`,
                    borderColor: `${colConfig.color}50`,
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Typography
                  variant="caption"
                  style={{
                    color: colConfig.color,
                    fontSize: 10,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  {colConfig.nextStatus}
                </Typography>
                <ArrowRight size={10} color={colConfig.color} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

interface DraggableCardProps {
  app: Application;
  onDrop: (appId: string, newStatus: Status) => void;
  onPress: () => void;
  onAdvance: () => void;
  onReject: () => void;
}

function DraggableCard({
  app,
  onDrop,
  onPress,
  onAdvance,
  onReject,
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
      scale.value = withSpring(1.04, springs.press);
      runOnJS(triggerHaptic)("grab");
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      isDragging.value = false;
      const startX = e.absoluteX - e.translationX;
      const columnIndex = Math.floor((startX + e.translationX) / COLUMN_WIDTH);
      const targetIndex = Math.min(
        Math.max(columnIndex, 0),
        COLUMNS.length - 1,
      );
      const newStatus = COLUMNS[targetIndex]?.key;

      translateX.value = withSpring(0, springs.swipe);
      translateY.value = withSpring(0, springs.swipe);
      scale.value = withSpring(1, springs.press);
      runOnJS(triggerHaptic)("drop");

      if (newStatus && newStatus !== app.status) {
        runOnJS(onDrop)(app.id, newStatus);
      }
    })
    .onFinalize(() => {
      isDragging.value = false;
      scale.value = withSpring(1, springs.press);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isDragging.value ? 999 : 1,
    elevation: isDragging.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animStyle}>
        <JobCardCompact
          app={app}
          onPress={onPress}
          onAdvance={onAdvance}
          onReject={onReject}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function KanbanBoard({
  applications,
  isLoading,
  onSelectApplication,
}: KanbanBoardProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const updateStatus = async (appId: string, newStatus: Status) => {
    if (!user) return;

    queryClient.setQueryData(["applications", user.id], (old: any) =>
      (old || []).map((a: Application) =>
        a.id === appId ? { ...a, status: newStatus } : a,
      ),
    );

    await supabase
      .from("job_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId);

    queryClient.invalidateQueries({ queryKey: ["applications", user.id] });
    queryClient.invalidateQueries({ queryKey: ["pipeline_metrics"] });
  };

  const handleAdvance = (app: Application) => {
    const colConfig = COLUMNS.find((c) => c.key === app.status);
    if (colConfig?.nextStatus) {
      triggerHaptic("action");
      updateStatus(app.id, colConfig.nextStatus);
    }
  };

  const handleReject = (app: Application) => {
    triggerHaptic("action");
    updateStatus(app.id, "rejected");
  };

  const handleOpenDetail = (app: Application) => {
    if (onSelectApplication) {
      onSelectApplication(app);
    } else {
      setSelectedApp(app);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Typography color="secondary">
          Synchronizing application matrix...
        </Typography>
      </View>
    );
  }

  return (
    <>
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
                <View
                  style={[
                    styles.countPill,
                    { backgroundColor: `${col.color}20` },
                  ]}
                >
                  <Typography
                    variant="caption"
                    style={{ color: col.color, fontWeight: "700" }}
                  >
                    {colApps.length}
                  </Typography>
                </View>
              </View>

              {/* Cards Container */}
              <ScrollView
                style={styles.columnScroll}
                contentContainerStyle={styles.columnBody}
                showsVerticalScrollIndicator={false}
              >
                {colApps.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Typography variant="caption" color="dim">
                      No roles in {col.label.toLowerCase()}
                    </Typography>
                  </View>
                ) : (
                  colApps.map((app) => (
                    <DraggableCard
                      key={app.id}
                      app={app}
                      onDrop={updateStatus}
                      onPress={() => handleOpenDetail(app)}
                      onAdvance={() => handleAdvance(app)}
                      onReject={() => handleReject(app)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Built-in Detail Modal */}
      {selectedApp && (
        <Modal
          visible={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={selectedApp.job_vault?.title || "Position Overview"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalMeta}>
              <Typography variant="bodySm" color="primary" weight="bold">
                {selectedApp.job_vault?.company}
              </Typography>
              <Typography variant="caption" color="secondary">
                {selectedApp.job_vault?.location || "Remote"} •{" "}
                {selectedApp.job_vault?.work_type || "Full-time"}
              </Typography>
            </View>

            {selectedApp.job_vault?.description && (
              <ScrollView style={styles.modalDescScroll}>
                <Typography
                  variant="caption"
                  color="secondary"
                  style={{ lineHeight: 20 }}
                >
                  {selectedApp.job_vault?.description}
                </Typography>
              </ScrollView>
            )}

            <View style={styles.modalStatusSelector}>
              <Typography
                variant="caption"
                color="dim"
                style={{ marginBottom: 6 }}
              >
                MOVE TO COLUMN:
              </Typography>
              <View style={styles.statusButtonGrid}>
                {COLUMNS.map((col) => {
                  const isActive = selectedApp.status === col.key;
                  return (
                    <TouchableOpacity
                      key={col.key}
                      onPress={() => {
                        updateStatus(selectedApp.id, col.key);
                        setSelectedApp((prev) =>
                          prev ? { ...prev, status: col.key } : null,
                        );
                      }}
                      style={[
                        styles.statusChoiceBtn,
                        isActive && {
                          backgroundColor: `${col.color}30`,
                          borderColor: col.color,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusMiniDot,
                          { backgroundColor: col.color },
                        ]}
                      />
                      <Typography
                        variant="caption"
                        style={{
                          color: isActive
                            ? colors.text.primary
                            : colors.text.secondary,
                          fontWeight: isActive ? "700" : "500",
                        }}
                      >
                        {col.label}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              {(selectedApp.job_vault?.url ||
                selectedApp.job_vault?.source_url) && (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    const targetUrl =
                      selectedApp.job_vault?.url ||
                      selectedApp.job_vault?.source_url;
                    if (targetUrl) {
                      Linking.openURL(targetUrl).catch(() => {});
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <ExternalLink size={14} color={colors.accent.blue} /> Open
                  Posting
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setSelectedApp(null)}
                style={{ flex: 1 }}
              >
                Done
              </Button>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  board: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loading: {
    paddingVertical: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: "rgba(10, 16, 26, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.12)",
    borderRadius: radius.xl,
    padding: 12,
    maxHeight: 700,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: "auto",
  },
  columnScroll: {
    flexGrow: 0,
  },
  columnBody: {
    gap: 10,
    paddingBottom: 8,
  },
  emptyColumn: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "dashed rgba(255,255,255,0.06)",
    borderRadius: radius.lg,
  },
  compactCard: {
    padding: 12,
    backgroundColor: "rgba(18, 26, 44, 0.7)",
    borderColor: "rgba(0, 242, 254, 0.15)",
  },
  compactHeader: {
    marginBottom: 6,
  },
  compactTitleWrap: {
    gap: 3,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    padding: 4,
  },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  modalContent: {
    gap: 16,
  },
  modalMeta: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  modalDescScroll: {
    maxHeight: 220,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: radius.md,
  },
  modalStatusSelector: {
    gap: 6,
  },
  statusButtonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
