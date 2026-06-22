import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, Platform, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { usePipelineStore } from '../../store/usePipelineStore';
import { SwipeableJobCard } from '../../components/pipeline/SwipeableJobCard';
import { GlassCard } from '../../components/ui/GlassCard';

const C = { green: '#00C67D', cyan: '#00D4FF', purple: '#7B5EA7', pink: '#E8436A', bg: '#0A1419', card: '#0B1822', border: 'rgba(120,200,240,0.09)' };

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 90% 95%, rgba(0,180,210,0.07) 0%, transparent 70%)' }} />
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 35% at 5% 5%, rgba(90,40,160,0.05) 0%, transparent 65%)' }} />
    </View>
  );
}

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: `${color}25`, backgroundColor: `${color}0D` }}>
    <Text style={{ fontSize: 22, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ fontSize: 9, fontWeight: '700', color: `${color}90`, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
  </View>
);

const SkeletonCard = () => (
  <Animated.View entering={FadeIn} exiting={FadeOutUp} style={{ width: '100%', height: 500, position: 'absolute', zIndex: 20 }}>
    <GlassCard style={{ flex: 1, padding: 24, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ width: '60%', height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,212,255,0.06)' }} />
      </View>
      {[1, 0.8, 0.6, 0.5, 0.4].map((w, i) => (
        <View key={i} style={{ width: `${w * 100}%`, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      ))}
    </GlassCard>
  </Animated.View>
);

export default function DashboardScreen() {
  const { jobQueue, setJobQueue, popJob } = usePipelineStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({ matches: 0, pending: 0, interviews: 0 });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pipeline_jobs'],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('job_vault')
        .select(`
          id,
          title,
          company,
          description,
          salary,
          location,
          match_score,
          tech_stack
        `)
        .eq('status', 'active')
        .order('match_score', { ascending: false })
        .limit(15);

      if (error) {
        throw new Error(error.message);
      }

      return (jobs || []).map((j) => ({
        ...j,
        status: 'active' as const,
        source_url: '',
        created_at: '',
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['pipeline_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (metricsData) {
      setMetrics({
        matches: metricsData.matches || 0,
        pending: metricsData.pending || 0,
        interviews: metricsData.interviews || 0,
      });
    }
  }, [metricsData]);

  useEffect(() => {
    if (data && jobQueue.length === 0) {
      setJobQueue(data);
    }
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    if (data) setJobQueue(data);
    setRefreshing(false);
  }, [refetch, data, setJobQueue]);

  const handleSwipeRight = async (job: any) => {
    popJob();
    setMetrics(prev => ({ ...prev, matches: prev.matches + 1 }));
    await supabase.from('job_applications').insert({
      job_id: job.id,
      status: 'pending_auto_apply',
    });
  };

  const handleSwipeLeft = async (job: any) => {
    popJob();
    await supabase.from('job_applications').insert({
      job_id: job.id,
      status: 'passed',
    });
  };

  const triggerScrapeEngine = async () => {
    await supabase.functions.invoke('scrape-jobs');
    onRefresh();
  };

  const renderQueue = () => {
    if (isLoading && !refreshing) {
      return <SkeletonCard />;
    }

    if (isError) {
      return (
        <Animated.View entering={FadeInDown} style={{ width: '100%', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: `${C.pink}35`, backgroundColor: `${C.pink}0A`, alignItems: 'center' }}>
          <Text style={{ color: C.pink, fontSize: 18, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>TELEMETRY FAILURE</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 13, marginBottom: 20 }}>{error?.message}</Text>
          <Pressable onPress={() => refetch()} style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: C.pink, backgroundColor: `${C.pink}15` }}>
            <Text style={{ color: C.pink, fontWeight: '700', letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' }}>Re-Initialize</Text>
          </Pressable>
        </Animated.View>
      );
    }

    if (jobQueue.length === 0) {
      return (
        <Animated.View entering={FadeIn} style={{ width: '100%', alignItems: 'center', paddingVertical: 60 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: `${C.purple}50`, backgroundColor: `${C.purple}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 32, color: C.purple }}>∅</Text>
          </View>
          <Text style={{ color: C.cyan, fontSize: 20, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>Pipeline Empty</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 32, fontSize: 13, lineHeight: 20, marginBottom: 28 }}>
            No active jobs. Trigger the edge scraping engine to populate the queue.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={onRefresh} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D` }}>
              <Text style={{ color: C.cyan, fontWeight: '700', letterSpacing: 1.5, fontSize: 10, textTransform: 'uppercase' }}>Refresh</Text>
            </Pressable>
            <Pressable onPress={triggerScrapeEngine} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: `${C.purple}60`, backgroundColor: `${C.purple}18` }}>
              <Text style={{ color: C.purple, fontWeight: '700', letterSpacing: 1.5, fontSize: 10, textTransform: 'uppercase' }}>Run Scraper</Text>
            </Pressable>
          </View>
        </Animated.View>
      );
    }

    return jobQueue.map((job, index) => {
      if (index > 2) return null;
      const isTopCard = index === 0;
      return (
        <Animated.View
          key={job.id}
          layout={Layout.springify().damping(15)}
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, height: 500, zIndex: isTopCard ? 20 : 10 },
            !isTopCard ? { transform: [{ scale: 1 - index * 0.04 }, { translateY: index * 24 }], opacity: 1 - index * 0.2 } : {},
          ]}
        >
          <SwipeableJobCard
            job={job}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
          />
        </Animated.View>
      );
    }).reverse();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AmbientBg />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'web' ? 36 : 56, paddingHorizontal: 22, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} colors={[C.cyan]} progressBackgroundColor="#050A0D" />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <View>
            <Image
              source={require('../../assets/favicon.png')}
              style={{ width: 38, height: 38, borderRadius: 10 }}
              resizeMode="contain"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
              <Text style={{ fontSize: 10, color: 'rgba(0, 198, 125, 1.00)', fontWeight: '600', letterSpacing: 2.5, textTransform: 'uppercase' }}>Active</Text>
            </View>
          </View>
          {Platform.OS === 'web' && (
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: `${C.purple}20`, borderWidth: 1, borderColor: `${C.purple}40`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.purple, fontWeight: '800', fontSize: 12 }}>JD</Text>
            </View>
          )}
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <StatPill label="Matches" value={metrics.matches} color={C.cyan} />
          <StatPill label="Pending" value={metrics.pending} color={C.purple} />
          <StatPill label="Interviews" value={metrics.interviews} color={C.pink} />
        </Animated.View>

        {/* Filter chips */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: 28 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['Remote Only', 'Hybrid', 'Onsite', 'React Native', 'Senior', 'Deno'].map((tag) => (
              <View key={tag} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <Text style={{ fontSize: 12, color: 'rgba(216,228,236,0.55)', fontWeight: '500' }}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Card stack */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ flex: 1, position: 'relative', alignItems: 'center', minHeight: 540 }}>
          {renderQueue()}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

