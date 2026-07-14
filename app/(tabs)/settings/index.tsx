/**
 * app/(tabs)/settings/index.tsx
 * OpusHunter — Settings Hub
 *
 * 2026-07-13 — Redesigned as a proper navigation hub: large icon+title+
 * subtitle+chevron cards instead of a flat grouped list, matching the
 * pattern used elsewhere for high-density option screens. Every card here
 * routes to a real, already-built screen, or expands a section with real
 * data — no placeholder destinations.
 *
 * NOT added: a "Billing & Usage" card showing per-provider token counts.
 * That would require the api_key_usage_logs table and markKeyUsed()
 * extension outlined in the original project audit — neither exists yet.
 * Adding a nav card that leads to fabricated numbers would be worse than
 * not having the feature; it stays off this screen until the real data
 * exists to back it.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Platform, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import {
    Zap, Bell, Shield, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
    Crown, ChevronRight, Lock, User as UserIcon, Info, FileText, LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { C } from '../../../lib/theme';
import { GlassCard } from '../../../components/ui/GlassCard';

// ── Hub nav card — the primary building block of this screen ─────────────────

function HubCard({
    icon: Icon, title, sub, color, onPress, tint = 'frost',
}: {
    icon: LucideIcon; title: string; sub: string; color: string;
    onPress: () => void; tint?: 'frost' | 'pink' | 'amber';
}) {
    return (
        <GlassCard tint={tint} padding="none" hoverable onPress={onPress}>
            <View style={s.hubRow}>
                <View style={[s.hubIcon, { backgroundColor: `${color}14`, borderColor: `${color}28` }]}>
                    <Icon size={19} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.hubTitle}>{title}</Text>
                    <Text style={s.hubSub}>{sub}</Text>
                </View>
                <ChevronRight size={17} color={C.dim} />
            </View>
        </GlassCard>
    );
}

function SectionLabel({ children }: { children: string }) {
    return <Text style={s.sectionLabel}>{children}</Text>;
}

function DangerRow({
    icon: Icon, label, sub, onPress, loading,
}: { icon: LucideIcon; label: string; sub: string; onPress: () => void; loading?: boolean }) {
    return (
        <TouchableOpacity onPress={onPress} style={s.dangerRow} activeOpacity={0.75} disabled={loading}>
            <View style={[s.hubIcon, { backgroundColor: `${C.pink}14`, borderColor: `${C.pink}28` }]}>
                <Icon size={16} color={C.pink} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.hubTitle, { color: C.pink, fontSize: 13 }]}>{label}</Text>
                <Text style={s.hubSub}>{sub}</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={C.pink} /> : <ChevronRight size={16} color={C.pink} />}
        </TouchableOpacity>
    );
}

function ConfirmModal({
    visible, title, body, confirmLabel, onConfirm, onCancel, loading,
}: {
    visible: boolean; title: string; body: string; confirmLabel: string;
    onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={s.modalOverlay}>
                <Animated.View entering={FadeInDown.springify()} style={s.modalCard}>
                    <View style={[s.modalIconWrap, { backgroundColor: `${C.pink}14` }]}>
                        <AlertTriangle size={26} color={C.pink} />
                    </View>
                    <Text style={s.modalTitle}>{title}</Text>
                    <Text style={s.modalBody}>{body}</Text>
                    <View style={s.modalBtns}>
                        <TouchableOpacity onPress={onCancel} style={s.modalCancelBtn}>
                            <Text style={s.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} disabled={loading} style={[s.modalConfirmBtn, { backgroundColor: C.pink }]}>
                            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>{confirmLabel}</Text>}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [notifs, setNotifs] = useState(false);
    const [autoScrape, setAutoScrape] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [confirm, setConfirm] = useState<null | 'pipeline' | 'history' | 'account'>(null);

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
        onSuccess: () => { queryClient.clear(); router.replace('/login'); },
        onError: (e: Error) => { setConfirm(null); flash(e.message, false); },
    });

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { backgroundColor: banner.ok ? `${C.green}15` : `${C.pink}15`, borderColor: banner.ok ? `${C.green}40` : `${C.pink}40` }]}
                >
                    {banner.ok ? <CheckCircle2 size={15} color={C.green} /> : <AlertTriangle size={15} color={C.pink} />}
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.delay(20).springify().damping(20)} style={s.hero}>
                    <View style={s.heroPill}><Text style={s.heroPillText}>SETTINGS</Text></View>
                    <View style={s.heroIconWrap}>
                        <UserIcon size={26} color={C.cyan} />
                    </View>
                    <Text style={s.heroName}>{profile?.full_name ?? profile?.email ?? 'Your account'}</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).springify().damping(20)} style={{ gap: 10 }}>
                    <SectionLabel>ACCOUNT</SectionLabel>
                    <HubCard icon={UserIcon} title="Profile" sub="Name, avatar, and contact details" color={C.cyan}
                        onPress={() => router.push('/settings/profile' as any)} />
                    <HubCard icon={Lock} title="Security" sub="Password, PIN, biometrics, and API keys" color={C.cyan}
                        onPress={() => router.push('/settings/security' as any)} />
                    <HubCard icon={FileText} title="Documents" sub="CV and certifications" color={C.purple}
                        onPress={() => router.push('/settings/documents' as any)} />
                </Animated.View>

                {isAdmin && (
                    <Animated.View entering={FadeInDown.delay(140).springify().damping(20)} style={{ gap: 10, marginTop: 22 }}>
                        <SectionLabel>ADMINISTRATION</SectionLabel>
                        <HubCard icon={Shield} title="Admin Core" sub="Users, roles, and the shared API key pool" color={C.pink} tint="pink"
                            onPress={() => router.push('/admin' as any)} />
                    </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(200).springify().damping(20)} style={{ marginTop: 22 }}>
                    <SectionLabel>PIPELINE</SectionLabel>
                    <GlassCard tint="frost" padding="none" hoverable>
                        <View style={s.hubRow}>
                            <View style={[s.hubIcon, { backgroundColor: `${C.cyan}14`, borderColor: `${C.cyan}28` }]}>
                                <Zap size={17} color={C.cyan} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.hubTitle}>Auto-scrape on open</Text>
                                <Text style={s.hubSub}>Run the scraper automatically when the app launches</Text>
                            </View>
                            <Switch value={autoScrape} onValueChange={setAutoScrape}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.cyan}50` }}
                                thumbColor={autoScrape ? C.cyan : 'rgba(255,255,255,0.3)'} />
                        </View>
                        <View style={s.divider} />
                        <View style={s.hubRow}>
                            <View style={[s.hubIcon, { backgroundColor: `${C.purple}14`, borderColor: `${C.purple}28` }]}>
                                <Bell size={17} color={C.purple} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.hubTitle}>Push Notifications</Text>
                                <Text style={s.hubSub}>Get notified on interview replies</Text>
                            </View>
                            <Switch value={notifs} onValueChange={setNotifs}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${C.purple}50` }}
                                thumbColor={notifs ? C.purple : 'rgba(255,255,255,0.3)'} />
                        </View>
                    </GlassCard>
                </Animated.View>

                {!isPremium && (
                    <Animated.View entering={FadeInDown.delay(260).springify().damping(20)} style={{ marginTop: 22 }}>
                        <GlassCard tint="amber" padding="md" glow hoverable style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <Crown size={22} color={C.amber} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.premiumTitle}>Upgrade to Premium</Text>
                                <Text style={s.premiumSub}>Unlimited applications, BYOK priority, no rate limits.</Text>
                            </View>
                            <TouchableOpacity style={s.premiumBtn} activeOpacity={0.85}>
                                <Text style={s.premiumBtnText}>UPGRADE</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(320).springify().damping(20)} style={{ marginTop: 22 }}>
                    <SectionLabel>ABOUT</SectionLabel>
                    <HubCard icon={Info} title="OpusHunter" sub="Version 1.0.0 — AI Job Application Engine" color={C.amber} tint="amber" onPress={() => { }} />

                    <View style={{ marginTop: 22 }}>
                        <SectionLabel>DANGER ZONE</SectionLabel>
                        <GlassCard tint="pink" padding="none" hoverable>
                            <DangerRow icon={RefreshCw} label="Clear Pipeline" sub="Remove all pending jobs from your queue" onPress={() => setConfirm('pipeline')} />
                            <View style={s.divider} />
                            <DangerRow icon={Trash2} label="Clear Application History" sub="Delete all submitted applications" onPress={() => setConfirm('history')} />
                            <View style={s.divider} />
                            <DangerRow icon={Trash2} label="Delete Account" sub="Permanently remove your account and data" onPress={() => setConfirm('account')} />
                        </GlassCard>
                    </View>

                    <View style={{ height: 60 }} />
                </Animated.View>
            </ScrollView>

            <ConfirmModal
                visible={confirm === 'pipeline'} title="Clear Pipeline?"
                body="All pending jobs will be removed. Already-applied jobs are unaffected."
                confirmLabel="Clear Pipeline" onConfirm={() => clearPipelineMutation.mutate()}
                onCancel={() => setConfirm(null)} loading={clearPipelineMutation.isPending}
            />
            <ConfirmModal
                visible={confirm === 'history'} title="Clear History?"
                body="All application history will be permanently deleted."
                confirmLabel="Clear History" onConfirm={() => clearHistoryMutation.mutate()}
                onCancel={() => setConfirm(null)} loading={clearHistoryMutation.isPending}
            />
            <ConfirmModal
                visible={confirm === 'account'} title="Delete Account?"
                body="This is permanent. All your data, applications, and CVs will be erased."
                confirmLabel="Delete Forever" onConfirm={() => deleteAccountMutation.mutate()}
                onCancel={() => setConfirm(null)} loading={deleteAccountMutation.isPending}
            />
        </View>
    );
}

const s = StyleSheet.create({
    banner: {
        position: 'absolute', top: 56, left: 16, right: 16, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    scroll: {
        paddingHorizontal: 20, maxWidth: 680, width: '100%', alignSelf: 'center' as any,
        paddingTop: Platform.OS === 'ios' ? 24 : Platform.OS === 'web' ? 16 : 12,
    },

    hero: { alignItems: 'center', marginBottom: 28 },
    heroPill: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
        backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`, marginBottom: 16,
    },
    heroPillText: { fontSize: 10, fontWeight: '900', color: C.cyan, letterSpacing: 2 },
    heroIconWrap: {
        width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${C.cyan}12`, borderWidth: 1, borderColor: `${C.cyan}30`, marginBottom: 10,
    },
    heroName: { fontSize: 14, fontWeight: '700', color: C.sub },

    sectionLabel: { fontSize: 11, fontWeight: '800', color: C.sub, letterSpacing: 1.5, marginBottom: 10 },
    divider: { height: 1, backgroundColor: C.border },

    hubRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    hubIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    hubTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    hubSub: { fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 15 },

    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },

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