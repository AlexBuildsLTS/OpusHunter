/**
 * app/(tabs)/profile.tsx
 * OpusHunter — Profile Screen
 * 2026-06-28
 *
 * Key fixes:
 *   - All sub-navigation uses router.push (settings, vault, configure, admin)
 *     Those screens use router.replace back — no GO_BACK crash possible
 *   - Avatar upload via expo-image-picker (camera icon overlay)
 *   - Personal API keys (rapidapi_key, gemini_key) from profiles table
 *   - Role badge: ADMIN (pink) / PREMIUM (amber) / MEMBER (purple)
 *   - Admin panel link gated: role === 'admin' only
 *   - Settings link always visible
 *   - Sign Out clears queryClient cache before navigating
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, Image,
    KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    Camera, CheckCircle2, AlertCircle, Eye, EyeOff,
    LogOut, ChevronRight, FileText, SlidersHorizontal,
    ShieldAlert, Settings, Crown,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

const C = {
    cyan: '#00D4FF', purple: '#7B5EA7', pink: '#E8436A',
    green: '#00C67D', amber: '#F59E0B',
    bg: '#0A1419', card: 'rgba(11,24,34,0.9)',
    border: 'rgba(120,200,240,0.1)', text: '#D8E4EC',
    sub: 'rgba(216,228,236,0.45)',
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
    const src = name?.trim() || email;
    const parts = src.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return src.slice(0, 2).toUpperCase();
}

const ROLE_CFG: Record<string, { color: string; label: string }> = {
    admin: { color: C.pink, label: 'ADMIN' },
    premium: { color: C.amber, label: 'PREMIUM' },
    member: { color: C.purple, label: 'MEMBER' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const { color, label } = ROLE_CFG[role] ?? ROLE_CFG.member;
    return (
        <View style={[s.roleBadge, { backgroundColor: `${color}18`, borderColor: `${color}45` }]}>
            <Text style={[s.roleText, { color }]}>{label}</Text>
        </View>
    );
}

function ApiKeyField({ label, value, placeholder, color, onSave, saving }: {
    label: string; value: string; placeholder: string;
    color: string; onSave: (v: string) => void; saving: boolean;
}) {
    const [draft, setDraft] = useState(value);
    const [show, setShow] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => { setDraft(value); setDirty(false); }, [value]);

    const masked = value && !show
        ? `${value.slice(0, 6)}••••••••${value.slice(-4)}`
        : value;

    return (
        <View style={s.apiRow}>
            <Text style={[s.apiLabel, { color }]}>{label}</Text>
            <View style={s.apiInput}>
                <TextInput
                    style={s.apiInputText}
                    value={dirty ? draft : (show ? value : (value ? masked : ''))}
                    onChangeText={(v) => { setDraft(v); setDirty(true); }}
                    onFocus={() => { setDirty(true); setDraft(value); }}
                    placeholder={placeholder}
                    placeholderTextColor="#3D4A55"
                    secureTextEntry={!show && !dirty}
                    autoCapitalize="none"
                    autoCorrect={false}
                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                />
                <TouchableOpacity onPress={() => setShow(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ paddingHorizontal: 8 }}>
                    {show ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                </TouchableOpacity>
                {dirty && (
                    <TouchableOpacity
                        onPress={() => { onSave(draft.trim()); setDirty(false); }}
                        disabled={saving}
                        style={[s.apiSaveBtn, { backgroundColor: `${color}20`, borderColor: `${color}45` }]}
                    >
                        {saving ? <ActivityIndicator size="small" color={color} />
                            : <Text style={[s.apiSaveBtnText, { color }]}>Save</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function NavLink({ icon: Icon, label, sub, color, onPress }: {
    icon: React.ElementType; label: string; sub?: string;
    color: string; onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={s.navRow} activeOpacity={0.7}>
            <View style={[s.navIcon, { backgroundColor: `${color}10`, borderColor: `${color}25` }]}>
                <Icon size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={s.navLabel}>{label}</Text>
                {sub && <Text style={s.navSub} numberOfLines={1}>{sub}</Text>}
            </View>
            <ChevronRight size={14} color={C.sub} />
        </TouchableOpacity>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (banner) { const t = setTimeout(() => setBanner(null), 3500); return () => clearTimeout(t); }
    }, [banner]);

    const { data: profile, isLoading } = useQuery<ProfileRow>({
        queryKey: ['profile_full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (error) throw new Error(error.message);
            return data as ProfileRow;
        },
    });

    useEffect(() => { if (profile) setFullName(profile.full_name ?? ''); }, [profile]);

    const { data: stats } = useQuery({
        queryKey: ['pipeline_metrics'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_pipeline_metrics');
            if (error) throw new Error(error.message);
            return data as { matches: number; pending: number; interviews: number };
        },
        staleTime: 60_000,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase.from('profiles')
                .update({ full_name: fullName.trim() || null }).eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile_full'] });
            setBanner({ ok: true, text: 'Profile saved.' });
        },
        onError: (e: Error) => setBanner({ ok: false, text: e.message }),
    });

    const keyMutation = useMutation({
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

    const pickAvatar = useCallback(async () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (r) => setAvatarUri(r.target?.result as string);
                    reader.readAsDataURL(file);
                }
            };
            input.click();
            return;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { setBanner({ ok: false, text: 'Photo permission needed.' }); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    }, []);

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

    const initials = getInitials(profile.full_name, profile.email);
    const role = profile.role ?? 'member';
    const isAdmin = role === 'admin';
    const isPremium = role === 'premium' || isAdmin;
    const nameChanged = fullName !== (profile.full_name ?? '');

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {Platform.OS === 'web' && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    {/* @ts-ignore */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(123,94,167,0.07) 0%, transparent 60%)' }} />
                </View>
            )}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled">

                    {/* Top row: title + role badge */}
                    <Animated.View entering={FadeInDown.delay(40).springify()} style={s.topRow}>
                        <Text style={s.pageTitle}>Profile</Text>
                        <RoleBadge role={role} />
                    </Animated.View>

                    {/* Banner */}
                    {banner && (
                        <Animated.View entering={FadeInDown.springify()} style={[s.banner,
                        { borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`, backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08` }]}>
                            {banner.ok ? <CheckCircle2 size={14} color={C.cyan} /> : <AlertCircle size={14} color={C.pink} />}
                            <Text style={[s.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>{banner.text}</Text>
                        </Animated.View>
                    )}

                    {/* Avatar */}
                    <Animated.View entering={FadeInDown.delay(80).springify()} style={s.avatarSection}>
                        <TouchableOpacity onPress={pickAvatar} style={s.avatarWrap} activeOpacity={0.85}>
                            {avatarUri
                                ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                                : <View style={s.avatarFallback}>
                                    <Text style={s.avatarInitials}>{initials}</Text>
                                </View>}
                            <View style={s.avatarEditBtn}>
                                <Camera size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Stats */}
                    <Animated.View entering={FadeInDown.delay(120).springify()} style={s.statsRow}>
                        {[
                            { label: 'Applications', value: stats?.matches ?? 0, color: C.cyan },
                            { label: 'Pending', value: stats?.pending ?? 0, color: C.purple },
                            { label: 'Applied', value: stats?.interviews ?? 0, color: C.green },
                        ].map(st => (
                            <View key={st.label} style={[s.statBox, { borderColor: `${st.color}20`, backgroundColor: `${st.color}08` }]}>
                                <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                                <Text style={s.statLabel}>{st.label}</Text>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Premium upgrade CTA — show to members */}
                    {!isPremium && (
                        <Animated.View entering={FadeInDown.delay(140).springify()} style={s.premiumCard}>
                            <Crown size={18} color={C.amber} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.premiumTitle}>Upgrade to Premium</Text>
                                <Text style={s.premiumSub}>Unlimited scrapes · Mass apply · Priority matching</Text>
                            </View>
                            <TouchableOpacity style={s.premiumBtn} activeOpacity={0.85}>
                                <Text style={s.premiumBtnText}>Upgrade</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Edit profile */}
                    <Animated.View entering={FadeInDown.delay(160).springify()} style={s.card}>
                        <Text style={s.cardTitle}>Account</Text>
                        <Text style={s.fieldLabel}>FULL NAME</Text>
                        <View style={s.textFieldRow}>
                            <TextInput
                                style={s.textFieldInput}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Your full name"
                                placeholderTextColor="#3D4A55"
                                autoCorrect={false}
                                {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                            />
                        </View>
                        <Text style={[s.fieldLabel, { marginTop: 12 }]}>EMAIL</Text>
                        <View style={[s.textFieldRow, { backgroundColor: 'rgba(0,0,0,0.15)', borderColor: 'rgba(255,255,255,0.04)' }]}>
                            <TextInput
                                style={[s.textFieldInput, { color: C.sub }]}
                                value={profile.email} editable={false}
                                {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                            />
                        </View>
                        <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={!nameChanged || saveMutation.isPending}
                            style={[s.saveBtn, (!nameChanged || saveMutation.isPending) && { opacity: 0.4 }]} activeOpacity={0.85}>
                            {saveMutation.isPending ? <ActivityIndicator color="#000" />
                                : <Text style={s.saveBtnText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* API Keys */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={s.card}>
                        <Text style={s.cardTitle}>Your API Keys</Text>
                        <Text style={s.cardSub}>
                            Your key takes priority over system keys.{'\n'}
                            Leave blank to use the shared fallback pool.
                        </Text>
                        <ApiKeyField label="RAPIDAPI KEY (JSEARCH)" value={profile.rapidapi_key ?? ''}
                            placeholder="Paste your RapidAPI key…" color={C.cyan}
                            saving={keyMutation.isPending}
                            onSave={(v) => keyMutation.mutate({ field: 'rapidapi_key', value: v })} />
                        <View style={{ height: 10 }} />
                        <ApiKeyField label="GEMINI API KEY" value={profile.gemini_key ?? ''}
                            placeholder="Paste your Gemini key…" color={C.purple}
                            saving={keyMutation.isPending}
                            onSave={(v) => keyMutation.mutate({ field: 'gemini_key', value: v })} />
                    </Animated.View>

                    {/* Navigation */}
                    <Animated.View entering={FadeInDown.delay(240).springify()} style={s.card}>
                        <Text style={s.cardTitle}>Navigation</Text>
                        <NavLink icon={FileText}
                            label={profile.cv_storage_path ? 'CV Uploaded ✓' : 'Upload CV'}
                            sub={profile.cv_storage_path ? profile.cv_storage_path.split('/').pop() : 'Required for auto-apply'}
                            color={profile.cv_storage_path ? C.green : C.cyan}
                            onPress={() => router.push('/(tabs)/vault')} />
                        <View style={s.navDivider} />
                        <NavLink icon={SlidersHorizontal} label="Search Rules"
                            sub="Keywords, location, work types"
                            color={C.purple}
                            onPress={() => router.push('/(tabs)/configure')} />
                        <View style={s.navDivider} />
                        <NavLink icon={Settings} label="Settings"
                            sub="Pipeline, notifications, security, danger zone"
                            color={C.cyan}
                            onPress={() => router.push('/(settings)')} />
                        {isAdmin && (
                            <>
                                <View style={s.navDivider} />
                                <NavLink icon={ShieldAlert} label="Admin Panel"
                                    sub="System keys, user management"
                                    color={C.pink}
                                    onPress={() => router.push('/(admin)')} />
                            </>
                        )}
                    </Animated.View>

                    {/* Sign out */}
                    <Animated.View entering={FadeInDown.delay(280).springify()}>
                        <TouchableOpacity onPress={handleLogout} style={s.signOutBtn} activeOpacity={0.8}>
                            <LogOut size={16} color={C.pink} />
                            <Text style={s.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeIn.delay(400)} style={{ alignItems: 'center', marginTop: 16 }}>
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
                            OpusHunter v1.0.0 · 2026-06-28
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 540, width: '100%', alignSelf: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: C.text },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    avatarSection: { alignItems: 'center', marginBottom: 20 },
    avatarWrap: { position: 'relative' },
    avatarFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: `${C.purple}20`, borderWidth: 2.5, borderColor: `${C.purple}50`, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: `${C.cyan}50` },
    avatarInitials: { fontSize: 30, fontWeight: '900', color: C.purple },
    avatarEditBtn: { position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
    statVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 9, fontWeight: '700', color: C.sub, letterSpacing: 1.2, textTransform: 'uppercase' },

    premiumCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: `${C.amber}30`, backgroundColor: `${C.amber}08`, marginBottom: 16 },
    premiumTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
    premiumSub: { fontSize: 11, color: C.sub },
    premiumBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: C.amber, flexShrink: 0 },
    premiumBtnText: { fontSize: 11, fontWeight: '800', color: '#000' },

    card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14 },
    cardTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 14 },
    cardSub: { fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 14, lineHeight: 16 },

    fieldLabel: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    textFieldRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 48, alignItems: 'center' },
    textFieldInput: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
    saveBtn: { height: 50, borderRadius: 13, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 0.8 },

    apiRow: { marginBottom: 10 },
    apiLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
    apiInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingLeft: 14, height: 46 },
    apiInputText: { flex: 1, fontSize: 12, color: C.text, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }) },
    apiSaveBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginLeft: 4, marginRight: 6 },
    apiSaveBtnText: { fontSize: 11, fontWeight: '800' },

    navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
    navLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    navSub: { fontSize: 11, color: C.sub, marginTop: 1 },
    navDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 48 },

    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 16, borderWidth: 1, borderColor: `${C.pink}35`, backgroundColor: `${C.pink}0A`, marginBottom: 12 },
    signOutText: { fontSize: 14, fontWeight: '700', color: C.pink },
});