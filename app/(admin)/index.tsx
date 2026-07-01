/**
 * app/(admin)/index.tsx
 * OpusHunter — Admin Panel Overview
 *
 * Shows: system stats, quick links to API Key management and user management.
 * Only reachable if profiles.role = 'admin'.
 */
import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Platform, StyleSheet, useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Key, Users, Activity, Database } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { AppHeader } from '../../components/layout/AppHeader';


function AmbientBg() {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(232, 67, 106, 0.08) 0%, transparent 60%), radial-gradient(ellipse 80% 40% at 0% 100%, rgba(123, 94, 167, 0.04) 0%, transparent 70%)' }} />
        </View>
    );
}

// Animated floating orb for sleek effect
function FloatingOrb() {
    if (Platform.OS === 'web') return null;
    const opacity = useSharedValue(0.3);
    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);
    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));
    return (
        <Animated.View
            style={[StyleSheet.absoluteFill, animStyle, { pointerEvents: 'none' }]}
        >
            <View
                style={{
                    position: 'absolute',
                    width: 350,
                    height: 350,
                    borderRadius: 175,
                    backgroundColor: C.pink,
                    top: -150,
                    left: -100,
                    opacity: 0.03,
                }}
            />
        </Animated.View>
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
        <View style={{ flex: 1, backgroundColor: C.bg, backgroundImage: Platform.OS === 'web' ? 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(232, 67, 106, 0.05) 0%, transparent 60%)' : undefined }}>
            <AmbientBg />
            <FloatingOrb />
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600).springify().damping(20)}>

                </Animated.View>

                {/* Spacer for visual balance */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={{ marginBottom: 12 }} />

                {/* Stats */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={s.statsGrid}>
                    <StatBox label="Users" value={stats?.users ?? '—'} color={C.cyan} icon={Users} />
                    <StatBox label="Applications" value={stats?.apps ?? '—'} color={C.purple} icon={Activity} />
                    <StatBox label="Jobs Scraped" value={stats?.jobs ?? '—'} color={C.green} icon={Database} />
                    <StatBox label="Active Keys" value={stats?.apiKeys ?? '—'} color={C.amber} icon={Key} />
                </Animated.View>

                {/* Navigation cards */}
                <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12, marginTop: 8 }}>
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