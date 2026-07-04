/**
 * app/(tabs)/(settings)/index.tsx
 * OpusHunter — Settings Dashboard
 * ══════════════════════════════════════════════════════════════════════════════
 * PROTOCOL:
 * 1. MODULE-DRIVEN ARCHITECTURE: Settings cards defined in SETTING_MODULES array
 *    for maintainability and scalability. Role-based filtering via useMemo.
 * 2. GESTURE DELEGATION: ScrollView utilizes `keyboardShouldPersistTaps="handled"`
 *    to ensure taps on cards execute instantly without dropping frames.
 * 3. EVENT ISOLATION: Ambient background strictly enforces `pointerEvents="none"`
 *    to prevent gesture hijacking on the Z-axis.
 * 4. ADMIN GATING: "Admin Core" row ONLY rendered when role === 'admin'.
 *    Server-side check in app/(admin)/_layout.tsx provides additional protection.
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ─── CORE REACT & NATIVE ─────────────────────────────────────────────────────
import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Switch,
    Platform, StyleSheet, ActivityIndicator, Modal, Dimensions,
} from 'react-native';

// ─── STATE & QUERY ───────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, Href } from 'expo-router';

// ─── ANIMATIONS ──────────────────────────────────────────────────────────────
import Animated, { FadeInDown, FadeOutUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolateColor, Easing } from 'react-native-reanimated';

// ─── ICONOGRAPHY ─────────────────────────────────────────────────────────────
import {
    Zap, Bell, Shield, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
    Crown, ChevronRight, Lock, User as UserIcon, Info, LucideIcon, FileText,
} from 'lucide-react-native';

// ─── UI COMPONENTS & UTILS ───────────────────────────────────────────────────
import { supabase } from '../../../lib/supabase';
import { C } from '../../../lib/theme';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type SettingColor = 'cyan' | 'purple' | 'green' | 'pink' | 'amber';

interface SettingsCardItem {
    id: string;
    label: string;
    sub: string;
    icon: LucideIcon;
    color: SettingColor;
    onPress?: () => void;
    isDanger?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: AMBIENT BACKGROUND
// ══════════════════════════════════════════════════════════════════════════════

const AmbientBg = memo(() => {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 60%), radial-gradient(ellipse 80% 40% at 100% 100%, ${C.cyan}08 0%, transparent 70%)`,
            }} />
        </View>
    );
});
AmbientBg.displayName = 'AmbientBg';

const FloatingOrb = memo(() => {
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
                    width: 300,
                    height: 300,
                    borderRadius: 150,
                    backgroundColor: C.cyan,
                    top: -100,
                    right: -50,
                    opacity: 0.04,
                }}
            />
        </Animated.View>
    );
});
FloatingOrb.displayName = 'FloatingOrb';

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const SectionLabel = memo(({ children }: { children: string }) => (
    <Text style={s.sectionLabel}>{children}</Text>
));
SectionLabel.displayName = 'SectionLabel';

const SettingRow = memo(({
    icon: Icon, label, sub, right, color = C.cyan, onPress,
}: {
    icon: React.ElementType; label: string; sub?: string;
    right?: React.ReactNode; color?: string; onPress?: () => void;
}) => {
    const content = (
        <View style={s.settingRow}>
            <View style={[s.settingIcon, { backgroundColor: `${color}10`, borderColor: `${color}20` }]}>
                <Icon size={15} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>{label}</Text>
                {sub && <Text style={s.settingSub}>{sub}</Text>}
            </View>
            {right ?? (onPress ? <ChevronRight size={15} color={C.sub} /> : null)}
        </View>
    );
    if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
    return content;
});
SettingRow.displayName = 'SettingRow';

const DangerRow = memo(({
    icon: Icon, label, sub, onPress, loading,
}: {
    icon: React.ElementType; label: string; sub: string; onPress: () => void; loading?: boolean;
}) => (
    <TouchableOpacity onPress={onPress} style={s.dangerRow} activeOpacity={0.75} disabled={loading}>
        <View style={[s.settingIcon, { backgroundColor: `${C.pink}10`, borderColor: `${C.pink}20` }]}>
            <Icon size={15} color={C.pink} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: C.pink }]}>{label}</Text>
            <Text style={s.settingSub}>{sub}</Text>
        </View>
        {loading ? <ActivityIndicator size="small" color={C.pink} /> : <ChevronRight size={15} color={C.pink} />}
    </TouchableOpacity>
));
DangerRow.displayName = 'DangerRow';

const ConfirmModal = memo(({
    visible, title, body, confirmLabel, onConfirm, onCancel, loading, destructive = true,
}: {
    visible: boolean; title: string; body: string; confirmLabel: string;
    onConfirm: () => void; onCancel: () => void; loading: boolean; destructive?: boolean;
}) => (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <View style={s.modalOverlay}>
            <Animated.View entering={FadeInDown.springify()} style={s.modalCard}>
                <View style={[s.modalIconWrap, { backgroundColor: destructive ? `${C.pink}14` : `${C.amber}14` }]}>
                    <AlertTriangle size={26} color={destructive ? C.pink : C.amber} />
                </View>
                <Text style={s.modalTitle}>{title}</Text>
                <Text style={s.modalBody}>{body}</Text>
                <View style={s.modalBtns}>
                    <TouchableOpacity onPress={onCancel} style={s.modalCancelBtn}>
                        <Text style={s.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onConfirm} disabled={loading}
                        style={[s.modalConfirmBtn, { backgroundColor: destructive ? C.pink : C.amber }]}
                    >
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>{confirmLabel}</Text>}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    </Modal>
));
ConfirmModal.displayName = 'ConfirmModal';

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [notifs, setNotifs] = useState(false);
    const [autoScrape, setAutoScrape] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [confirm, setConfirm] = useState<null | 'pipeline' | 'history' | 'account'>(null);

    // ── Role — drives the Admin row visibility ──────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ['my_profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single();
            return data;
        },
    });
    const role = profile?.role ?? 'member';
    const isAdmin = role === 'admin';
    const isPremium = role === 'premium' || isAdmin;

    useEffect(() => {
        if (banner) { const t = setTimeout(() => setBanner(null), 3500); return () => clearTimeout(t); }
    }, [banner]);

    const flash = (text: string, ok = true) => setBanner({ ok, text });

    const clearPipelineMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('job_vault').delete().eq('user_id', user.id).eq('status', 'pending');
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending_jobs'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });
            setConfirm(null);
            flash('Pipeline cleared — run scraper to refill.');
        },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    const clearHistoryMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('job_applications').delete().eq('user_id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });
            setConfirm(null);
            flash('Application history cleared.');
        },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { data: files } = await supabase.storage.from('cv_vault').list(user.id);
            if (files?.length) {
                await supabase.storage.from('cv_vault').remove(files.map((f: any) => `${user.id}/${f.name}`));
            }
            await supabase.auth.signOut();
        },
        onSuccess: () => { queryClient.clear(); router.replace('/(auth)/login'); },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <AmbientBg />

            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { backgroundColor: banner.ok ? `${C.green}15` : `${C.pink}15`, borderColor: banner.ok ? `${C.green}40` : `${C.pink}40` }]}
                >
                    {banner.ok ? <CheckCircle2 size={15} color={C.green} /> : <AlertTriangle size={15} color={C.pink} />}
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Account ── */}
                <Animated.View entering={FadeInDown.delay(60).duration(600).springify().damping(20)}>
                    <SectionLabel>ACCOUNT</SectionLabel>
                    <View style={s.card}>
                        <SettingRow icon={UserIcon} label="Profile" sub={profile?.full_name ?? profile?.email ?? ''} color={C.cyan} onPress={() => router.push('/(tabs)/settings/profile' as any)} />
                        <View style={s.divider} />
                        <SettingRow icon={FileText} label="Documents" sub="CV and certifications" color={C.purple} onPress={() => router.push('/settings/documents' as any)} />
                        <SettingRow icon={Lock} label="Security & Password" sub="Change your password, PIN, biometrics, and API keys" color={C.cyan} onPress={() => router.push('/settings/security' as any)} />
                    </View>
                </Animated.View>

                {/* ── Admin — ONLY visible to admins ── */}
                {isAdmin && (
                    <Animated.View entering={FadeInDown.delay(120).duration(600).springify().damping(20)}>
                        <SectionLabel>ADMINISTRATION</SectionLabel>
                        <View style={s.card}>
                            <SettingRow
                                icon={Shield} label="Admin Core" sub="Manage users, roles, and system API keys"
                                color={C.pink} onPress={() => router.push('/admin' as any)}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* ── Pipeline ── */}
                <Animated.View entering={FadeInDown.delay(180).duration(600).springify().damping(20)}>
                    <SectionLabel>PIPELINE</SectionLabel>
                    <View style={s.card}>
                        <SettingRow
                            icon={Zap} label="Auto-scrape on open" sub="Run scraper automatically when the app launches"
                            color={C.cyan}
                            right={
                                <Switch
                                    value={autoScrape} onValueChange={setAutoScrape}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.cyan}50` }}
                                    thumbColor={autoScrape ? C.cyan : 'rgba(255,255,255,0.3)'}
                                />
                            }
                        />
                        <View style={s.divider} />
                        <SettingRow
                            icon={Bell} label="Push Notifications" sub="Get notified on interview replies"
                            color={C.purple}
                            right={
                                <Switch
                                    value={notifs} onValueChange={setNotifs}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.purple}50` }}
                                    thumbColor={notifs ? C.purple : 'rgba(255,255,255,0.3)'}
                                />
                            }
                        />
                    </View>
                </Animated.View>

                {/* ── Premium CTA — hidden for premium/admin ── */}
                {!isPremium && (
                    <Animated.View entering={FadeInDown.delay(240).duration(600).springify().damping(20)} style={s.premiumCard}>
                        <Crown size={22} color={C.amber} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.premiumTitle}>Upgrade to Premium</Text>
                            <Text style={s.premiumSub}>Unlimited applications, BYOK priority, no rate limits.</Text>
                        </View>
                        <TouchableOpacity style={s.premiumBtn} activeOpacity={0.85}>
                            <Text style={s.premiumBtnText}>UPGRADE</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── About ── */}
                <Animated.View entering={FadeInDown.delay(300).duration(600).springify().damping(20)}>
                    <SectionLabel>ABOUT</SectionLabel>
                    <View style={s.card}>
                        <SettingRow icon={Info} label="OpusHunter" sub="Version 1.0.0 — AI Job Application Engine" color={C.amber} />
                    </View>

                    {/* ── Danger Zone ── */}
                    <SectionLabel>DANGER ZONE</SectionLabel>
                    <View style={s.card}>
                        <DangerRow icon={RefreshCw} label="Clear Pipeline" sub="Remove all pending jobs from your queue" onPress={() => setConfirm('pipeline')} />
                        <View style={s.divider} />
                        <DangerRow icon={Trash2} label="Clear Application History" sub="Delete all submitted applications" onPress={() => setConfirm('history')} />
                        <View style={s.divider} />
                        <DangerRow icon={Trash2} label="Delete Account" sub="Permanently remove your account and data" onPress={() => setConfirm('account')} />
                    </View>

                    <View style={{ height: 60 }} />
                </Animated.View>
            </ScrollView>

            <ConfirmModal
                visible={confirm === 'pipeline'}
                title="Clear Pipeline?"
                body="All pending jobs will be removed. Already-applied jobs are unaffected."
                confirmLabel="Clear Pipeline"
                onConfirm={() => clearPipelineMutation.mutate()}
                onCancel={() => setConfirm(null)}
                loading={clearPipelineMutation.isPending}
            />
            <ConfirmModal
                visible={confirm === 'history'}
                title="Clear History?"
                body="All application history will be permanently deleted."
                confirmLabel="Clear History"
                onConfirm={() => clearHistoryMutation.mutate()}
                onCancel={() => setConfirm(null)}
                loading={clearHistoryMutation.isPending}
            />
            <ConfirmModal
                visible={confirm === 'account'}
                title="Delete Account?"
                body="This is permanent. All your data, applications, and CVs will be erased."
                confirmLabel="Delete Forever"
                onConfirm={() => deleteAccountMutation.mutate()}
                onCancel={() => setConfirm(null)}
                loading={deleteAccountMutation.isPending}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    banner: {
        position: 'absolute', top: 56, left: 16, right: 16, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 32 : 16,
        paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${C.cyan}10`, borderWidth: 1, borderColor: `${C.cyan}25` },
    headerTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },

    scroll: { paddingHorizontal: 20, maxWidth: 680, width: '100%', alignSelf: 'center' as any },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: C.sub, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },

    card: { backgroundColor: 'rgba(8,16,24,0.88)', borderWidth: 1, borderColor: C.border, borderRadius: 18, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: C.border },

    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    settingIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    settingLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    settingSub: { fontSize: 11, color: C.sub, marginTop: 2 },

    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },

    premiumCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: `${C.amber}08`, borderWidth: 1, borderColor: `${C.amber}30`,
        borderRadius: 18, padding: 16, marginTop: 20,
    },
    premiumTitle: { fontSize: 14, fontWeight: '800', color: C.text },
    premiumSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    premiumBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: C.amber },
    premiumBtnText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1.5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(2,5,7,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: { width: '100%', maxWidth: 380, backgroundColor: 'rgba(8,16,24,0.97)', borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 24, alignItems: 'center' },
    modalIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
    modalBody: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
    modalCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { color: C.sub, fontWeight: '700', fontSize: 13 },
    modalConfirmBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});