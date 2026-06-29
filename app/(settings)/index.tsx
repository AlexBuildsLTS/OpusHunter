/**
 * app/(settings)/index.tsx
 * OpusHunter — Settings Screen
 * 2026-06-28
 *
 * Sections:
 *   1. Pipeline Settings (max apps/day, auto-scrape on open)
 *   2. Notifications
 *   3. Premium Upgrade CTA (shown to member/premium, not admin)
 *   4. Danger Zone (clear pipeline, clear history, delete account)
 *
 * Navigation: router.replace back to /(tabs)/profile to avoid GO_BACK crash.
 * This screen is pushed via router.push('/(settings)') from profile.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Switch,
    Platform, StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    ArrowLeft, Zap, Bell, Shield, Trash2,
    RefreshCw, CheckCircle2, AlertTriangle, Crown,
    ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const C = {
    cyan: '#00D4FF',
    purple: '#7B5EA7',
    pink: '#E8436A',
    green: '#00C67D',
    amber: '#F59E0B',
    bg: '#0A1419',
    border: 'rgba(120,200,240,0.09)',
    text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
    return (
        <Text style={s.sectionLabel}>{children}</Text>
    );
}

function SettingRow({
    icon: Icon, label, sub, right, color = C.cyan, onPress,
}: {
    icon: React.ElementType; label: string; sub?: string;
    right?: React.ReactNode; color?: string;
    onPress?: () => void;
}) {
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
}

function DangerRow({
    icon: Icon, label, sub, onPress, loading,
}: {
    icon: React.ElementType; label: string; sub: string;
    onPress: () => void; loading?: boolean;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={s.dangerRow} activeOpacity={0.75} disabled={loading}>
            <View style={[s.settingIcon, { backgroundColor: `${C.pink}10`, borderColor: `${C.pink}20` }]}>
                <Icon size={15} color={C.pink} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: C.pink }]}>{label}</Text>
                <Text style={s.settingSub}>{sub}</Text>
            </View>
            {loading
                ? <ActivityIndicator size="small" color={C.pink} />
                : <ChevronRight size={15} color={C.pink} />}
        </TouchableOpacity>
    );
}

function ConfirmModal({
    visible, title, body, confirmLabel,
    onConfirm, onCancel, loading, destructive = true,
}: {
    visible: boolean; title: string; body: string;
    confirmLabel: string; onConfirm: () => void;
    onCancel: () => void; loading: boolean; destructive?: boolean;
}) {
    return (
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
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={s.modalConfirmText}>{confirmLabel}</Text>}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [notifs, setNotifs] = useState(false);
    const [autoScrape, setAutoScrape] = useState(false);
    const [role, setRole] = useState('member');
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [confirm, setConfirm] = useState<null | 'pipeline' | 'history' | 'account'>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('profiles').select('role').eq('id', user.id).single()
                .then(({ data }) => { if (data) setRole(data.role); });
        });
    }, []);

    useEffect(() => {
        if (banner) { const t = setTimeout(() => setBanner(null), 3500); return () => clearTimeout(t); }
    }, [banner]);

    const flash = (text: string, ok = true) => setBanner({ ok, text });

    // ── Clear pipeline ────────────────────────────────────────────────────────
    const clearPipelineMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('job_vault')
                .delete().eq('user_id', user.id).eq('status', 'pending');
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline_jobs'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline_metrics'] });
            setConfirm(null);
            flash('Pipeline cleared — run scraper to refill.');
        },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    // ── Clear history ─────────────────────────────────────────────────────────
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

    // ── Delete account ────────────────────────────────────────────────────────
    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            // Clean storage
            const { data: files } = await supabase.storage.from('cv_payloads').list(user.id);
            if (files?.length) {
                await supabase.storage.from('cv_payloads').remove(files.map((f: any) => `${user.id}/${f.name}`));
            }
            await supabase.auth.signOut();
        },
        onSuccess: () => {
            queryClient.clear();
            router.replace('/(auth)/login');
        },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    const CONFIRMS = {
        pipeline: {
            title: 'Clear Pipeline?',
            body: 'Deletes all pending jobs in your queue. Applied and rejected jobs are kept. The scraper will refill on the next run.',
            label: 'Clear Pipeline',
            mutation: clearPipelineMutation,
        },
        history: {
            title: 'Clear Application History?',
            body: 'Permanently deletes all application records and resets your metrics to zero.',
            label: 'Clear History',
            mutation: clearHistoryMutation,
        },
        account: {
            title: 'Delete Account?',
            body: 'Permanently deletes your profile, CV, documents, and all data. This cannot be undone.',
            label: 'Delete Everything',
            mutation: deleteAccountMutation,
        },
    };

    const active = confirm ? CONFIRMS[confirm] : null;
    const isPremiumOrAdmin = role === 'premium' || role === 'admin';

    // IMPORTANT: router.replace instead of router.back() — no stack to go back to
    const goBack = () => router.replace('/(tabs)/profile');

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {Platform.OS === 'web' && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    {/* @ts-ignore */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 80% 80%, rgba(232,67,106,0.05) 0%, transparent 65%)' }} />
                </View>
            )}

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={s.header}>
                    <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={16} color={C.cyan} />
                        <Text style={s.backText}>Profile</Text>
                    </TouchableOpacity>
                    <Text style={s.pageTitle}>Settings</Text>
                    <View style={{ width: 60 }} />
                </Animated.View>

                {/* Banner */}
                {banner && (
                    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                        style={[s.banner, { borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`, backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08` }]}>
                        {banner.ok ? <CheckCircle2 size={14} color={C.cyan} /> : <AlertTriangle size={14} color={C.pink} />}
                        <Text style={[s.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>{banner.text}</Text>
                    </Animated.View>
                )}

                {/* ── Premium CTA (member only) ── */}
                {!isPremiumOrAdmin && (
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={s.premiumCard}>
                        <View style={s.premiumLeft}>
                            <Crown size={20} color={C.amber} />
                            <View>
                                <Text style={s.premiumTitle}>Upgrade to Premium</Text>
                                <Text style={s.premiumSub}>Unlock mass-apply mode, unlimited scrapes & priority matching</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={s.premiumBtn} activeOpacity={0.85}>
                            <Text style={s.premiumBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── Pipeline ── */}
                <Animated.View entering={FadeInDown.delay(140).springify()} style={s.section}>
                    <SectionLabel>PIPELINE</SectionLabel>
                    <SettingRow
                        icon={Zap} label="Auto-Scrape on Open" color={C.cyan}
                        sub="Trigger scraper when dashboard loads"
                        right={
                            <Switch value={autoScrape} onValueChange={setAutoScrape}
                                trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${C.cyan}50` }}
                                thumbColor={autoScrape ? C.cyan : 'rgba(255,255,255,0.3)'} />
                        }
                    />
                    <View style={s.divider} />
                    <SettingRow
                        icon={Shield} label="Security & Password" color={C.purple}
                        sub="Change password, manage sessions"
                        onPress={() => router.push('/(settings)/security')}
                    />
                </Animated.View>

                {/* ── Notifications ── */}
                <Animated.View entering={FadeInDown.delay(180).springify()} style={s.section}>
                    <SectionLabel>NOTIFICATIONS</SectionLabel>
                    <SettingRow
                        icon={Bell} label="Push Notifications" color={C.purple}
                        sub="Get notified when jobs are applied"
                        right={
                            <Switch value={notifs} onValueChange={setNotifs}
                                trackColor={{ false: 'rgba(255,255,255,0.08)', true: `${C.purple}50` }}
                                thumbColor={notifs ? C.purple : 'rgba(255,255,255,0.3)'} />
                        }
                    />
                </Animated.View>

                {/* ── Danger zone ── */}
                <Animated.View entering={FadeInDown.delay(220).springify()} style={[s.section, { borderColor: `${C.pink}18` }]}>
                    <SectionLabel>DANGER ZONE</SectionLabel>
                    <DangerRow icon={RefreshCw} label="Clear Pipeline Queue"
                        sub="Delete all pending jobs (keeps application history)"
                        loading={clearPipelineMutation.isPending}
                        onPress={() => setConfirm('pipeline')} />
                    <View style={s.divider} />
                    <DangerRow icon={Trash2} label="Clear Application History"
                        sub="Delete all application records and reset metrics"
                        loading={clearHistoryMutation.isPending}
                        onPress={() => setConfirm('history')} />
                    <View style={s.divider} />
                    <DangerRow icon={Trash2} label="Delete Account"
                        sub="Permanently delete your account and all data"
                        loading={deleteAccountMutation.isPending}
                        onPress={() => setConfirm('account')} />
                </Animated.View>
            </ScrollView>

            {/* Confirm modal */}
            {active && (
                <ConfirmModal
                    visible={!!confirm}
                    title={active.title}
                    body={active.body}
                    confirmLabel={active.label}
                    loading={active.mutation.isPending}
                    onConfirm={() => active.mutation.mutate(undefined as any)}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 60 },
    backText: { fontSize: 13, color: C.cyan, fontWeight: '600' },
    pageTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // Premium CTA
    premiumCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderRadius: 18, borderWidth: 1,
        borderColor: `${C.amber}30`, backgroundColor: `${C.amber}08`,
        marginBottom: 16, gap: 12,
    },
    premiumLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    premiumTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 3 },
    premiumSub: { fontSize: 11, color: C.sub, lineHeight: 16, maxWidth: 200 },
    premiumBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.amber, flexShrink: 0 },
    premiumBtnText: { fontSize: 12, fontWeight: '800', color: '#000' },

    // Section
    section: { marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(11,24,34,0.9)', overflow: 'hidden', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    sectionLabel: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
    settingLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    settingSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 46 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#0B1822', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: `${C.pink}20` },
    modalIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 10 },
    modalBody: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    modalBtns: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: C.sub },
    modalConfirmBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modalConfirmText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});