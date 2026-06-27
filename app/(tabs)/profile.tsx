/**
 * app/(tabs)/profile.tsx
 * OpusHunter — User Profile Screen
 * 2026-06-26 — complete rewrite
 *
 * Sections:
 *   1. Avatar + name (inline edit) + role badge
 *   2. Application stats (RPC)
 *   3. Personal API Keys — user can save their own RapidAPI + Gemini keys
 *      (stored in profiles.rapidapi_key / profiles.gemini_key)
 *   4. CV status → links to Vault
 *   5. Quick links: Search Rules → Configure, Admin Panel (admin-only)
 *   6. Sign Out
 *
 * Key priority reminder (enforced in edge functions):
 *   profile key >> api_keys table (user tier) >> api_keys (system) >> env secret
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Alert,
    KeyboardAvoidingView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    Edit3, CheckCircle2, AlertCircle, FileText,
    SlidersHorizontal, ShieldAlert, LogOut,
    ChevronRight, Key, Eye, EyeOff, Save, Zap,
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

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string, email: string): string {
    const src = name?.trim() || email;
    const parts = src.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return src.slice(0, 2).toUpperCase();
}

function AmbientBg() {
    if (Platform.OS !== 'web') return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 50% at 80% 15%, rgba(123,94,167,0.07) 0%, transparent 65%)' }} />
        </View>
    );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const cfg: Record<string, { color: string; label: string }> = {
        admin: { color: C.pink, label: 'ADMIN' },
        premium: { color: C.amber, label: 'PREMIUM' },
        member: { color: C.purple, label: 'MEMBER' },
    };
    const { color, label } = cfg[role] ?? cfg.member;
    return (
        <View style={[s.roleBadge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
            <Text style={[s.roleText, { color }]}>{label}</Text>
        </View>
    );
}

// ── Stat box ──────────────────────────────────────────────────────────────────

const StatBox = memo(({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[s.statBox, { borderColor: `${color}20`, backgroundColor: `${color}08` }]}>
        <Text style={[s.statVal, { color }]}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
    </View>
));
StatBox.displayName = 'StatBox';

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        {children}
    </View>
);

// ── API Key row (masked, toggleable visibility) ───────────────────────────────

function ApiKeyRow({
    label,
    value,
    placeholder,
    onSave,
    saving,
    color,
}: {
    label: string;
    value: string;
    placeholder: string;
    onSave: (v: string) => void;
    saving: boolean;
    color: string;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [visible, setVisible] = useState(false);

    useEffect(() => { setDraft(value); }, [value]);

    const handleSave = () => {
        onSave(draft.trim());
        setEditing(false);
        setVisible(false);
    };
    const handleCancel = () => {
        setDraft(value);
        setEditing(false);
        setVisible(false);
    };

    const displayVal = value ? (visible ? value : `${value.slice(0, 6)}••••••••${value.slice(-4)}`) : '';

    return (
        <View style={[s.apiKeyRow, { borderColor: `${color}18` }]}>
            <View style={[s.apiKeyIcon, { backgroundColor: `${color}10`, borderColor: `${color}25` }]}>
                <Key size={14} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.apiKeyLabel, { color }]}>{label}</Text>
                {editing ? (
                    <View style={s.apiKeyEditRow}>
                        <TextInput
                            style={s.apiKeyInput}
                            value={draft}
                            onChangeText={setDraft}
                            placeholder={placeholder}
                            placeholderTextColor="#3D4A55"
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry={!visible}
                            autoFocus
                            {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                        />
                        <TouchableOpacity onPress={() => setVisible(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            {visible ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={s.apiKeyValue} numberOfLines={1}>
                        {displayVal || <Text style={{ color: C.sub, fontStyle: 'italic' }}>{placeholder}</Text>}
                    </Text>
                )}
            </View>
            {editing ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity onPress={handleCancel} style={s.apiKeyActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} disabled={saving}
                        style={[s.apiKeyActionBtn, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
                        {saving ? <ActivityIndicator size="small" color={color} /> : <Save size={13} color={color} />}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {value ? (
                        <TouchableOpacity onPress={() => setVisible(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            {visible ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => setEditing(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Edit3 size={14} color={color} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ── Menu row ──────────────────────────────────────────────────────────────────

function MenuRow({
    icon: Icon, label, sub, color, onPress, danger = false,
}: {
    icon: React.ElementType; label: string; sub?: string;
    color: string; onPress: () => void; danger?: boolean;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={s.menuRow} activeOpacity={0.7}>
            <View style={[s.menuIcon, { backgroundColor: `${color}10`, borderColor: `${color}25` }]}>
                <Icon size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.menuLabel, danger && { color }]}>{label}</Text>
                {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
            </View>
            <ChevronRight size={15} color={C.sub} />
        </TouchableOpacity>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (banner) {
            const t = setTimeout(() => setBanner(null), 3500);
            return () => clearTimeout(t);
        }
    }, [banner]);

    // ── Load profile ──────────────────────────────────────────────────────────
    const { data: profile, isLoading } = useQuery<ProfileRow & { rapidapi_key?: string | null; gemini_key?: string | null }>({
        queryKey: ['profile_full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) throw new Error(error.message);
            return data as any;
        },
    });

    // ── Metrics ───────────────────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ['pipeline_metrics'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
            if (error) throw new Error(error.message);
            return data as { matches: number; pending: number; interviews: number };
        },
        staleTime: 60_000,
    });

    // ── Update name ───────────────────────────────────────────────────────────
    const updateNameMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('profiles')
                .update({ full_name: name }).eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile_full'] });
            setEditingName(false);
            setBanner({ ok: true, text: 'Name updated.' });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    // ── Update personal API key ───────────────────────────────────────────────
    const updateKeyMutation = useMutation({
        mutationFn: async ({ field, value }: { field: 'rapidapi_key' | 'gemini_key'; value: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('profiles')
                .update({ [field]: value || null }).eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['profile_full'] });
            setBanner({ ok: true, text: `${vars.field === 'rapidapi_key' ? 'RapidAPI' : 'Gemini'} key saved.` });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        queryClient.clear();
        router.replace('/(auth)/login');
    }, [router, queryClient]);

    if (isLoading || !profile) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.cyan} size="large" />
            </View>
        );
    }

    const initials = getInitials(profile.full_name ?? '', profile.email);
    const isAdmin = profile.role === 'admin';

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <AmbientBg />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Banner ── */}
                    {banner && (
                        <Animated.View entering={FadeInDown.springify()} style={[
                            s.banner,
                            {
                                borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`,
                                backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08`
                            },
                        ]}>
                            {banner.ok
                                ? <CheckCircle2 size={14} color={C.cyan} />
                                : <AlertCircle size={14} color={C.pink} />}
                            <Text style={[s.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>
                                {banner.text}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Avatar ── */}
                    <Animated.View entering={FadeInDown.delay(60).springify()} style={s.avatarSection}>
                        <View style={s.avatarRing}>
                            <Text style={s.avatarText}>{initials}</Text>
                        </View>

                        {editingName ? (
                            <View style={s.nameEditRow}>
                                <TextInput
                                    style={s.nameInput}
                                    value={nameInput}
                                    onChangeText={setNameInput}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={() => nameInput.trim() && updateNameMutation.mutate(nameInput.trim())}
                                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                                />
                                <TouchableOpacity
                                    onPress={() => nameInput.trim() && updateNameMutation.mutate(nameInput.trim())}
                                    disabled={updateNameMutation.isPending}
                                    style={s.nameSaveBtn}
                                >
                                    {updateNameMutation.isPending
                                        ? <ActivityIndicator size="small" color="#000" />
                                        : <Text style={s.nameSaveBtnText}>Save</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingName(false)} style={[s.nameSaveBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                                    <Text style={[s.nameSaveBtnText, { color: C.sub }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => { setNameInput(profile.full_name ?? ''); setEditingName(true); }}
                                style={s.nameRow}
                                activeOpacity={0.7}
                            >
                                <Text style={s.displayName}>{profile.full_name || 'Set your name'}</Text>
                                <Edit3 size={14} color={C.sub} />
                            </TouchableOpacity>
                        )}

                        <Text style={s.emailText}>{profile.email}</Text>
                        <RoleBadge role={profile.role ?? 'member'} />
                    </Animated.View>

                    {/* ── Stats ── */}
                    <Animated.View entering={FadeInDown.delay(120).springify()} style={s.statsRow}>
                        <StatBox label="Applications" value={stats?.matches ?? 0} color={C.cyan} />
                        <StatBox label="Pending" value={stats?.pending ?? 0} color={C.purple} />
                        <StatBox label="Applied" value={stats?.interviews ?? 0} color={C.green} />
                    </Animated.View>

                    {/* ── Personal API keys ── */}
                    <Animated.View entering={FadeInDown.delay(180).springify()}>
                        <Section title="YOUR API KEYS">
                            <Text style={s.sectionSub}>
                                Your keys take priority over system keys. Leave blank to use shared system fallback.
                            </Text>
                            <ApiKeyRow
                                label="RapidAPI Key (JSearch)"
                                value={(profile as any).rapidapi_key ?? ''}
                                placeholder="Paste your RapidAPI key…"
                                color={C.cyan}
                                saving={updateKeyMutation.isPending}
                                onSave={(v) => updateKeyMutation.mutate({ field: 'rapidapi_key', value: v })}
                            />
                            <View style={{ height: 10 }} />
                            <ApiKeyRow
                                label="Gemini API Key"
                                value={(profile as any).gemini_key ?? ''}
                                placeholder="Paste your Gemini key…"
                                color={C.purple}
                                saving={updateKeyMutation.isPending}
                                onSave={(v) => updateKeyMutation.mutate({ field: 'gemini_key', value: v })}
                            />
                            <View style={s.keyPriorityNote}>
                                <Zap size={11} color={C.amber} />
                                <Text style={s.keyPriorityText}>
                                    Priority: Your key → System pool → Environment secret
                                </Text>
                            </View>
                        </Section>
                    </Animated.View>

                    {/* ── Quick links ── */}
                    <Animated.View entering={FadeInDown.delay(240).springify()}>
                        <Section title="NAVIGATION">
                            <MenuRow
                                icon={FileText}
                                label={profile.cv_storage_path ? 'CV Uploaded ✓' : 'Upload Your CV'}
                                sub={profile.cv_storage_path
                                    ? profile.cv_storage_path.split('/').pop()
                                    : 'Required for auto-apply'}
                                color={profile.cv_storage_path ? C.green : C.cyan}
                                onPress={() => router.push('/(tabs)/vault')}
                            />
                            <View style={s.menuDivider} />
                            <MenuRow
                                icon={SlidersHorizontal}
                                label="Search Rules"
                                sub="Keywords, location, work types"
                                color={C.purple}
                                onPress={() => router.push('/(tabs)/configure')}
                            />
                            {isAdmin && (
                                <>
                                    <View style={s.menuDivider} />
                                    <MenuRow
                                        icon={ShieldAlert}
                                        label="Admin Panel"
                                        sub="Manage system keys & users"
                                        color={C.pink}
                                        onPress={() => router.push('/(admin)' as any)}
                                    />
                                </>
                            )}
                        </Section>
                    </Animated.View>

                    {/* ── Sign out ── */}
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <TouchableOpacity onPress={handleLogout} style={s.signOutBtn} activeOpacity={0.8}>
                            <LogOut size={16} color={C.pink} />
                            <Text style={s.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── Version ── */}
                    <Animated.View entering={FadeIn.delay(400)} style={s.versionRow}>
                        <Text style={s.versionText}>OpusHunter v1.0.0 · 2026-06-26</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        paddingTop: Platform.OS === 'web' ? 40 : 56,
        paddingHorizontal: 20,
        paddingBottom: 100,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 13,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // avatar
    avatarSection: { alignItems: 'center', marginBottom: 28 },
    avatarRing: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 2,
        borderColor: `${C.purple}50`,
        backgroundColor: `${C.purple}16`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    avatarText: { fontSize: 26, fontWeight: '900', color: C.purple },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    displayName: { fontSize: 20, fontWeight: '800', color: C.text },
    nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    nameInput: {
        fontSize: 16,
        fontWeight: '700',
        color: C.text,
        borderBottomWidth: 1,
        borderBottomColor: C.cyan,
        paddingBottom: 3,
        minWidth: 140,
        maxWidth: 220,
    },
    nameSaveBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9,
        backgroundColor: C.cyan,
    },
    nameSaveBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
    emailText: { fontSize: 13, color: C.sub, marginBottom: 10 },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    roleText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

    // stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
    },
    statVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 9, fontWeight: '700', color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase' },

    // sections
    section: {
        marginBottom: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: 'rgba(11,24,34,0.8)',
        overflow: 'hidden',
        padding: 14,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: C.cyan,
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    sectionSub: {
        fontSize: 11,
        color: C.sub,
        lineHeight: 17,
        marginBottom: 12,
        marginTop: -4,
    },

    // api key rows
    apiKeyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    apiKeyIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexShrink: 0,
    },
    apiKeyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
    apiKeyValue: {
        fontSize: 12,
        color: C.sub,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    },
    apiKeyEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    apiKeyInput: {
        flex: 1,
        fontSize: 12,
        color: C.text,
        borderBottomWidth: 1,
        borderBottomColor: C.cyan,
        paddingBottom: 2,
    },
    apiKeyActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyPriorityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    keyPriorityText: { fontSize: 10, color: C.amber, fontWeight: '600', flex: 1 },

    // menu
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexShrink: 0,
    },
    menuLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    menuSub: { fontSize: 11, color: C.sub, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 48 },

    // sign out
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${C.pink}35`,
        backgroundColor: `${C.pink}0A`,
        marginBottom: 16,
    },
    signOutText: { fontSize: 14, fontWeight: '700', color: C.pink },

    // version
    versionRow: { alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
    versionText: { fontSize: 10, color: 'rgba(255,255,255,0.18)' },
});