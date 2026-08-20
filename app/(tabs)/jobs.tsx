/**
 * app/(tabs)/jobs.tsx
 * OpusHunter — Jobs Tab
 * Architecture: React Native Gesture Handler, Reanimated 4.5.1
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Search,
  Check,
  X,
  ExternalLink,
  MapPin,
  Building2,
  Inbox,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/theme";
import { GlassCard } from "../../components/ui/GlassCard";
import { PageContainer } from "../../components/layout/PageContainer";
import { JobDetailModal } from "../../components/pipeline/JobDetailModal";
import type { JobData } from "../../components/pipeline/SwipeableJobCard";
import type { Job, VaultJobStatus } from "../../types/app.types";

const CONTENT_MAX_WIDTH = 1100;
const SWIPE_THRESHOLD = 90;

type FilterKey = "all" | VaultJobStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "applied", label: "Applied" },
  { key: "rejected", label: "Passed" },
];

const scoreColor = (s: number | null) => {
  if (s == null) return C.sub;
  return s >= 85 ? C.cyan : s >= 65 ? C.purple : s >= 45 ? C.amber : C.pink;
};

function statusLabel(s: VaultJobStatus): string {
  return (
    {
      pending: "Pending",
      approved: "Approved",
      applied: "Applied",
      rejected: "Passed",
    }[s] ?? s
  );
}

function statusColor(s: VaultJobStatus): string {
  return (
    { pending: C.amber, approved: C.purple, applied: C.cyan, rejected: C.sub }[
      s
    ] ?? C.sub
  );
}

function statusPillStyle(s: VaultJobStatus) {
  const c = statusColor(s);
  return { borderColor: `${c}30`, backgroundColor: `${c}12` };
}

function JobRowContent({
  job,
  onPress,
  onApprove,
  onReject,
  busy,
  showActions,
}: any) {
  const sColor = scoreColor(job.match_score);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <View style={styles.metaRow}>
            <Building2 size={12} color={C.sub} />
            <Text style={styles.metaText} numberOfLines={1}>
              {job.company}
            </Text>
            {job.location && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <MapPin size={12} color={C.sub} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {job.location}
                </Text>
              </>
            )}
          </View>
        </View>
        {job.match_score != null && (
          <View
            style={[
              styles.scoreBadge,
              { borderColor: `${sColor}40`, backgroundColor: `${sColor}12` },
            ]}
          >
            <Text style={[styles.scoreText, { color: sColor }]}>
              {job.match_score}%
            </Text>
          </View>
        )}
      </View>

      {job.salary && <Text style={styles.salary}>{job.salary}</Text>}

      {!!job.tech_stack?.length && (
        <View style={styles.chipRow}>
          {job.tech_stack.slice(0, 5).map((t: string) => (
            <View key={t} style={styles.techChip}>
              <Text style={styles.techChipText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={[styles.statusPill, statusPillStyle(job.status)]}>
          <Text
            style={[styles.statusPillText, { color: statusColor(job.status) }]}
          >
            {statusLabel(job.status)}
          </Text>
        </View>

        {showActions && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={onReject}
              disabled={busy}
              style={[
                styles.iconBtn,
                { borderColor: `${C.pink}30`, backgroundColor: `${C.pink}10` },
              ]}
              activeOpacity={0.8}
            >
              <X size={15} color={C.pink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApprove}
              disabled={busy}
              style={[
                styles.iconBtn,
                { borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}10` },
              ]}
              activeOpacity={0.8}
            >
              <Check size={15} color={C.cyan} />
            </TouchableOpacity>
          </View>
        )}

        {job.source_url && (
          <TouchableOpacity
            onPress={() =>
              Platform.OS === "web"
                ? window.open(job.source_url, "_blank")
                : undefined
            }
            style={styles.linkBtn}
            activeOpacity={0.7}
          >
            <ExternalLink size={13} color={C.sub} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SwipeableJobRow({ job, onPress, onApprove, onReject, busy }: any) {
  const tx = useSharedValue(0);
  const rowHeight = useSharedValue<number | null>(null);
  const collapsed = useSharedValue(0);

  const finishApprove = useCallback(() => onApprove(), [onApprove]);
  const finishReject = useCallback(() => onReject(), [onReject]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_THRESHOLD;
      const goLeft = e.translationX < -SWIPE_THRESHOLD;

      if (goRight) {
        tx.value = withTiming(500, { duration: 220 });
        collapsed.value = withTiming(1, { duration: 220 });
        runOnJS(finishApprove)();
      } else if (goLeft) {
        tx.value = withTiming(-500, { duration: 220 });
        collapsed.value = withTiming(1, { duration: 220 });
        runOnJS(finishReject)();
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: interpolate(collapsed.value, [0, 1], [1, 0]),
  }));

  const collapseStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      collapsed.value,
      [0, 1],
      [rowHeight.value ?? 400, 0],
      Extrapolation.CLAMP,
    ),
    marginBottom: interpolate(
      collapsed.value,
      [0, 1],
      [12, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const approveRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tx.value,
      [10, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const rejectRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tx.value,
      [-SWIPE_THRESHOLD, -10],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View style={collapseStyle}>
      <View
        onLayout={(e) => {
          if (rowHeight.value == null)
            rowHeight.value = e.nativeEvent.layout.height;
        }}
        style={{ position: "relative" }}
      >
        <Animated.View
          style={[
            styles.swipeReveal,
            styles.swipeRevealLeft,
            approveRevealStyle,
          ]}
        >
          <ThumbsUp size={20} color={C.cyan} />
          <Text style={[styles.swipeRevealText, { color: C.cyan }]}>
            Approve
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.swipeReveal,
            styles.swipeRevealRight,
            rejectRevealStyle,
          ]}
        >
          <Text style={[styles.swipeRevealText, { color: C.pink }]}>
            Reject
          </Text>
          <ThumbsDown size={20} color={C.pink} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={cardStyle}>
            <GlassCard tint="frost" padding="md" hoverable className="mb-3">
              <JobRowContent
                job={job}
                onPress={onPress}
                onApprove={onApprove}
                onReject={onReject}
                busy={busy}
                showActions
              />
            </GlassCard>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

export default function JobsScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [detailJob, setDetailJob] = useState<JobData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: jobs = [],
    isLoading,
    isError,
  } = useQuery<Job[]>({
    queryKey: ["all_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_vault")
        .select(
          "id,title,company,description,salary,location,match_score,tech_stack,status,source_url,url,created_at",
        )
        .order("match_score", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    staleTime: 15_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      await supabase
        .from("job_vault")
        .update({ status: "approved" })
        .eq("id", jobId)
        .eq("user_id", user.id);
      const { error } = await supabase.from("job_applications").insert({
        user_id: user.id,
        job_id: jobId,
        status: "pending_auto_apply",
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_jobs"] });
      qc.invalidateQueries({ queryKey: ["pending_jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline_metrics"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      await supabase
        .from("job_vault")
        .update({ status: "rejected" })
        .eq("id", jobId)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_jobs"] });
      qc.invalidateQueries({ queryKey: ["pending_jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline_metrics"] });
    },
  });

  const confirmApplyWithLetter = useCallback(
    async (job: JobData, editedCoverLetter: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("job_vault")
        .update({ status: "approved" })
        .eq("id", job.id)
        .eq("user_id", user.id);
      const { data: inserted, error } = await supabase
        .from("job_applications")
        .insert({
          user_id: user.id,
          job_id: job.id,
          status: "pending_auto_apply",
        })
        .select("id")
        .single();
      if (!error && inserted?.id && editedCoverLetter) {
        await supabase.from("cover_letters").insert({
          user_id: user.id,
          job_application_id: inserted.id,
          body: editedCoverLetter,
        });
      }
      qc.invalidateQueries({ queryKey: ["all_jobs"] });
      qc.invalidateQueries({ queryKey: ["pending_jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline_metrics"] });
      setDetailJob(null);
    },
    [qc],
  );

  const confirmPass = useCallback(
    async (job: JobData) => {
      await rejectMutation.mutateAsync(job.id);
      setDetailJob(null);
    },
    [rejectMutation],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["all_jobs"] });
    setRefreshing(false);
  }, [qc]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (filter !== "all") list = list.filter((j) => j.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          (j.location ?? "").toLowerCase().includes(q) ||
          (j.tech_stack ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [jobs, filter, search]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: jobs.length,
      pending: 0,
      approved: 0,
      applied: 0,
      rejected: 0,
    };
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  return (
    <PageContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.cyan}
            />
          ) : undefined
        }
      >
        <Text style={styles.screenTitle}>Jobs</Text>
        <Text style={styles.screenSub}>
          {jobs.length} job{jobs.length === 1 ? "" : "s"} in your pipeline
        </Text>

        <View style={styles.searchBar}>
          <Search size={16} color={C.sub} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, company, location, stack…"
            placeholderTextColor={C.dim}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={15} color={C.sub} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[
                    styles.filterChip,
                    active && {
                      backgroundColor: `${C.cyan}18`,
                      borderColor: `${C.cyan}50`,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.filterChipText, active && { color: C.cyan }]}
                  >
                    {label} · {counts[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {filter === "pending" && filtered.length > 0 && (
          <Text style={styles.swipeHint}>
            Swipe a card right to approve, left to reject — or use the buttons.
          </Text>
        )}

        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={C.cyan} />
          </View>
        ) : isError ? (
          <GlassCard tint="frost" padding="lg" className="items-center gap-2">
            <Text style={{ color: C.text, fontWeight: "700" }}>
              Couldn't load jobs
            </Text>
            <TouchableOpacity
              onPress={() => qc.invalidateQueries({ queryKey: ["all_jobs"] })}
            >
              <Text style={{ color: C.cyan, fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: "center", gap: 10 }}>
            <Inbox size={32} color={C.dim} />
            <Text style={{ color: C.sub, fontSize: 14 }}>
              {jobs.length === 0
                ? "No jobs scraped yet — run the Engine from Configure."
                : "No jobs match this filter/search."}
            </Text>
          </View>
        ) : (
          filtered.map((job, i) => {
            const busy = approveMutation.isPending || rejectMutation.isPending;
            const onPress = () => setDetailJob(job as JobData);
            const onApprove = () => approveMutation.mutate(job.id);
            const onReject = () => rejectMutation.mutate(job.id);

            return (
              <Animated.View
                key={job.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 30)}
              >
                {job.status === "pending" ? (
                  <SwipeableJobRow
                    job={job}
                    onPress={onPress}
                    onApprove={onApprove}
                    onReject={onReject}
                    busy={busy}
                  />
                ) : (
                  <GlassCard
                    tint="frost"
                    padding="md"
                    hoverable
                    className="mb-3"
                  >
                    <JobRowContent
                      job={job}
                      onPress={onPress}
                      onApprove={onApprove}
                      onReject={onReject}
                      busy={busy}
                      showActions={false}
                    />
                  </GlassCard>
                )}
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <JobDetailModal
        visible={!!detailJob}
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onConfirmApply={confirmApplyWithLetter}
        onConfirmPass={confirmPass}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    maxWidth: CONTENT_MAX_WIDTH,
    width: "100%",
    alignSelf: "center" as any,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    marginBottom: 2,
  },
  screenSub: { fontSize: 13, color: C.sub, marginBottom: 16 },
  swipeHint: { fontSize: 11, color: C.dim, marginBottom: 12, marginTop: -4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardBg,
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: C.sub },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  title: { fontSize: 15, fontWeight: "700", color: C.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: C.sub },
  metaDot: { color: C.dim, fontSize: 12 },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: { fontSize: 12, fontWeight: "800" },
  salary: { fontSize: 12, color: C.amber, fontWeight: "600", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  techChip: {
    backgroundColor: `${C.core}12`,
    borderWidth: 1,
    borderColor: `${C.core}24`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  techChipText: { fontSize: 10, fontWeight: "700", color: C.core },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeReveal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  swipeRevealLeft: {
    left: 0,
    justifyContent: "flex-start",
    backgroundColor: `${C.cyan}12`,
  },
  swipeRevealRight: {
    right: 0,
    justifyContent: "flex-end",
    backgroundColor: `${C.pink}12`,
  },
  swipeRevealText: { fontSize: 13, fontWeight: "800" },
});
