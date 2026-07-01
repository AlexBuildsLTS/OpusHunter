/**
 * app/(tabs)/dashboard.tsx
 * OpusHunter — Main Job Hunt Dashboard
 * 2026-06-29
 *
 * Features:
 *   - Live pipeline metrics from get_user_pipeline_metrics() RPC (single call)
 *   - Pending job cards from job_vault (swipeable)
 *   - Batch Apply Queue: processes 5 applications at a time, progress bar, no OOM
 *   - Premium gate: members see limited jobs (20), premium/admin see unlimited
 *   - "Run Scraper" shortcut button
 *   - Web: max-w-5xl centered content, sidebar-aware
 *   - Mobile: full width, scroll-safe
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  Zap, BarChart2, CheckCircle2, Clock, Briefcase,
  AlertCircle, RefreshCw, TrendingUp, Play, Pause,
  ChevronRight, Lock, Target,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { SwipeableJobCard } from '../../components/pipeline/SwipeableJobCard';
import { useEdgeScraper } from '../../hooks/useEdgeScraper';
import type { Job } from '../../types/app.types';
import { C } from '../../lib/theme';


// ── METRIC CARD ────────────────────────────────────────────────────────────────

const MetricCard = ({
  label, value, color, icon: Icon, trend,
}: {
  label: string; value: number | string; color: string;
  icon: React.ElementType; trend?: string;
}) => (
  <View style={[mS.card, { borderColor: `${color}18`, backgroundColor: `${color}06` }]}>
    <View style={[mS.iconBox, { backgroundColor: `${color}12`, borderColor: `${color}22` }]}>
      <Icon size={16} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[mS.value, { color }]}>{value}</Text>
    <Text style={mS.label}>{label}</Text>
    {trend && <Text style={[mS.trend, { color: `${color}80` }]}>{trend}</Text>}
  </View>
);
const mS = StyleSheet.create({
  card: {
    flex: 1, minWidth: 100, borderRadius: 18, borderWidth: 1,
    padding: 16, gap: 6, alignItems: 'flex-start',
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(216,228,236,0.45)', letterSpacing: 1.5, textTransform: 'uppercase' },
  trend: { fontSize: 10, fontWeight: '600' },
});

// ── BATCH APPLY QUEUE ──────────────────────────────────────────────────────────
// Processes CHUNK_SIZE applications at a time to prevent OOM and Vercel timeout

const CHUNK_SIZE = 5;

interface QueueState {
  running: boolean;
  total: number;
  done: number;
  failed: number;
  current: string | null; // job title currently being applied to
}

const INITIAL_QUEUE: QueueState = { running: false, total: 0, done: 0, failed: 0, current: null };

// ── PREMIUM GATE BANNER ────────────────────────────────────────────────────────

const PremiumGate = ({ onUpgrade }: { onUpgrade: () => void }) => (
  <Animated.View entering={FadeInDown.springify()} style={pgS.wrap}>
    <Lock size={18} color={C.amber} />
    <View style={{ flex: 1 }}>
      <Text style={pgS.title}>Premium Unlocks Unlimited Applications</Text>
      <Text style={pgS.sub}>Free plan processes 20 jobs/day. Upgrade to remove limits.</Text>
    </View>
    <TouchableOpacity onPress={onUpgrade} style={pgS.btn} activeOpacity={0.8}>
      <Text style={pgS.btnText}>UPGRADE</Text>
    </TouchableOpacity>
  </Animated.View>
);
const pgS = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${C.amber}08`, borderWidth: 1, borderColor: `${C.amber}30`,
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  title: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  sub: { fontSize: 11, color: C.sub, lineHeight: 16 },
  btn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.amber, alignItems: 'center',
  },
  btnText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1.5 },
});

// ── MAIN SCREEN ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { triggerScrape, isLoading: isScraping } = useEdgeScraper();
  const [queue, setQueue] = useState<QueueState>(INITIAL_QUEUE);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // ── Profile + role ──────────────────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      return data;
    },
    staleTime: 60_000,
  });

  const role = profile?.role ?? 'member';
  const isPremium = role === 'premium' || role === 'admin';
  const jobLimit = isPremium ? 999 : 20;

  // ── Pipeline metrics ────────────────────────────────────────────────────────
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['pipeline_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
      if (error) throw error;
      return data as {
        total_jobs: number; pending: number; applied: number;
        interviews: number; total_rules: number; active_rules: number; cover_letters: number;
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Pending jobs for swipe deck ─────────────────────────────────────────────
  const { data: pendingJobs = [], isLoading: jobsLoading, isError } = useQuery<Job[]>({
    queryKey: ['pending_jobs', jobLimit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_vault')
        .select('id,title,company,description,salary,location,match_score,tech_stack,status,source_url,url,created_at')
        .eq('status', 'pending')
        .order('match_score', { ascending: false })
        .limit(jobLimit);
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    staleTime: 15_000,
  });

  // ── Approve / Reject single job ─────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      // Update job status
      await supabase.from('job_vault').update({ status: 'approved' }).eq('id', jobId).eq('user_id', user.id);

      // Create application record
      const { error } = await supabase.from('job_applications').insert({
        user_id: user.id,
        job_id: jobId,
        status: 'pending_auto_apply',
      });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending_jobs'] });
      qc.invalidateQueries({ queryKey: ['pipeline_metrics'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      await supabase.from('job_vault').update({ status: 'rejected' }).eq('id', jobId).eq('user_id', user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending_jobs'] });
      qc.invalidateQueries({ queryKey: ['pipeline_metrics'] });
    },
  });

  // ── BATCH APPLY QUEUE ───────────────────────────────────────────────────────
  // Gets all pending_auto_apply applications, processes CHUNK_SIZE at a time

  const startBatchApply = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch pending applications
    const { data: apps, error } = await supabase
      .from('job_applications')
      .select('id, job_id, job_vault(title, company)')
      .eq('user_id', user.id)
      .eq('status', 'pending_auto_apply')
      .limit(isPremium ? 200 : 20);

    if (error || !apps?.length) return;

    setQueue({ running: true, total: apps.length, done: 0, failed: 0, current: null });

    // Process in chunks to avoid OOM / timeout
    for (let i = 0; i < apps.length; i += CHUNK_SIZE) {
      if (!queueRef.current.running) break; // user paused

      const chunk = apps.slice(i, i + CHUNK_SIZE);

      await Promise.allSettled(
        chunk.map(async (app: any) => {
          const jobTitle = (app.job_vault as any)?.title ?? 'Unknown Job';
          setQueue((prev) => ({ ...prev, current: `${jobTitle} @ ${(app.job_vault as any)?.company ?? ''}` }));

          try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auto-apply`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ job_application_id: app.id }),
              }
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            setQueue((prev) => ({ ...prev, done: prev.done + 1 }));
          } catch {
            setQueue((prev) => ({ ...prev, failed: prev.failed + 1 }));
          }
        })
      );

      // Breathe between chunks — prevents event loop starvation
      await new Promise((r) => setTimeout(r, 300));
    }

    setQueue((prev) => ({ ...prev, running: false, current: null }));
    qc.invalidateQueries({ queryKey: ['pipeline_metrics'] });
    qc.invalidateQueries({ queryKey: ['pending_jobs'] });
  }, [isPremium]);

  const pauseQueue = useCallback(() => {
    setQueue((prev) => ({ ...prev, running: false }));
  }, []);

  const resetQueue = useCallback(() => setQueue(INITIAL_QUEUE), []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isDesktop = Platform.OS === 'web';

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Web ambient background */}
        {isDesktop && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0,212,255,0.05) 0%, transparent 60%)' }} />
          </View>
        )}

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={s.header}>
          <View>
            <Text style={s.greeting}>
              Hello <Text style={{ color: C.cyan }}>{profile?.full_name?.split(' ')[0] ?? 'Hunter'}</Text>
            </Text>
            <Text style={s.headerSub}>Your pipeline is{' '}
              <Text style={{ color: C.green, fontWeight: '700' }}>active</Text>
            </Text>
          </View>

          {/* Scrape CTA */}
          <TouchableOpacity
            onPress={() => triggerScrape()}
            disabled={isScraping || !metrics?.active_rules}
            style={[s.scrapeBtn, (isScraping || !metrics?.active_rules) && { opacity: 0.5 }]}
            activeOpacity={0.8}
          >
            {isScraping
              ? <ActivityIndicator size="small" color={C.cyan} />
              : (
                <>
                  <RefreshCw size={14} color={C.cyan} />
                  <Text style={s.scrapeBtnText}>REFRESH</Text>
                </>
              )
            }
          </TouchableOpacity>
        </Animated.View>

        {/* ── Premium gate ── */}
        {!isPremium && pendingJobs.length >= 18 && (
          <PremiumGate onUpgrade={() => router.push('/(settings)/' as any)} />
        )}

        {/* ── Metrics row ── */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.metricsRow}>
          {metricsLoading ? (
            [0, 1, 2, 3].map((i) => (
              <View key={i} style={[mS.card, s.skeleton]} />
            ))
          ) : (
            <>
              <MetricCard label="Scraped" value={metrics?.total_jobs ?? 0} color={C.cyan} icon={Target} />
              <MetricCard label="Applied" value={metrics?.applied ?? 0} color={C.green} icon={CheckCircle2} />
              <MetricCard label="Pending" value={metrics?.pending ?? 0} color={C.amber} icon={Clock} />
              <MetricCard label="Interviews" value={metrics?.interviews ?? 0} color={C.purple} icon={TrendingUp} />
            </>
          )}
        </Animated.View>

        {/* ── Batch Apply Engine ── */}
        {(queue.running || queue.done > 0 || queue.total > 0) && (
          <Animated.View entering={FadeInDown.springify()} style={s.batchCard}>
            <View style={s.batchHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color={C.cyan} />
                <Text style={s.batchTitle}>Auto-Apply Engine</Text>
                {queue.running && <ActivityIndicator size="small" color={C.cyan} />}
              </View>
              <Text style={s.batchCount}>
                {queue.done}/{queue.total} {queue.failed > 0 && <Text style={{ color: C.pink }}>({queue.failed} failed)</Text>}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  { width: queue.total > 0 ? `${Math.round((queue.done / queue.total) * 100)}%` : '0%' as any }
                ]}
              />
            </View>

            {queue.current && (
              <Text style={s.batchCurrent} numberOfLines={1}>
                → Applying to <Text style={{ color: C.cyan }}>{queue.current}</Text>
              </Text>
            )}

            {/* Controls */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {queue.running ? (
                <TouchableOpacity onPress={pauseQueue} style={[s.queueBtn, { borderColor: `${C.amber}40` }]} activeOpacity={0.8}>
                  <Pause size={13} color={C.amber} />
                  <Text style={[s.queueBtnText, { color: C.amber }]}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startBatchApply} style={[s.queueBtn, { borderColor: `${C.cyan}40` }]} activeOpacity={0.8}>
                  <Play size={13} color={C.cyan} />
                  <Text style={[s.queueBtnText, { color: C.cyan }]}>
                    {queue.done > 0 ? 'Resume' : 'Start Engine'}
                  </Text>
                </TouchableOpacity>
              )}
              {!queue.running && queue.total > 0 && (
                <TouchableOpacity onPress={resetQueue} style={[s.queueBtn, { borderColor: C.border }]} activeOpacity={0.8}>
                  <RefreshCw size={13} color={C.sub} />
                  <Text style={[s.queueBtnText, { color: C.sub }]}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Start Apply Engine CTA (when no queue active) ── */}
        {queue.total === 0 && (metrics?.pending ?? 0) > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <TouchableOpacity onPress={startBatchApply} style={s.startEngineBtn} activeOpacity={0.85}>
              <Zap size={18} color="#000" strokeWidth={2.5} />
              <View>
                <Text style={s.startEngineBtnTitle}>START AUTO-APPLY ENGINE</Text>
                <Text style={s.startEngineBtnSub}>
                  {metrics?.pending ?? 0} jobs queued · {CHUNK_SIZE} concurrent · AI cover letters
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Swipe Deck ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={s.deckSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Job Pipeline</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/vault' as any)} style={s.sectionLink} activeOpacity={0.8}>
              <Text style={s.sectionLinkText}>View Vault</Text>
              <ChevronRight size={14} color={C.cyan} />
            </TouchableOpacity>
          </View>

          {jobsLoading ? (
            <View style={s.center}>
              <ActivityIndicator color={C.cyan} size="large" />
              <Text style={s.centerText}>Loading pipeline…</Text>
            </View>
          ) : isError ? (
            <View style={[s.center, s.errorBox]}>
              <AlertCircle size={28} color={C.pink} />
              <Text style={[s.centerText, { color: C.pink }]}>Failed to load jobs</Text>
              <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['pending_jobs'] })} style={s.retryBtn}>
                <Text style={{ color: C.cyan, fontSize: 13, fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : pendingJobs.length === 0 ? (
            <Animated.View entering={FadeInUp.springify()} style={s.emptyDeck}>
              <CheckCircle2 size={40} color={C.green} />
              <Text style={s.emptyTitle}>All Clear!</Text>
              <Text style={s.emptySub}>
                No pending jobs. Run the scraper to fetch new listings from your active rules.
              </Text>
              <TouchableOpacity
                onPress={() => triggerScrape()}
                disabled={isScraping || !metrics?.active_rules}
                style={[s.emptyBtn, (!metrics?.active_rules) && { opacity: 0.5 }]}
                activeOpacity={0.8}
              >
                <Zap size={14} color={C.cyan} />
                <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>Run Scraper</Text>
              </TouchableOpacity>
              {!metrics?.active_rules && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/configure' as any)} style={{ marginTop: 10 }} activeOpacity={0.8}>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    No active rules —{' '}
                    <Text style={{ color: C.cyan, fontWeight: '700' }}>add one →</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ) : (
            <View style={s.deck}>
              {/* Top 3 cards stacked — only top one is interactive */}
              {pendingJobs.slice(0, Math.min(3, pendingJobs.length)).reverse().map((job: any, i: number, arr: any[]) => {
                const isTop = i === arr.length - 1;
                return (
                  <View
                    key={job.id}
                    style={[
                      s.cardLayer,
                      {
                        zIndex: i,
                        transform: [
                          { scale: 1 - (arr.length - 1 - i) * 0.025 },
                          { translateY: (arr.length - 1 - i) * 10 },
                        ],
                      },
                    ]}
                  >
                    {isTop ? (
                      <SwipeableJobCard
                        job={job}
                        onSwipeRight={() => approveMutation.mutate(job.id)}
                        onSwipeLeft={() => rejectMutation.mutate(job.id)}
                        onPress={() => router.push(`/(tabs)/vault` as any)}
                      />
                    ) : (
                      <View style={[s.bgCard, { backgroundColor: `rgba(8,16,24,${0.6 - (arr.length - 1 - i) * 0.15})` }]} />
                    )}
                  </View>
                );
              })}

              {/* Remaining count */}
              {pendingJobs.length > 1 && (
                <Animated.View entering={FadeInDown.delay(300).springify()} style={s.remainingBadge}>
                  <Text style={s.remainingText}>{pendingJobs.length} jobs pending</Text>
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── Quick Nav Cards ── */}
        <Animated.View entering={FadeInDown.delay(280).springify()} style={s.quickNav}>
          {[
            { label: 'Search Rules', sub: `${metrics?.active_rules ?? 0} active`, route: '/(tabs)/configure', color: C.purple, icon: Briefcase },
            { label: 'Cover Letters', sub: `${metrics?.cover_letters ?? 0} saved`, route: '/(tabs)/vault', color: C.cyan, icon: BarChart2 },
          ].map(({ label, sub, route, color, icon: Icon }) => (
            <TouchableOpacity
              key={route}
              onPress={() => router.push(route as any)}
              style={[s.quickCard, { borderColor: `${color}18` }]}
              activeOpacity={0.8}
            >
              <View style={[s.quickIcon, { backgroundColor: `${color}10`, borderColor: `${color}20` }]}>
                <Icon size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.quickLabel, { color }]}>{label}</Text>
                <Text style={s.quickSub}>{sub}</Text>
              </View>
              <ChevronRight size={16} color={`${color}60`} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  scrollDesktop: { maxWidth: 1100, width: '100%', alignSelf: 'center' as any },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: C.sub, marginTop: 3 },
  scrapeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1, borderColor: `${C.cyan}30`,
    backgroundColor: `${C.cyan}08`,
  },
  scrapeBtnText: { fontSize: 10, fontWeight: '800', color: C.cyan, letterSpacing: 1.5 },

  /* Metrics */
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  skeleton: { flex: 1, minWidth: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.03)' },

  /* Batch apply */
  batchCard: {
    backgroundColor: 'rgba(8,16,24,0.88)',
    borderWidth: 1, borderColor: `${C.cyan}22`, borderRadius: 20,
    padding: 18, marginBottom: 20,
  },
  batchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  batchTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  batchCount: { fontSize: 13, fontWeight: '700', color: C.sub },
  batchCurrent: { fontSize: 12, color: C.sub, marginTop: 8, fontStyle: 'italic' },

  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: {
    height: '100%' as any, borderRadius: 2,
    backgroundColor: C.cyan,
  },

  queueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  queueBtnText: { fontSize: 12, fontWeight: '700' },

  /* Start engine */
  startEngineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.cyan, borderRadius: 18, padding: 18, marginBottom: 24,
    shadowColor: C.cyan, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
  },
  startEngineBtnTitle: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1.5, marginBottom: 2 },
  startEngineBtnSub: { fontSize: 11, color: 'rgba(0,0,0,0.55)', fontWeight: '600' },

  /* Deck */
  deckSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionLinkText: { fontSize: 12, fontWeight: '700', color: C.cyan },

  deck: { height: 440, position: 'relative', alignItems: 'center' },
  cardLayer: { position: 'absolute', width: '100%', height: 400 },
  bgCard: { width: '100%', height: 400, borderRadius: 24, borderWidth: 1, borderColor: C.border },

  remainingBadge: {
    position: 'absolute', bottom: 0, alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(8,16,24,0.8)', borderWidth: 1, borderColor: C.border,
  },
  remainingText: { fontSize: 11, fontWeight: '700', color: C.sub, letterSpacing: 1 },

  /* Empty deck */
  emptyDeck: {
    alignItems: 'center', paddingVertical: 50,
    backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, borderColor: `${C.cyan}35`, backgroundColor: `${C.cyan}08`,
  },

  /* Error */
  center: { alignItems: 'center', paddingVertical: 40 },
  centerText: { fontSize: 14, color: C.sub, marginTop: 12 },
  errorBox: { backgroundColor: `${C.pink}05`, borderRadius: 20, borderWidth: 1, borderColor: `${C.pink}18` },
  retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: `${C.cyan}35` },

  /* Quick nav */
  quickNav: { gap: 10 },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card, borderWidth: 1, borderRadius: 18, padding: 16,
  },
  quickIcon: { width: 46, height: 46, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  quickSub: { fontSize: 12, color: C.sub },
});