/**
 * app/(admin)/index.tsx
 * OpusHunter — Admin Panel Overview
 *
 * Shows: system stats, quick links to API Key management and user management.
 * Only reachable if profiles.role = 'admin'.
 */
import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Platform, StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Key, Users, ArrowLeft, Activity, Database } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

function AmbientBg() {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 80% 10%, rgba(232,67,106,0.06) 0%, transparent 65%)' }} />
        </View>
    );
}

const StatBox = ({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) => (
    <View style={[s.statBox, { borderColor: `${color}20`, backgroundColor: `${color}08` }]}>
        <Icon size={18} color={color} />
        <Text style={[s.statVal, { color }]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
    </View>
);

export default function AdminIndexScreen() {
    const router = useRouter();

    // System stats
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

    const MENU = [
        {
            label: 'API Key Management',
            sub: 'Manage RapidAPI & Gemini fallback key pools',
            icon: Key,
            color: C.cyan,
            route: '/(admin)/api-keys',
        },
        {
            label: 'User Management',
            sub: 'View users, change roles (member → premium → admin)',
            icon: Users,
            color: C.purple,
            route: '/(admin)/users',
        },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <AmbientBg />
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Back */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={s.topRow}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={16} color={C.cyan} />
                        <Text style={s.backText}>Dashboard</Text>
                    </TouchableOpacity>
                    <View style={s.adminBadge}>
                        <Text style={s.adminBadgeText}>ADMIN</Text>
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={{ marginBottom: 28 }}>
                    <Text style={s.title}>Admin Panel</Text>
                    <Text style={s.sub}>System overview and configuration</Text>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInDown.delay(140).springify()} style={s.statsGrid}>
                    <StatBox label="Users" value={stats?.users ?? '—'} color={C.cyan} icon={Users} />
                    <StatBox label="Applications" value={stats?.apps ?? '—'} color={C.purple} icon={Activity} />
                    <StatBox label="Jobs Scraped" value={stats?.jobs ?? '—'} color={C.green} icon={Database} />
                    <StatBox label="Active Keys" value={stats?.apiKeys ?? '—'} color={C.amber} icon={Key} />
                </Animated.View>

                {/* Navigation cards */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 12, marginTop: 8 }}>
                    {MENU.map((item) => (
                        <TouchableOpacity
                            key={item.route}
                            onPress={() => router.push(item.route as any)}
                            style={[s.menuCard, { borderColor: `${item.color}20` }]}
                            activeOpacity={0.8}
                        >
                            <View style={[s.menuIcon, { backgroundColor: `${item.color}12`, borderColor: `${item.color}25` }]}>
                                <item.icon size={20} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.menuLabel, { color: item.color }]}>{item.label}</Text>
                                <Text style={s.menuSub}>{item.sub}</Text>
                            </View>
                            <Text style={[s.menuArrow, { color: item.color }]}>→</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 680, width: '100%', alignSelf: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { fontSize: 13, color: C.cyan, fontWeight: '600' },
    adminBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: `${C.pink}40`, backgroundColor: `${C.pink}10` },
    adminBadgeText: { fontSize: 9, fontWeight: '900', color: C.pink, letterSpacing: 2 },
    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    sub: { fontSize: 13, color: C.sub, marginTop: 4 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statBox: { width: '47%', alignItems: 'center', gap: 6, paddingVertical: 18, borderRadius: 16, borderWidth: 1 },
    statVal: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 9, fontWeight: '700', color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase' },
    menuCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18, borderWidth: 1, backgroundColor: C.card },
    menuIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
    menuLabel: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    menuSub: { fontSize: 12, color: C.sub, lineHeight: 17 },
    menuArrow: { fontSize: 18, fontWeight: '700', flexShrink: 0 },
});