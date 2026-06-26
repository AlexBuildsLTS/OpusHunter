/**
 * app/(tabs)/profile.tsx
 * OpusHunter — User Profile Screen
 *
 * Shows: name, email, role badge, CV status, application stats, logout
 * Edit full_name inline. Links to vault for CV management.
 * Web + Mobile adaptive.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    User, Mail, Shield, LogOut, Edit3, CheckCircle2,
    AlertCircle, FileText, Briefcase, TrendingUp, ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
    cyan: '#00D4FF',
    purple: '#7B5EA7',
    pink: '#E8436A',
    green: '#00C67D',
    amber: '#F59E0B',
    bg: '#0A1419',
    card: '#0B1822',
    border: 'rgba(120,200,240,0.09)',
    text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
};

// ── Types from DB ─────────────────────────────────────────────────────────────

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const config: Record<string, { color: string; label: string }> = {
        admin: { color: C.pink, label: 'ADMIN' },
        premium: { color: C.amber, label: 'PREMIUM' },
        member: { color: C.purple, label: 'MEMBER' },
    };
    const { color, label } = config[role] ?? config.member;
    return (
        <View style={[styles.roleBadge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
            <Shield size={10} color={color} />
            <Text style={[styles.roleText, { color }]}>{label}</Text>
        </View>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: {
    label: string; value: number | string; color: string; icon: React.ElementType;
}) {
    return (
        <View style={[styles.statCard, { borderColor: `${color}20`, backgroundColor: `${color}08` }]}>
            <Icon size={18} color={color} />
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ── Ambient background (web only) ────────────────────────────────────────────

function AmbientBg() {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 80% 20%, rgba(123,94,167,0.07) 0%, transparent 65%)' }} />
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (banner) {
            const t = setTimeout(() => setBanner(null), 3500);
            return () => clearTimeout(t);
        }
    }, [banner]);

    // ── Load profile ──────────────────────────────────────────────────────────
    const { data: profile, isLoading } = useQuery<ProfileRow>({
        queryKey: ['profile_full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw new Error(error.message);
            return data as ProfileRow;
        },
    });

    // ── Load application stats ────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ['profile_stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
            if (error) throw new Error(error.message);
            return data as { matches: number; pending: number; interviews: number };
        },
    });

    // ── Update full_name ──────────────────────────────────────────────────────
    const updateNameMutation = useMutation({
        mutationFn: async (newName: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: newName.trim() })
                .eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile_full'] });
            setIsEditingName(false);
            setBanner({ ok: true, text: 'Name updated.' });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    const startEditName = useCallback(() => {
        setNameInput(profile?.full_name ?? '');
        setIsEditingName(true);
    }, [profile]);

    const saveName = useCallback(() => {
        if (!nameInput.trim() || nameInput.trim() === profile?.full_name) {
            setIsEditingName(false);
            return;
        }
        updateNameMutation.mutate(nameInput.trim());
    }, [nameInput, profile, updateNameMutation]);

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        router.replace('/(auth)/login');
    }, [router, queryClient]);

    // ── Avatar initials ───────────────────────────────────────────────────────
    const getInitials = () => {
        const name = profile?.full_name ?? profile?.email ?? '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.cyan} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <AmbientBg />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Banner ── */}
                {banner && (
                    <Animated.View
                        entering={FadeInDown.springify()}
                        style={[styles.banner, {
                            borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`,
                            backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08`,
                        }]}
                    >
                        {banner.ok
                            ? <CheckCircle2 size={14} color={C.cyan} />
                            : <AlertCircle size={14} color={C.pink} />}
                        <Text style={[styles.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>
                            {banner.text}
                        </Text>
                    </Animated.View>
                )}

                {/* ── Avatar + name ── */}
                <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.avatarSection}>
                    <View style={styles.avatarRing}>
                        <Text style={styles.avatarInitials}>{getInitials()}</Text>
                    </View>

                    {/* Name row */}
                    {isEditingName ? (
                        <View style={styles.nameEditRow}>
                            <TextInput
                                style={styles.nameInput}
                                value={nameInput}
                                onChangeText={setNameInput}
                                autoFocus
                                onSubmitEditing={saveName}
                                returnKeyType="done"
                                placeholderTextColor={C.sub}
                                {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                            />
                            <TouchableOpacity onPress={saveName} style={styles.saveNameBtn} disabled={updateNameMutation.isPending}>
                                {updateNameMutation.isPending
                                    ? <ActivityIndicator size="small" color="#000" />
                                    : <Text style={styles.saveNameText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={startEditName} style={styles.nameRow} activeOpacity={0.7}>
                            <Text style={styles.nameText}>{profile?.full_name ?? 'No name set'}</Text>
                            <Edit3 size={14} color={C.sub} />
                        </TouchableOpacity>
                    )}

                    <Text style={styles.emailText}>{profile?.email}</Text>
                    <RoleBadge role={profile?.role ?? 'member'} />
                </Animated.View>

                {/* ── Stats row ── */}
                <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.statsRow}>
                    <StatCard label="Total" value={stats?.matches ?? 0} color={C.cyan} icon={TrendingUp} />
                    <StatCard label="Pending" value={stats?.pending ?? 0} color={C.purple} icon={Briefcase} />
                    <StatCard label="Applied" value={stats?.interviews ?? 0} color={C.green} icon={CheckCircle2} />
                </Animated.View>

                {/* ── CV Status ── */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>CV Vault</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/vault')}
                        style={styles.menuRow}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: `${C.cyan}10`, borderColor: `${C.cyan}25` }]}>
                            <FileText size={16} color={C.cyan} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.menuLabel}>
                                {profile?.cv_storage_path ? 'CV Uploaded' : 'No CV uploaded'}
                            </Text>
                            <Text style={styles.menuSub}>
                                {profile?.cv_storage_path
                                    ? profile.cv_storage_path.split('/').pop()
                                    : 'Tap to upload your CV'}
                            </Text>
                        </View>
                        {profile?.cv_storage_path
                            ? <CheckCircle2 size={16} color={C.green} />
                            : <ChevronRight size={16} color={C.sub} />}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Account actions ── */}
                <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/configure')}
                        style={styles.menuRow}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: `${C.purple}10`, borderColor: `${C.purple}25` }]}>
                            <Briefcase size={16} color={C.purple} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.menuLabel}>Search Rules</Text>
                            <Text style={styles.menuSub}>Manage keywords, locations, work types</Text>
                        </View>
                        <ChevronRight size={16} color={C.sub} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={styles.menuRow}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: `${C.pink}10`, borderColor: `${C.pink}25` }]}>
                            <LogOut size={16} color={C.pink} />
                        </View>
                        <Text style={[styles.menuLabel, { color: C.pink }]}>Sign Out</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Version ── */}
                <Animated.View entering={FadeIn.delay(400)} style={styles.versionRow}>
                    <Text style={styles.versionText}>OpusHunter v1.0.0</Text>
                    <Text style={styles.versionText}>Built 2026-06-26</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'web' ? 40 : 56,
        paddingHorizontal: 20,
        paddingBottom: 120,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // ── Avatar section ──
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarRing: {
        width: 88, height: 88, borderRadius: 44,
        borderWidth: 2, borderColor: `${C.purple}50`,
        backgroundColor: `${C.purple}18`,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    avatarInitials: { fontSize: 28, fontWeight: '900', color: C.purple },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    nameText: { fontSize: 20, fontWeight: '800', color: C.text },
    nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    nameInput: {
        fontSize: 18, fontWeight: '700', color: C.text,
        borderBottomWidth: 1, borderBottomColor: C.cyan,
        paddingBottom: 4, minWidth: 160,
    },
    saveNameBtn: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
        backgroundColor: C.cyan,
    },
    saveNameText: { color: '#000', fontWeight: '800', fontSize: 12 },
    emailText: { fontSize: 13, color: C.sub, marginBottom: 10 },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
    },
    roleText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

    // ── Stats ──
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
    statCard: {
        flex: 1, alignItems: 'center', gap: 6,
        paddingVertical: 16, borderRadius: 16, borderWidth: 1,
    },
    statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 9, fontWeight: '700', color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase' },

    // ── Sections ──
    section: {
        marginBottom: 20,
        borderRadius: 18, borderWidth: 1,
        borderColor: C.border, backgroundColor: 'rgba(11,24,34,0.8)',
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 9, fontWeight: '900', color: C.cyan,
        letterSpacing: 2.5, textTransform: 'uppercase',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    menuIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    menuLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    menuSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: 'rgba(120,200,240,0.06)', marginHorizontal: 16 },

    // ── Version ──
    versionRow: {
        alignItems: 'center', gap: 3, marginTop: 12,
        paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    },
    versionText: { fontSize: 10, color: 'rgba(255,255,255,0.2)' },
});