/**
 * app/(tabs)/dashboard.tsx — OpusHunter Pipeline Dashboard
 * Updated: 2026-06-26
 * - Full ProfileDropdown: Profile / Settings & Rules / Admin Panel (admin-only) / Sign Out
 * - JobDetailModal wired (tap card)
 * - job_status enum: 'pending' (fix for 'active' bug)
 * - Swipe right → auto-apply with optional edited cover letter
 * - Filter chips fully functional
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, Pressable, Platform, ScrollView,
  RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { User, Settings, LogOut, ChevronDown, ShieldAlert, Zap } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { usePipelineStore } from '../../store/usePipelineStore';
import { SwipeableJobCard } from '../../components/pipeline/SwipeableJobCard';
import { JobDetailModal } from '../../components/pipeline/JobDetailModal';
import { GlassCard } from '../../components/ui/GlassCard';
import { useEdgeScraper } from '../../hooks/useEdgeScraper';
import type { Database } from '../../types/database.types';
import type { JobData } from '../../components/pipeline/SwipeableJobCard';

type JobVaultRow = Database['public']['Tables']['job_vault']['Row'];

const C = {
  green: '#00C67D', cyan: '#00D4FF', purple: '#7B5EA7',
  pink: '#E8436A', amber: '#F59E0B', bg: '#0A1419',
  border: 'rgba(120,200,240,0.09)',
};

const FILTER_CHIPS = [
  { label: 'Remote Only', field: 'location', value: 'remote' },
  { label: 'Hybrid', field: 'location', value: 'hybrid' },
  { label: 'Onsite', field: 'location', value: 'onsite' },
  { label: 'React Native', field: 'tech', value: 'React Native' },
  { label: 'TypeScript', field: 'tech', value: 'TypeScript' },
  { label: 'Senior', field: 'tech', value: 'Senior' },
  { label: 'Python', field: 'tech', value: 'Python' },
  { label: 'Deno', field: 'tech', value: 'Deno' },
];

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 90% 95%, rgba(0,180,210,0.07) 0%, transparent 70%)' }} />
    </View>
  );
}

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: `${color}25`, backgroundColor: `${color}0D` }}>
    <Text style={{ fontSize: 24, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ fontSize: 9, fontWeight: '700', color: `${color}90`, letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>{label}</Text>
  </View>
);

const SkeletonCard = () => (
  <Animated.View entering={FadeIn} exiting={FadeOutUp} style={[styles.cardSlot, { zIndex: 20 }]}>
    <GlassCard style={{ flex: 1, padding: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ width: '60%', height: 22, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,212,255,0.06)' }} />
      </View>
      {[1, 0.85, 0.7, 0.55, 0.4].map((w, i) => (
        <View key={i} style={{ width: `${w * 100}%`, height: 11, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      ))}
    </GlassCard>
  </Animated.View>
);

// ── Full ProfileDropdown ──────────────────────────────────────────────────────
function ProfileDropdown({ initials, email, role }: { initials: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isAdmin = role === 'admin';

  const go = useCallback((path: string) => { setOpen(false); router.push(path as any); }, [router]);
  const signOut = useCallback(async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      <TouchableOpacity onPress={() => setOpen(p => !p)} activeOpacity={0.8} style={styles.avatarBtn}>
        <Text style={styles.avatarText}>{initials}</Text>
        <ChevronDown size={11} color={`${C.purple}99`} style={{ marginLeft: 3 }} />
      </TouchableOpacity>
      {open && (
        <>
          <Pressable style={[StyleSheet.absoluteFill, { position: 'fixed' as any }]} onPress={() => setOpen(false)} />
          <Animated.View entering={FadeInDown.duration(160).springify()} style={styles.dropdown}>
            {/* Header */}
            <View style={styles.ddHeader}>
              <View style={styles.ddAvatar}><Text style={styles.ddAvatarText}>{initials}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.ddName} numberOfLines={1}>{email.split('@')[0]}</Text>
                <Text style={styles.ddEmail} numberOfLines={1}>{email}</Text>
              </View>
            </View>
            <View style={styles.ddDivider} />
            {/* Profile */}
            <TouchableOpacity onPress={() => go('/(tabs)/profile')} style={styles.ddItem} activeOpacity={0.7}>
              <View style={[styles.ddIcon, { backgroundColor: `${C.purple}14` }]}><User size={14} color={C.purple} /></View>
              <Text style={styles.ddItemText}>Profile</Text>
            </TouchableOpacity>
            {/* Settings */}
            <TouchableOpacity onPress={() => go('/(tabs)/configure')} style={styles.ddItem} activeOpacity={0.7}>
              <View style={[styles.ddIcon, { backgroundColor: `${C.cyan}10` }]}><Settings size={14} color={C.cyan} /></View>
              <Text style={styles.ddItemText}>Settings & Rules</Text>
            </TouchableOpacity>
            {/* Admin — role-gated */}
            {isAdmin && (
              <TouchableOpacity onPress={() => go('/(admin)')} style={styles.ddItem} activeOpacity={0.7}>
                <View style={[styles.ddIcon, { backgroundColor: `${C.pink}12` }]}><ShieldAlert size={14} color={C.pink} /></View>
                <Text style={[styles.ddItemText, { color: C.pink }]}>Admin Panel</Text>
              </TouchableOpacity>
            )}
            <View style={styles.ddDivider} />
            {/* Sign out */}
            <TouchableOpacity onPress={signOut} style={styles.ddItem} activeOpacity={0.7}>
              <View style={[styles.ddIcon, { backgroundColor: `${C.pink}10` }]}><LogOut size={14} color={C.pink} /></View>
              <Text style={[styles.ddItemText, { color: C.pink }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { jobQueue, setJobQueue, popJob } = usePipelineStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({ matches: 0, pending: 0, interviews: 0 });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState({ initials: '?', email: '', role: 'member' });
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { triggerScrape, isLoading: isScraping } = useEdgeScraper();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const email = user.email ?? '';
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
      const name = profile?.full_name ?? email;
      const parts = name.trim().split(' ');
      const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
      setUserInfo({ initials, email, role: profile?.role ?? 'member' });
    })();
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pipeline_jobs', activeFilters],
    queryFn: async () => {
      let q = supabase.from('job_vault')
        .select('id, title, company, description, salary, location, match_score, tech_stack, source_url, url')
        .eq('status', 'pending')
        .order('match_score', { ascending: false })
        .limit(30);

      const locFilters = activeFilters.map(f => FILTER_CHIPS.find(c => c.label === f)).filter(c => c?.field === 'location').map(c => c!.value);
      if (locFilters.length > 0) q = q.or(locFilters.map(v => `location.ilike.%${v}%`).join(','));

      const { data: jobs, error } = await q;
      if (error) throw new Error(error.message);

      const techFilters = activeFilters.map(f => FILTER_CHIPS.find(c => c.label === f)).filter(c => c?.field === 'tech').map(c => c!.value.toLowerCase());
      return (techFilters.length > 0
        ? (jobs ?? []).filter(j => techFilters.some(t => ((j.tech_stack ?? []) as string[]).some(s => s.toLowerCase().includes(t)) || (j.title ?? '').toLowerCase().includes(t)))
        : (jobs ?? [])) as JobVaultRow[];
    },
    staleTime: 1000 * 60 * 3,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['pipeline_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
      if (error) throw new Error(error.message);
      return data as { matches: number; pending: number; interviews: number };
    },
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => { if (metricsData) setMetrics(metricsData); }, [metricsData]);
  useEffect(() => { if (data && jobQueue.length === 0) setJobQueue(data as any); }, [data]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const handleSwipeRight = useCallback(async (job: JobData, editedCoverLetter?: string) => {
    popJob();
    setMetrics(prev => ({ ...prev, matches: prev.matches + 1 }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: app } = await supabase.from('job_applications')
      .insert({ job_id: job.id, user_id: user.id, status: 'pending_auto_apply' }).select('id').single();
    if (app?.id) {
      supabase.functions.invoke('auto-apply', {
        body: { job_application_id: app.id, ...(editedCoverLetter ? { cover_letter_override: editedCoverLetter } : {}) },
      }).then(({ error }) => {
        if (error) console.warn('[auto-apply]', error.message);
        else queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });
      });
    }
  }, [popJob, queryClient]);

  const handleSwipeLeft = useCallback(async (job: JobData) => {
    popJob();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('job_applications').insert({ job_id: job.id, user_id: user.id, status: 'passed' });
    await supabase.from('job_vault').update({ status: 'rejected' }).eq('id', job.id).eq('user_id', user.id);
  }, [popJob]);

  const handleCardPress = useCallback((job: JobData) => { setSelectedJob(job); setModalVisible(true); }, []);
  const handleModalApply = useCallback((job: JobData, cl: string) => handleSwipeRight(job, cl), [handleSwipeRight]);
  const handleModalPass = useCallback((job: JobData) => handleSwipeLeft(job), [handleSwipeLeft]);

  const handleRunScraper = useCallback(() => {
    triggerScrape();
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });
    }, 4000);
  }, [triggerScrape, queryClient]);

  const toggleFilter = useCallback((label: string) => {
    setActiveFilters(prev => prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]);
    setJobQueue([]);
  }, [setJobQueue]);

  const renderQueue = () => {
    if ((isLoading || isScraping) && !refreshing) return <SkeletonCard />;
    if (isError) return (
      <Animated.View entering={FadeInDown} style={styles.errorCard}>
        <Text style={styles.errorTitle}>TELEMETRY FAILURE</Text>
        <Text style={styles.errorBody}>{(error as Error)?.message}</Text>
        <Pressable onPress={() => refetch()} style={styles.errorBtn}><Text style={styles.errorBtnText}>Re-Initialize</Text></Pressable>
      </Animated.View>
    );
    if (jobQueue.length === 0) return (
      <Animated.View entering={FadeIn} style={styles.emptyState}>
        <View style={styles.emptyIcon}><Text style={{ fontSize: 30, color: C.purple }}>∅</Text></View>
        <Text style={styles.emptyTitle}>Pipeline Empty</Text>
        <Text style={styles.emptyBody}>{activeFilters.length > 0 ? 'No jobs match your filters.' : 'Trigger the scraper to populate your queue.'}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {activeFilters.length > 0 && <Pressable onPress={() => { setActiveFilters([]); setJobQueue([]); }} style={[styles.emptyBtn, { borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D` }]}><Text style={[styles.emptyBtnText, { color: C.cyan }]}>Clear Filters</Text></Pressable>}
          <Pressable onPress={onRefresh} style={[styles.emptyBtn, { borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D` }]}><Text style={[styles.emptyBtnText, { color: C.cyan }]}>Refresh</Text></Pressable>
          <Pressable onPress={handleRunScraper} disabled={isScraping} style={[styles.emptyBtn, { borderColor: `${C.purple}60`, backgroundColor: `${C.purple}18`, opacity: isScraping ? 0.6 : 1 }]}><Text style={[styles.emptyBtnText, { color: C.purple }]}>{isScraping ? 'Scraping…' : 'Run Scraper'}</Text></Pressable>
        </View>
      </Animated.View>
    );
    return [...jobQueue].slice(0, 3).map((job, index) => {
      const isTop = index === 0;
      return (
        <Animated.View key={job.id} layout={Layout.springify().damping(15)}
          style={[styles.cardSlot, { zIndex: isTop ? 20 : 10 - index }, !isTop ? { transform: [{ scale: 1 - index * 0.035 }, { translateY: index * 20 }], opacity: 1 - index * 0.18 } : {}]}>
          <SwipeableJobCard job={job as any} onSwipeRight={handleSwipeRight} onSwipeLeft={handleSwipeLeft} onPress={handleCardPress} />
        </Animated.View>
      );
    }).reverse();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AmbientBg />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} progressBackgroundColor="#050A0D" />}>
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.header}>
          <View>
            <Image source={require('../../assets/favicon.png')} style={styles.logoImg} resizeMode="contain" />
            <View style={styles.activeRow}><View style={styles.activeDot} /><Text style={styles.activeText}>Active</Text></View>
          </View>
          <ProfileDropdown initials={userInfo.initials} email={userInfo.email} role={userInfo.role} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.statsRow}>
          <StatPill label="Matches" value={metrics.matches} color={C.cyan} />
          <StatPill label="Pending" value={metrics.pending} color={C.purple} />
          <StatPill label="Applied" value={metrics.interviews} color={C.pink} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={{ marginBottom: 24 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {FILTER_CHIPS.map(chip => {
              const active = activeFilters.includes(chip.label);
              return <Pressable key={chip.label} onPress={() => toggleFilter(chip.label)}
                style={[styles.chip, active ? { borderColor: `${C.cyan}60`, backgroundColor: `${C.cyan}12` } : { borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                <Text style={[styles.chipText, { color: active ? C.cyan : 'rgba(216,228,236,0.45)' }]}>{chip.label}</Text>
              </Pressable>;
            })}
          </ScrollView>
        </Animated.View>

        {isScraping && (
          <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.scrapingBanner}>
            <View style={styles.scrapingDot} /><Text style={styles.scrapingText}>Scraping jobs from JSearch API…</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.stackContainer}>
          {renderQueue()}
        </Animated.View>

        {!isScraping && jobQueue.length > 0 && (
          <Animated.View entering={FadeIn.delay(400)} style={{ alignItems: 'center', marginTop: 16 }}>
            <Pressable onPress={handleRunScraper} style={styles.refreshScraperBtn}>
              <Zap size={12} color={C.purple} /><Text style={styles.refreshScraperText}>Fetch More Jobs</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <JobDetailModal visible={modalVisible} job={selectedJob}
        onClose={() => { setModalVisible(false); setSelectedJob(null); }}
        onConfirmApply={handleModalApply} onConfirmPass={handleModalPass} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 32 : 52, paddingHorizontal: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  logoImg: { width: 36, height: 36, borderRadius: 9 },
  activeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  activeText: { fontSize: 10, color: C.green, fontWeight: '600', letterSpacing: 2.5, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  scrapingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: `${C.purple}35`, backgroundColor: `${C.purple}0D`, marginBottom: 16 },
  scrapingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.purple },
  scrapingText: { fontSize: 12, color: C.purple, fontWeight: '600', letterSpacing: 0.5 },
  stackContainer: { flex: 1, position: 'relative', alignItems: 'center', minHeight: 520 },
  cardSlot: { position: 'absolute', top: 0, left: 0, right: 0, height: 500 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: `${C.purple}50`, backgroundColor: `${C.purple}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: C.cyan, fontSize: 20, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  emptyBody: { color: 'rgba(255,255,255,0.38)', textAlign: 'center', paddingHorizontal: 32, fontSize: 13, lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 100, borderWidth: 1 },
  emptyBtnText: { fontWeight: '700', letterSpacing: 1.2, fontSize: 10, textTransform: 'uppercase' },
  errorCard: { width: '100%', padding: 28, borderRadius: 20, borderWidth: 1, borderColor: `${C.pink}35`, backgroundColor: `${C.pink}0A`, alignItems: 'center' },
  errorTitle: { color: C.pink, fontSize: 17, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  errorBody: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 13, marginBottom: 20 },
  errorBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: C.pink, backgroundColor: `${C.pink}15` },
  errorBtnText: { color: C.pink, fontWeight: '700', letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },
  refreshScraperBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: `${C.purple}40`, backgroundColor: `${C.purple}0D` },
  refreshScraperText: { color: C.purple, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  // dropdown
  avatarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 40, borderRadius: 20, backgroundColor: `${C.purple}20`, borderWidth: 1, borderColor: `${C.purple}40` },
  avatarText: { color: C.purple, fontWeight: '800', fontSize: 13 },
  dropdown: { position: 'absolute', right: 0, top: 48, width: 230, backgroundColor: '#0A1520', borderWidth: 1, borderColor: 'rgba(120,200,240,0.14)', borderRadius: 16, overflow: 'hidden', zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 16 },
  ddHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  ddAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.purple}25`, borderWidth: 1, borderColor: `${C.purple}40`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ddAvatarText: { color: C.purple, fontWeight: '800', fontSize: 12 },
  ddName: { fontSize: 13, fontWeight: '700', color: '#D8E4EC' },
  ddEmail: { fontSize: 10, color: 'rgba(216,228,236,0.4)', marginTop: 1 },
  ddDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  ddItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  ddIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ddItemText: { fontSize: 13, fontWeight: '600', color: '#D8E4EC' },
});