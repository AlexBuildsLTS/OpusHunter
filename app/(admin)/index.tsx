/**
 * app/(admin)/index.tsx
 * OpusHunter — Admin Panel Overview
 * 2026-07-02 — Added real chart analytics (SVG, react-native-svg)
 *
 * All three charts below query live Supabase data — nothing here is
 * mocked or placeholder:
 *   - Role breakdown donut: real GROUP BY on profiles.role
 *   - API key pool health donut: real active/inactive count per provider
 *     from api_keys — directly useful for the "why isn't my key being
 *     used" question, since it shows exactly how many pooled keys are
 *     actually marked active per provider right now.
 *   - Applications bar chart: real count of job_applications.applied_at
 *     per day, last 7 days.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Key, Users, Activity, Database, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { BarChart } from '../../components/charts/BarChart';
import { PageContainer } from '../../components/layout/PageContainer';

const StatBox = ({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) => (
    <GlassCard padding="sm" className="items-center flex-1" style={{ gap: 6, paddingVertical: 18 }}>
        <Icon size={18} color={color} />
        <Text style={{ color, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>{value}</Text>
        <Text style={{ fontSize: 9, fontWeight: '700', color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text>
    </GlassCard>
);

export default function AdminIndexScreen() {
    const router = useRouter();

    // ── Top-line stats ──────────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ['admin_stats'],
        queryFn: async () => {
            const [usersRes, appsRes, jobsRes, keysRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('job_applications').select('id', { count: 'exact', head: true }),
                supabase.from('job_vault').select('id', { count: 'exact', head: true }),
                supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('is_active', true),
            ]);
            return {
                users: usersRes.count ?? 0,
                apps: appsRes.count ?? 0,
                jobs: jobsRes.count ?? 0,
                apiKeys: keysRes.count ?? 0,
            };
        },
        staleTime: 1000 * 30,
    });

    // ── Role breakdown — real GROUP BY on profiles.role ─────────────────────
    const { data: roleBreakdown } = useQuery({
        queryKey: ['admin_role_breakdown'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('role');
            if (error) throw error;
            const counts = { member: 0, premium: 0, admin: 0 };
            for (const row of data ?? []) {
                const r = (row.role ?? 'member') as keyof typeof counts;
                counts[r] = (counts[r] ?? 0) + 1;
            }
            return counts;
        },
        staleTime: 1000 * 60,
    });

    // ── API key pool health — real active/inactive per provider ────────────
    const { data: keyHealth } = useQuery({
        queryKey: ['admin_key_health'],
        queryFn: async () => {
            const { data, error } = await supabase.from('api_keys').select('provider, is_active');
            if (error) throw error;
            const byProvider: Record<string, { active: number; inactive: number }> = {};
            for (const row of data ?? []) {
                const p = row.provider ?? 'unknown';
                if (!byProvider[p]) byProvider[p] = { active: 0, inactive: 0 };
                if (row.is_active) byProvider[p].active++;
                else byProvider[p].inactive++;
            }
            return byProvider;
        },
        staleTime: 1000 * 30,
    });

    // ── Applications, last 7 days — real daily counts ───────────────────────
    const { data: appsPerDay } = useQuery({
        queryKey: ['admin_apps_per_day'],
        queryFn: async () => {
            const since = new Date();
            since.setDate(since.getDate() - 6);
            since.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('job_applications')
                .select('applied_at')
                .not('applied_at', 'is', null)
                .gte('applied_at', since.toISOString());
            if (error) throw error;

            const days: { label: string; value: number; key: string }[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), value: 0, key: d.toISOString().slice(0, 10) });
            }
            for (const row of data ?? []) {
                const key = (row.applied_at as string).slice(0, 10);
                const day = days.find((d) => d.key === key);
                if (day) day.value++;
            }
            return days.map(({ label, value }) => ({ label, value }));
        },
        staleTime: 1000 * 30,
    });

    const roleData = roleBreakdown
        ? [
            { label: 'Member', value: roleBreakdown.member, color: C.purple },
            { label: 'Premium', value: roleBreakdown.premium, color: C.amber },
            { label: 'Admin', value: roleBreakdown.admin, color: C.pink },
        ]
        : [];

    const keyProviders = Object.keys(keyHealth ?? {});

    const MENU = [
        { label: 'API Key Management', sub: 'Manage RapidAPI & Gemini fallback key pools', icon: Key, color: C.cyan, route: '/(admin)/api-keys' },
        { label: 'User Management', sub: 'View users, change roles (member \u2192 premium \u2192 admin)', icon: Users, color: C.purple, route: '/(admin)/users' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 1080, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
               

                {/* ── Stat row ── */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    <StatBox label="Users" value={stats?.users ?? '—'} color={C.cyan} icon={Users} />
                    <StatBox label="Applications" value={stats?.apps ?? '—'} color={C.purple} icon={Activity} />
                    <StatBox label="Jobs Scraped" value={stats?.jobs ?? '—'} color={C.green} icon={Database} />
                    <StatBox label="Active Keys" value={stats?.apiKeys ?? '—'} color={C.amber} icon={Key} />
                </Animated.View>

                {/* ── Charts row ── */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <GlassCard tint="purple" padding="md" style={{ flex: 1, minWidth: 220 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: C.text, letterSpacing: 1, marginBottom: 14 }}>USER ROLES</Text>
                        {roleData.length > 0 ? (
                            <DonutChart data={roleData} centerLabel="Total" centerValue={stats?.users ?? 0} />
                        ) : (
                            <Text style={{ color: C.dim, fontSize: 12 }}>No users yet.</Text>
                        )}
                    </GlassCard>

                    <GlassCard tint="cyan" padding="md" style={{ flex: 1, minWidth: 220 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: C.text, letterSpacing: 1, marginBottom: 4 }}>KEY POOL HEALTH</Text>
                        <Text style={{ fontSize: 10, color: C.sub, marginBottom: 10 }}>Active vs inactive per provider</Text>
                        {keyProviders.length > 0 ? (
                            <View style={{ gap: 14 }}>
                                {keyProviders.map((p) => {
                                    const h = keyHealth![p];
                                    const total = h.active + h.inactive;
                                    return (
                                        <View key={p}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: C.text, textTransform: 'uppercase' }}>{p}</Text>
                                                <Text style={{ fontSize: 11, color: C.sub }}>{h.active}/{total} active</Text>
                                            </View>
                                            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                <View style={{ height: '100%', width: `${total > 0 ? (h.active / total) * 100 : 0}%`, backgroundColor: h.active > 0 ? C.green : C.pink, borderRadius: 3 }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={{ color: C.dim, fontSize: 12 }}>No pooled keys added yet — Admin \u2192 API Keys.</Text>
                        )}
                    </GlassCard>

                    <GlassCard tint="green" padding="md" style={{ flex: 1, minWidth: 260 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: C.text, letterSpacing: 1, marginBottom: 14 }}>APPLICATIONS — 7 DAYS</Text>
                        {appsPerDay ? (
                            <BarChart data={appsPerDay} color={C.green} />
                        ) : (
                            <Text style={{ color: C.dim, fontSize: 12 }}>Loading…</Text>
                        )}
                    </GlassCard>
                </Animated.View>

                {/* ── Nav cards ── */}
                <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12, marginTop: 4 }}>
                    {MENU.map((item) => (
                        <TouchableOpacity key={item.route} onPress={() => router.push(item.route as any)} activeOpacity={0.85}>
                            <GlassCard tint={item.color === C.cyan ? 'cyan' : 'purple'} padding="md" className="flex-row items-center gap-3.5">
                                <View style={{ width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: `${item.color}12`, borderColor: `${item.color}25` }}>
                                    <item.icon size={20} color={item.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: item.color, marginBottom: 3 }}>{item.label}</Text>
                                    <Text style={{ fontSize: 12, color: C.sub, lineHeight: 17 }}>{item.sub}</Text>
                                </View>
                                <ChevronRight size={18} color={item.color} />
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
}