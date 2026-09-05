/**
 * app/(tabs)/(dashboard)/pipeline.tsx
 * OpusHunter — Live Job Application Pipeline & History Matrix.
 * Displays real-time applications across Kanban columns and Detailed Matrix/History view.
 * Features: Live Supabase sync, fast status transitions, stage metrics counters,
 * full search & filter controls, one-tap AI Cover Letter synthesis, and detailed job preview.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Pressable,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Kanban,
  Table as TableIcon,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  CheckCircle2,
  XCircle,
  Layers,
  AlertCircle,
  Copy,
  Flame,
  Trash2,
} from "lucide-react-native";

import { SafeAreaWrapper } from "@/components/shared/SafeAreaWrapper";
import { Card } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  KanbanBoard,
  COLUMNS,
  Application,
  Status,
} from "@/components/jobcardsetup/KanbanBoard";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { colors, radius } from "@/constants/theme";
import { useToast } from "@/components/ui/Toast";

type ViewMode = "board" | "matrix";
type StatusFilter = "all" | Status;

export default function PipelineScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const { showToast } = useToast();

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);

  // Cover Letter Modal State
  const [coverLetterApp, setCoverLetterApp] = useState<Application | null>(
    null,
  );
  const [selectedFormality, setSelectedFormality] = useState(
    "technical_deep_dive",
  );
  const [selectedStrategy, setSelectedStrategy] = useState("mirror_matching");
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<{
    body: string;
    ats_score?: number | null;
    strategy?: string;
  } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const deleteApplicationMutation = useMutation({
    mutationFn: async (app: Application) => {
      if (!user) throw new Error("You must be signed in to remove a job.");
      const { error: applicationError } = await supabase
        .from("job_applications")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", app.job_id);
      if (applicationError) throw applicationError;

      const { error: jobError } = await supabase
        .from("job_vault")
        .delete()
        .eq("user_id", user.id)
        .eq("id", app.job_id);
      if (jobError) throw jobError;
    },
    onSuccess: (_, app) => {
      queryClient.setQueryData<Application[]>(
        ["applications", user?.id],
        (old) => (old || []).filter((item) => item.job_id !== app.job_id),
      );
      if (selectedApp?.job_id === app.job_id) setSelectedApp(null);
    },
    onError: (error) => {
      console.error("Pipeline removal failed:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "The job was not removed. Please try again.",
        "error",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", user?.id] });
    },
  });

  const handleDeleteApplication = (app: Application) => {
    setPendingDelete(app);
  };

  const confirmDeleteApplication = () => {
    if (!pendingDelete) return;
    const app = pendingDelete;
    setPendingDelete(null);
    deleteApplicationMutation.mutate(app);
  };

  // ── 1. Fetch Live Pipeline Applications ──────────────────────────────────
  const {
    data: applications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async (): Promise<Application[]> => {
      if (!user) return [];

      // Fetch tracked applications joined with job_vault
      const { data: appsData, error: appsError } = await supabase
        .from("job_applications")
        .select(
          `
          *,
          job_vault:job_id (*)
        `,
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (appsError) {
        console.error("Error fetching job applications:", appsError);
        throw appsError;
      }

      // Fetch all user jobs to ensure newly scraped jobs appear under discovered
      const { data: vaultData } = await supabase
        .from("job_vault")
        .select("*")
        .eq("user_id", user.id)
        .order("scraped_at", { ascending: false })
        .limit(100);

      const existingJobIds = new Set((appsData || []).map((a) => a.job_id));

      // Create synthetic discovered application rows for any unlinked vault jobs
      const syntheticDiscovered: Application[] = (vaultData || [])
        .filter((job) => !existingJobIds.has(job.id))
        .map((job) => ({
          id: "synth-" + job.id,
          user_id: user.id,
          job_id: job.id,
          status: "discovered" as Status,
          applied_at: null,
          ats_provider: null,
          cover_letter_used: null,
          notes: null,
          resume_document_id: null,
          sender_email: null,
          sender_full_name: null,
          submission_confirmation: null,
          submission_error: null,
          submission_method: null,
          created_at: job.scraped_at,
          updated_at: job.scraped_at,
          job_vault: job,
        }));

      return [...(appsData || []), ...syntheticDiscovered];
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  // ── 2. Real-time Status Transition Mutation ──────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      app,
      newStatus,
    }: {
      app: Application;
      newStatus: Status;
    }) => {
      if (!user) return;

      const isSynthetic = app.id.startsWith("synth-");
      if (isSynthetic) {
        // Upsert into job_applications table
        const { error } = await supabase
          .from("job_applications")
          .upsert(
            {
              user_id: user.id,
              job_id: app.job_id,
              status: newStatus,
              applied_at:
                newStatus === "applied" ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,job_id" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("job_applications")
          .update({
            status: newStatus,
            applied_at:
              newStatus === "applied" ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", app.id);
        if (error) throw error;
      }
    },
    onMutate: async ({ app, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["applications", user?.id] });
      const previousApps = queryClient.getQueryData<Application[]>([
        "applications",
        user?.id,
      ]);

      queryClient.setQueryData<Application[]>(
        ["applications", user?.id],
        (old) =>
          (old || []).map((item) =>
            item.id === app.id ? { ...item, status: newStatus } : item,
          ),
      );

      if (selectedApp?.id === app.id) {
        setSelectedApp((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }

      return { previousApps };
    },
    onError: (_, __, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(
          ["applications", user?.id],
          context.previousApps,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", user?.id] });
    },
  });

  const handleUpdateStatus = (app: Application, newStatus: Status) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    updateStatusMutation.mutate({ app, newStatus });
  };

  // ── 3. AI Cover Letter Generator ─────────────────────────────────────────
  const handleGenerateCoverLetter = async (
    app: Application,
    formalityOverride?: string,
    strategyOverride?: string,
  ) => {
    if (!user) return;
    setCoverLetterApp(app);
    setIsGeneratingLetter(true);
    setGeneratedLetter(null);

    const form = formalityOverride || selectedFormality;
    const strat = strategyOverride || selectedStrategy;

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-cover-letter",
        {
          body: {
            userId: user.id,
            jobListingId: app.job_id,
            strategy: strat,
            formality: form,
          },
        },
      );

      if (error) throw error;

      if (data?.primary?.body) {
        setGeneratedLetter({
          body: data.primary.body,
          ats_score: data.primary.ats_score,
          strategy: data.primary.strategy || strat,
        });
      } else if (data?.body) {
        setGeneratedLetter({
          body: data.body,
          ats_score: data.ats_score,
          strategy: data.strategy || strat,
        });
      } else {
        throw new Error("No letter content generated");
      }
    } catch (err) {
      console.error("Cover letter synthesis error:", err);
      setCoverLetterApp(null);
      showToast(
        "The listing-specific cover letter could not be generated. No placeholder content was created.",
        "error",
      );
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === "web") {
      navigator.clipboard?.writeText(text);
    }
    setCopiedNotification(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // ── 4. Metric Calculations ───────────────────────────────────────────────
  const metrics = useMemo(() => {
    const counts: Record<string, number> = {
      total: applications.length,
      discovered: 0,
      saved: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });

    return counts;
  }, [applications]);

  // ── 5. Search & Status Filtering ─────────────────────────────────────────
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const job = app.job_vault;
      return (
        job?.title?.toLowerCase().includes(q) ||
        job?.company?.toLowerCase().includes(q) ||
        job?.location?.toLowerCase().includes(q) ||
        job?.tech_stack?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [applications, statusFilter, searchQuery]);

  return (
    <SafeAreaWrapper>
      <View style={styles.screenContainer}>
        {/* ── Top Header & Stats Summary ── */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitles}>
            <View style={styles.badgeRow}>
              <View style={styles.livePulseDot} />
              <Typography
                variant="caption"
                style={{
                  color: colors.accent.cyan,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Pipeline Matrix
              </Typography>
            </View>
            <Typography variant="h2" weight="bold" color="primary">
              Application Radar
            </Typography>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => refetch()}
              style={styles.refreshButton}
              disabled={isRefetching}
            >
              <RefreshCw
                size={16}
                color={colors.accent.cyan}
                style={
                  isRefetching
                    ? { transform: [{ rotate: "45deg" }] }
                    : undefined
                }
              />
              {!isCompact && (
                <Typography
                  variant="caption"
                  weight="semiBold"
                  style={{ color: colors.accent.cyan, marginLeft: 6 }}
                >
                  {isRefetching ? "Syncing..." : "Sync Radar"}
                </Typography>
              )}
            </TouchableOpacity>

            {/* View Mode Switcher */}
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setViewMode("board");
                }}
                style={[
                  styles.toggleBtn,
                  viewMode === "board" && styles.toggleBtnActive,
                ]}
              >
                <Kanban
                  size={15}
                  color={
                    viewMode === "board"
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                />
                {!isCompact && (
                  <Text
                    style={[
                      styles.toggleBtnText,
                      viewMode === "board" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Board
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setViewMode("matrix");
                }}
                style={[
                  styles.toggleBtn,
                  viewMode === "matrix" && styles.toggleBtnActive,
                ]}
              >
                <TableIcon
                  size={15}
                  color={
                    viewMode === "matrix"
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                />
                {!isCompact && (
                  <Text
                    style={[
                      styles.toggleBtnText,
                      viewMode === "matrix" && styles.toggleBtnTextActive,
                    ]}
                  >
                    Matrix List
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Metric Stat Counters Strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScrollView}
          contentContainerStyle={styles.metricsContent}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("all")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "all"
                    ? colors.accent.cyan
                    : "rgba(0, 210, 255, 0.3)",
              },
              statusFilter === "all" && {
                backgroundColor: colors.accent.cyan + "15",
              },
            ]}
          >
            <Layers size={13} color={colors.accent.cyan} />
            <Text style={styles.statPillLabel}>Total Pipeline</Text>
            <Text style={[styles.statPillValue, { color: colors.accent.cyan }]}>
              {metrics.total}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("discovered")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "discovered"
                    ? colors.status.discovered
                    : colors.status.discovered + "40",
              },
              statusFilter === "discovered" && {
                backgroundColor: colors.status.discovered + "15",
              },
            ]}
          >
            <View
              style={[
                styles.statusMiniDot,
                { backgroundColor: colors.status.discovered },
              ]}
            />
            <Text style={styles.statPillLabel}>Discovered</Text>
            <Text
              style={[
                styles.statPillValue,
                { color: colors.status.discovered },
              ]}
            >
              {metrics.discovered}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("saved")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "saved"
                    ? colors.status.saved
                    : colors.status.saved + "40",
              },
              statusFilter === "saved" && {
                backgroundColor: colors.status.saved + "15",
              },
            ]}
          >
            <View
              style={[
                styles.statusMiniDot,
                { backgroundColor: colors.status.saved },
              ]}
            />
            <Text style={styles.statPillLabel}>Saved</Text>
            <Text
              style={[styles.statPillValue, { color: colors.status.saved }]}
            >
              {metrics.saved}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("applied")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "applied"
                    ? colors.status.applied
                    : colors.status.applied + "40",
              },
              statusFilter === "applied" && {
                backgroundColor: colors.status.applied + "15",
              },
            ]}
          >
            <View
              style={[
                styles.statusMiniDot,
                { backgroundColor: colors.status.applied },
              ]}
            />
            <Text style={styles.statPillLabel}>Applied</Text>
            <Text
              style={[styles.statPillValue, { color: colors.status.applied }]}
            >
              {metrics.applied}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("interview")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "interview"
                    ? colors.status.interview
                    : colors.status.interview + "40",
              },
              statusFilter === "interview" && {
                backgroundColor: colors.status.interview + "15",
              },
            ]}
          >
            <View
              style={[
                styles.statusMiniDot,
                { backgroundColor: colors.status.interview },
              ]}
            />
            <Text style={styles.statPillLabel}>Interview</Text>
            <Text
              style={[styles.statPillValue, { color: colors.status.interview }]}
            >
              {metrics.interview}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("offer")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "offer"
                    ? colors.status.offer
                    : colors.status.offer + "40",
              },
              statusFilter === "offer" && {
                backgroundColor: colors.status.offer + "15",
              },
            ]}
          >
            <Flame size={13} color={colors.status.offer} />
            <Text style={styles.statPillLabel}>Offer</Text>
            <Text
              style={[styles.statPillValue, { color: colors.status.offer }]}
            >
              {metrics.offer}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStatusFilter("rejected")}
            style={[
              styles.statPill,
              {
                borderColor:
                  statusFilter === "rejected"
                    ? colors.status.rejected
                    : colors.status.rejected + "40",
              },
              statusFilter === "rejected" && {
                backgroundColor: colors.status.rejected + "15",
              },
            ]}
          >
            <XCircle size={13} color={colors.status.rejected} />
            <Text style={styles.statPillLabel}>Passed</Text>
            <Text
              style={[styles.statPillValue, { color: colors.status.rejected }]}
            >
              {metrics.rejected}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Search & Filter Controls Toolbar ── */}
        <View style={styles.controlsBar}>
          <View style={styles.searchInputWrapper}>
            <Search
              size={16}
              color={colors.text.dim}
              style={styles.searchIcon}
            />
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by position, company, location, or tech stack..."
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchBtn}
              >
                <XCircle size={14} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Stage Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            <TouchableOpacity
              onPress={() => setStatusFilter("all")}
              style={[
                styles.filterChip,
                statusFilter === "all" && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                All Stages
              </Text>
            </TouchableOpacity>
            {COLUMNS.map((col) => {
              const isActive = statusFilter === col.key;
              return (
                <TouchableOpacity
                  key={col.key}
                  onPress={() => setStatusFilter(col.key)}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    isActive && {
                      borderColor: col.color,
                      backgroundColor: col.color + "15",
                    },
                  ]}
                >
                  <View
                    style={[styles.chipDot, { backgroundColor: col.color }]}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                      isActive && { color: col.color },
                    ]}
                  >
                    {col.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {/* ── Main Pipeline Content: Board vs Matrix ── */}
        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.cyan} />
              <Typography
                variant="body"
                color="secondary"
                style={{ marginTop: 12 }}
              >
                Synchronizing live application pipeline...
              </Typography>
            </View>
          ) : viewMode === "board" ? (
            <KanbanBoard
              applications={filteredApplications}
              isLoading={false}
              onSelectApplication={(app) => setSelectedApp(app)}
              onDeleteApplication={handleDeleteApplication}
            />
          ) : filteredApplications.length === 0 ? (
            <Card style={styles.emptyStateCard}>
              <AlertCircle size={38} color={colors.accent.cyan} />
              <Typography
                variant="h3"
                weight="bold"
                color="primary"
                style={{ marginTop: 12, marginBottom: 4 }}
              >
                No Roles in this Stage
              </Typography>
              <Typography
                variant="bodySm"
                color="secondary"
                style={{ textAlign: "center", maxWidth: 440, marginBottom: 18 }}
              >
                {searchQuery
                  ? "No positions match your current search query. Try clearing filters."
                  : "Launch your radar search or save new roles from discovery to populate this matrix."}
              </Typography>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push("/(tabs)/(dashboard)" as any)}
              >
                <Sparkles size={16} color={colors.text.inverse} />
                <Text style={styles.btnActionText}>Discover New Roles</Text>
              </Button>
            </Card>
          ) : (
            <MatrixListView
              applications={filteredApplications}
              onSelectApplication={(app) => setSelectedApp(app)}
              onUpdateStatus={handleUpdateStatus}
              onGenerateCoverLetter={handleGenerateCoverLetter}
              onDeleteApplication={handleDeleteApplication}
              isCompact={isCompact}
            />
          )}
        </View>

        {/* ── Job Details Modal ── */}
        <Modal
          visible={!!pendingDelete}
          onClose={() => {
            if (!deleteApplicationMutation.isPending) setPendingDelete(null);
          }}
          title="Remove from pipeline"
          maxWidth={440}
        >
          <View style={styles.confirmDeleteContent}>
            <View style={styles.confirmDeleteIcon}>
              <Trash2 size={24} color={colors.accent.red} />
            </View>
            <Typography variant="h4" weight="bold" color="primary">
              Remove this job?
            </Typography>
            <Typography variant="bodySm" color="secondary">
              {pendingDelete?.job_vault?.title || "This job"} will be removed
              from your pipeline and cannot be restored.
            </Typography>
            <View style={styles.confirmDeleteActions}>
              <Button
                variant="ghost"
                onPress={() => setPendingDelete(null)}
                disabled={deleteApplicationMutation.isPending}
                style={styles.confirmDeleteButton}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onPress={confirmDeleteApplication}
                loading={deleteApplicationMutation.isPending}
                accessibilityLabel="Confirm remove job"
                style={styles.confirmDeleteButton}
              >
                Remove job
              </Button>
            </View>
          </View>
        </Modal>

        <Modal
          visible={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title="Position Specification"
          maxWidth={640}
        >
          {selectedApp && (
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeaderBlock}>
                <Typography variant="h3" weight="bold" color="primary">
                  {selectedApp.job_vault?.title || "Position Details"}
                </Typography>
                <View style={styles.modalMetaRow}>
                  <View style={styles.modalMetaItem}>
                    <Building2 size={14} color={colors.accent.cyan} />
                    <Typography
                      variant="bodySm"
                      weight="semiBold"
                      color="primary"
                    >
                      {selectedApp.job_vault?.company || "Company Confidential"}
                    </Typography>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <MapPin size={14} color={colors.text.dim} />
                    <Typography variant="caption" color="secondary">
                      {selectedApp.job_vault?.location || "Remote"}
                    </Typography>
                  </View>
                </View>
              </View>

              {/* Status Switcher Row inside Modal */}
              <View style={styles.modalStatusBox}>
                <Typography
                  variant="caption"
                  weight="bold"
                  color="dim"
                  style={styles.modalSectionTitle}
                >
                  PIPELINE STAGE:
                </Typography>
                <View style={styles.stagePickerRow}>
                  {COLUMNS.map((col) => {
                    const isCurrent = selectedApp.status === col.key;
                    return (
                      <TouchableOpacity
                        key={col.key}
                        onPress={() => handleUpdateStatus(selectedApp, col.key)}
                        style={[
                          styles.stagePickerPill,
                          isCurrent && {
                            backgroundColor: col.color + "25",
                            borderColor: col.color,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.chipDot,
                            { backgroundColor: col.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.stagePickerText,
                            isCurrent && {
                              color: colors.text.primary,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {col.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Salary & Tech Stack */}
              {(selectedApp.job_vault?.salary ||
                selectedApp.job_vault?.salary_min) && (
                <View style={styles.modalDataBlock}>
                  <Typography
                    variant="caption"
                    weight="bold"
                    color="dim"
                    style={styles.modalSectionTitle}
                  >
                    COMPENSATION:
                  </Typography>
                  <Typography
                    variant="bodySm"
                    style={{ color: colors.accent.green, fontWeight: "700" }}
                  >
                    {selectedApp.job_vault?.salary ||
                      "$" +
                        Math.round(
                          (selectedApp.job_vault?.salary_min || 0) / 1000,
                        ) +
                        "k - $" +
                        Math.round(
                          (selectedApp.job_vault?.salary_max || 0) / 1000,
                        ) +
                        "k"}
                  </Typography>
                </View>
              )}

              {selectedApp.job_vault?.tech_stack &&
                selectedApp.job_vault.tech_stack.length > 0 && (
                  <View style={styles.modalDataBlock}>
                    <Typography
                      variant="caption"
                      weight="bold"
                      color="dim"
                      style={styles.modalSectionTitle}
                    >
                      REQUIRED SKILLS & STACK:
                    </Typography>
                    <View style={styles.techTagsRow}>
                      {selectedApp.job_vault.tech_stack.map((t, idx) => (
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

              {/* Description */}
              <View style={styles.modalDataBlock}>
                <Typography
                  variant="caption"
                  weight="bold"
                  color="dim"
                  style={styles.modalSectionTitle}
                >
                  ROLE OVERVIEW:
                </Typography>
                <Typography
                  variant="bodySm"
                  color="secondary"
                  style={styles.jobDescriptionText}
                >
                  {selectedApp.job_vault?.description ||
                    "No description provided."}
                </Typography>
              </View>

              {/* Bottom Quick Actions */}
              <View style={styles.modalFooterActions}>
                <Button
                  variant="primary"
                  size="md"
                  onPress={() => {
                    const targetApp = selectedApp;
                    setSelectedApp(null);
                    handleGenerateCoverLetter(targetApp);
                  }}
                  style={{ flex: 1 }}
                >
                  <Sparkles size={16} color={colors.text.inverse} />
                  <Text style={styles.btnActionText}>
                    Generate Cover Letter
                  </Text>
                </Button>

                {selectedApp.job_vault?.url && (
                  <Button
                    variant="secondary"
                    size="md"
                    onPress={() => {
                      if (selectedApp.job_vault?.url) {
                        Linking.openURL(selectedApp.job_vault.url);
                      }
                    }}
                  >
                    <ExternalLink size={16} color={colors.accent.cyan} />
                    <Text
                      style={[
                        styles.btnActionText,
                        { color: colors.accent.cyan },
                      ]}
                    >
                      Apply Link
                    </Text>
                  </Button>
                )}
              </View>
            </ScrollView>
          )}
        </Modal>

        {/* ── AI Cover Letter Synthesis Modal ── */}
        <Modal
          visible={!!coverLetterApp}
          onClose={() => setCoverLetterApp(null)}
          title="Tailored AI Cover Letter"
          maxWidth={680}
        >
          {coverLetterApp && (
            <View style={styles.coverLetterModalContent}>
              <View style={styles.coverLetterMetaRow}>
                <View>
                  <Typography variant="bodySm" weight="bold" color="primary">
                    {coverLetterApp.job_vault?.title}
                  </Typography>
                  <Typography variant="caption" color="secondary">
                    {coverLetterApp.job_vault?.company}
                  </Typography>
                </View>
                {generatedLetter?.ats_score && (
                  <View style={styles.atsBadge}>
                    <Sparkles size={12} color={colors.accent.cyan} />
                    <Text style={styles.atsScoreText}>
                      ATS Match: {generatedLetter.ats_score}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Formality & Strategy Pills */}
              <View style={styles.strategyConfigBox}>
                <Typography
                  variant="caption"
                  color="dim"
                  style={{ marginBottom: 6 }}
                >
                  Tone & Formality:
                </Typography>
                <View style={styles.optionsRow}>
                  {[
                    { id: "technical_deep_dive", label: "Technical Deep-Dive" },
                    { id: "formal_corporate", label: "Corporate Formal" },
                    { id: "executive_brief", label: "Executive Brief" },
                    { id: "storytelling", label: "Storytelling" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedFormality(item.id);
                        handleGenerateCoverLetter(
                          coverLetterApp,
                          item.id,
                          selectedStrategy,
                        );
                      }}
                      style={[
                        styles.optionChip,
                        selectedFormality === item.id &&
                          styles.optionChipActive,
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
              </View>

              {isGeneratingLetter ? (
                <View style={styles.generatingBlock}>
                  <ActivityIndicator size="large" color={colors.accent.cyan} />
                  <Typography
                    variant="bodySm"
                    weight="semiBold"
                    color="primary"
                    style={{ marginTop: 14 }}
                  >
                    Synthesizing Tailored Multi-Model Cover Letter...
                  </Typography>
                  <Typography
                    variant="caption"
                    color="dim"
                    style={{ marginTop: 4 }}
                  >
                    Aligning candidate achievements with{" "}
                    {coverLetterApp.job_vault?.company} requirements
                  </Typography>
                </View>
              ) : generatedLetter ? (
                <ScrollView
                  style={styles.letterScroll}
                  showsVerticalScrollIndicator={false}
                >
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

                    <Button
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        handleUpdateStatus(coverLetterApp, "applied");
                        setCoverLetterApp(null);
                      }}
                    >
                      <CheckCircle2 size={16} color={colors.accent.green} />
                      <Text
                        style={[
                          styles.btnActionText,
                          { color: colors.accent.green },
                        ]}
                      >
                        Mark as Applied
                      </Text>
                    </Button>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          )}
        </Modal>
      </View>
    </SafeAreaWrapper>
  );
}

// ── Matrix / Detailed History Table View ─────────────────────────────────────
function MatrixListView({
  applications,
  onSelectApplication,
  onUpdateStatus,
  onGenerateCoverLetter,
  onDeleteApplication,
  isCompact,
}: {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
  onUpdateStatus: (app: Application, status: Status) => void;
  onGenerateCoverLetter: (app: Application) => void;
  onDeleteApplication: (app: Application) => void;
  isCompact: boolean;
}) {
  return (
    <ScrollView
      style={styles.matrixScroll}
      contentContainerStyle={styles.matrixContent}
      showsVerticalScrollIndicator={false}
    >
      {!isCompact && <View style={styles.matrixListHeader}>
        <Typography
          variant="caption"
          weight="bold"
          color="dim"
          style={{ flex: 3 }}
        >
          ROLE / COMPANY
        </Typography>
        <Typography
          variant="caption"
          weight="bold"
          color="dim"
          style={{ flex: 2 }}
        >
          LOCATION & SALARY
        </Typography>
        <Typography
          variant="caption"
          weight="bold"
          color="dim"
          style={{ flex: 2 }}
        >
          STATUS
        </Typography>
        <Typography
          variant="caption"
          weight="bold"
          color="dim"
          style={{ flex: 2, textAlign: "right" }}
        >
          ACTIONS
        </Typography>
      </View>}

      {applications.map((app, index) => {
        const job = app.job_vault;
        const colConfig = COLUMNS.find((c) => c.key === app.status);

        return (
          <Animated.View
            key={app.id}
            entering={FadeInDown.delay(index * 20).springify()}
          >
            <Pressable onPress={() => onSelectApplication(app)}>
              <Card
                variant="interactive"
                style={[
                  styles.matrixRowCard,
                  isCompact && styles.matrixRowCardCompact,
                ]}
              >
                <View
                  style={[
                    styles.matrixRowGrid,
                    isCompact && styles.matrixRowGridCompact,
                  ]}
                >
                  {/* Title & Company */}
                  <View
                    style={[
                      styles.matrixColTitle,
                      isCompact && styles.matrixColTitleCompact,
                    ]}
                  >
                    <Typography
                      variant="bodySm"
                      weight="bold"
                      color="primary"
                      numberOfLines={1}
                    >
                      {job?.title || "Untitled Role"}
                    </Typography>
                    <View style={styles.matrixCompanySubRow}>
                      <Building2 size={12} color={colors.text.secondary} />
                      <Typography
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {job?.company || "Company Confidential"}
                      </Typography>
                      <Badge
                        variant="default"
                        label={(job?.source || "RADAR").toUpperCase()}
                        size="sm"
                        dot={false}
                      />
                    </View>
                  </View>

                  {/* Location & Salary */}
                  <View
                    style={[
                      styles.matrixColMeta,
                      isCompact && styles.matrixColMetaCompact,
                    ]}
                  >
                    <View style={styles.metaRowInline}>
                      <MapPin size={11} color={colors.text.dim} />
                      <Typography
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                      >
                        {job?.location || "Remote"}
                      </Typography>
                    </View>
                    {(job?.salary || job?.salary_min) && (
                      <View style={styles.metaRowInline}>
                        <DollarSign size={11} color={colors.accent.green} />
                        <Typography
                          variant="caption"
                          style={{
                            color: colors.accent.green,
                            fontWeight: "600",
                          }}
                        >
                          {job?.salary ||
                            "$" +
                              Math.round((job?.salary_min || 0) / 1000) +
                              "k"}
                        </Typography>
                      </View>
                    )}
                  </View>

                  {/* Current Status Pill */}
                  <View
                    style={[
                      styles.matrixColStatus,
                      isCompact && styles.matrixColStatusCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusPillBadge,
                        {
                          backgroundColor:
                            (colConfig?.color || colors.accent.cyan) + "18",
                          borderColor:
                            (colConfig?.color || colors.accent.cyan) + "50",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDotSmall,
                          {
                            backgroundColor:
                              colConfig?.color || colors.accent.cyan,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: colConfig?.color || colors.accent.cyan },
                        ]}
                      >
                        {colConfig?.label || app.status}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View
                    style={[
                      styles.matrixColActions,
                      isCompact && styles.matrixColActionsCompact,
                    ]}
                  >
                    {(app.status === "saved" || app.status === "rejected") && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteApplication(app);
                        }}
                        style={({ pressed }) => [
                          styles.actionIconButton,
                          styles.deleteActionButton,
                          pressed && styles.actionPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          app.status === "rejected"
                            ? "Delete passed job"
                            : "Remove saved job"
                        }
                        hitSlop={4}
                      >
                        <Trash2 size={15} color={colors.accent.red} />
                      </Pressable>
                    )}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onGenerateCoverLetter(app);
                      }}
                      style={styles.actionIconButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Generate cover letter for ${job?.title || "job"}`}
                    >
                      <Sparkles size={15} color={colors.accent.cyan} />
                    </TouchableOpacity>

                    {job?.url && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL(job.url);
                        }}
                        style={styles.actionIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${job?.title || "job"} application link`}
                      >
                        <ExternalLink size={15} color={colors.text.secondary} />
                      </TouchableOpacity>
                    )}

                    {colConfig?.nextStatus && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (colConfig.nextStatus) {
                            onUpdateStatus(app, colConfig.nextStatus);
                          }
                        }}
                        style={[
                          styles.advanceMatrixBtn,
                          {
                            backgroundColor: colConfig.color + "20",
                            borderColor: colConfig.color + "50",
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Move job to ${colConfig.nextStatus}`}
                      >
                        <Typography
                          variant="caption"
                          style={{
                            color: colConfig.color,
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          {"→ " + colConfig.nextStatus}
                        </Typography>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  headerTitles: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.cyan,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 210, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.25)",
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  toggleBtn: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent.cyan,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  toggleBtnTextActive: {
    color: colors.text.inverse,
    fontWeight: "700",
  },
  metricsScrollView: {
    maxHeight: 48,
    marginBottom: 16,
  },
  metricsContent: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statPill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    borderWidth: 1,
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statPillLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  controlsBar: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  },
  searchInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    paddingLeft: 36,
  },
  clearSearchBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 12,
    zIndex: 2,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  filterChipActive: {
    backgroundColor: "rgba(0, 210, 255, 0.15)",
    borderColor: colors.accent.cyan,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.accent.cyan,
    fontWeight: "700",
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 20, 38, 0.5)",
    marginVertical: 20,
  },
  btnActionText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  modalScroll: {
    maxHeight: 520,
  },
  modalHeaderBlock: {
    marginBottom: 16,
  },
  modalMetaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    alignItems: "center",
  },
  modalMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalStatusBox: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  modalSectionTitle: {
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stagePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  stagePickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  stagePickerText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  modalDataBlock: {
    marginBottom: 14,
  },
  techTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  jobDescriptionText: {
    lineHeight: 20,
  },
  modalFooterActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
  },
  coverLetterModalContent: {
    paddingVertical: 4,
  },
  coverLetterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  strategyConfigBox: {
    backgroundColor: "rgba(6, 182, 212, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 14,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  optionChipActive: {
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderColor: colors.accent.cyan,
  },
  optionText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  optionTextActive: {
    color: colors.accent.cyan,
    fontWeight: "700",
  },
  atsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 210, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.3)",
  },
  atsScoreText: {
    color: colors.accent.cyan,
    fontSize: 12,
    fontWeight: "700",
  },
  generatingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  letterScroll: {
    maxHeight: 460,
  },
  letterCard: {
    backgroundColor: "rgba(5, 8, 17, 0.8)",
    padding: 16,
    marginBottom: 16,
    borderColor: colors.surface.borderCyan,
  },
  letterBodyText: {
    color: colors.text.primary,
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  letterActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  matrixScroll: {
    flex: 1,
  },
  matrixContent: {
    paddingBottom: 140,
    gap: 8,
  },
  matrixListHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    marginBottom: 4,
  },
  matrixRowCard: {
    padding: 14,
    backgroundColor: "rgba(13, 20, 38, 0.7)",
  },
  matrixRowGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  matrixRowCardCompact: {
    padding: 12,
  },
  matrixRowGridCompact: {
    flexWrap: "wrap",
    alignItems: "flex-start",
    rowGap: 8,
  },
  matrixColTitle: {
    flex: 3,
    gap: 4,
  },
  matrixColTitleCompact: {
    flexBasis: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  matrixCompanySubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matrixColMeta: {
    flex: 2,
    gap: 2,
    minWidth: 0,
  },
  matrixColMetaCompact: {
    flex: 1,
    minWidth: 0,
  },
  metaRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  matrixColStatus: {
    flex: 2,
    alignItems: "flex-start",
  },
  matrixColStatusCompact: {
    flex: 0,
    width: 92,
    alignItems: "flex-end",
  },
  statusPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  matrixColActions: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  matrixColActionsCompact: {
    flexBasis: "100%",
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    paddingTop: 8,
  },
  actionIconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.surface.border,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  deleteActionButton: {
    width: 44,
    height: 44,
    padding: 0,
    backgroundColor: `${colors.accent.red}12`,
    borderColor: `${colors.accent.red}45`,
  },
  actionPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
  confirmDeleteContent: {
    alignItems: "center",
    rowGap: 12,
  },
  confirmDeleteIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.accent.red}18`,
    borderWidth: 1,
    borderColor: `${colors.accent.red}50`,
  },
  confirmDeleteActions: {
    width: "100%",
    flexDirection: "row",
    columnGap: 10,
    marginTop: 8,
  },
  confirmDeleteButton: {
    flex: 1,
  },
  advanceMatrixBtn: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
