/**
 * app/(tabs)/profile.tsx
 * OpusHunter — Profile Screen
 * 2026-06-29
 *
 * This screen was missing entirely from the previous build. Built fresh:
 *   - Avatar + editable full name
 *   - Role badge (read-only here — role changes happen ONLY in (admin)/users.tsx
 *     via force_set_role(), never editable by the user themselves)
 *   - CV upload (expo-document-picker → Supabase Storage 'cv_vault' bucket)
 *   - BYOK section: Gemini + RapidAPI keys (masked, editable)
 *   - Quick link to Admin Core if role === 'admin'
 *   - Web: max-w-2xl centered panel. Mobile: full width.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import {
    User, Mail, FileText, Upload, CheckCircle2, AlertCircle,
    Shield, Key, Eye, EyeOff, Sparkles, ChevronRight, Pencil,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import { C, ROLE_CFG } from '../../lib/theme';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function maskKey(key: string | null): string {
    if (!key || key.length < 8) return '';
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
}

export default function ProfileScreen() {
    const router = useRouter();
    const qc = useQueryClient();
    const isDesktop = Platform.OS === 'web';

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [geminiInput, setGeminiInput] = useState('');
    const [rapidInput, setRapidInput] = useState('');
    const [showGemini, setShowGemini] = useState(false);
    const [showRapid, setShowRapid] = useState(false);
    const renderRoleOption = (p: string) => (null);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [uploading, setUploading] = useState(false);

    const flash = (text: string, ok = true) => {
        setBanner({ ok, text });
        setTimeout(() => setBanner(null), 3500);
    };

    // ── Load profile ─────────────────────────────────────────────────────────
    const { data: profile, isLoading } = useQuery<ProfileRow | null>({
        queryKey: ['my_profile_full'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        if (profile) {
            setNameInput(profile.full_name ?? '');
            setGeminiInput('');
            setRapidInput('');
        }
    }, [profile?.id]);

    const role = profile?.role ?? 'member';
    const roleCfg = ROLE_CFG[role as keyof typeof ROLE_CFG];

    const initials = profile?.full_name
        ? profile.full_name.trim().split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
        : profile?.email?.slice(0, 2).toUpperCase() ?? '??';

    // ── Save name ────────────────────────────────────────────────────────────
    const saveNameMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my_profile_full'] });
            qc.invalidateQueries({ queryKey: ['my_profile'] });
            setEditingName(false);
            flash('Name updated.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    // ── Save BYOK keys ───────────────────────────────────────────────────────
    const saveKeysMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');
            const payload: Record<string, string> = {};
            if (geminiInput.trim()) payload.gemini_key = geminiInput.trim();
            if (rapidInput.trim()) payload.rapidapi_key = rapidInput.trim();
            if (Object.keys(payload).length === 0) return;
            const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my_profile_full'] });
            setGeminiInput('');
            setRapidInput('');
            flash('API keys saved securely.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    // ── CV upload ────────────────────────────────────────────────────────────
    const handleCvUpload = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setUploading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');

            const ext = file.name.split('.').pop();
            const path = `${user.id}/cv.${ext}`;

            const response = await fetch(file.uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('cv_vault')
                .upload(path, blob, { upsert: true, contentType: file.mimeType ?? 'application/pdf' });
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from('profiles').update({ cv_storage_path: path }).eq('id', user.id);
            if (dbError) throw dbError;

            qc.invalidateQueries({ queryKey: ['my_profile_full'] });
            flash('CV uploaded successfully.');
        } catch (e: any) {
            flash(e.message ?? 'Upload failed.', false);
        } finally {
            setUploading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color={C.cyan} size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            style={s.root}
            contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
            showsVerticalScrollIndicator={false}
        >
            {/* Banner */}
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()}
                    exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { borderColor: banner.ok ? `${C.green}40` : `${C.pink}40`, backgroundColor: banner.ok ? `${C.green}0F` : `${C.pink}0F` }]}
                >
                    {banner.ok ? <CheckCircle2 size={14} color={C.green} /> : <AlertCircle size={14} color={C.pink} />}
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            {/* ── Avatar + role ── */}
            <Animated.View entering={FadeInDown.delay(40).springify()} style={s.headerCard}>
                <View style={s.avatarWrap}>
                    {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} contentFit="cover" />
                    ) : (
                        <View style={[s.avatarFallback, { borderColor: `${roleCfg.color}50` }]}>
                            <Text style={[s.avatarText, { color: roleCfg.color }]}>{initials}</Text>
                        </View>
                    )}
                </View>

                {editingName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                        <TextInput
                            style={s.nameInput}
                            value={nameInput}
                            onChangeText={setNameInput}
                            autoFocus
                            placeholder="Your name"
                            placeholderTextColor={C.dim}
                        />
                        <TouchableOpacity onPress={() => saveNameMutation.mutate(nameInput)} disabled={saveNameMutation.isPending}>
                            {saveNameMutation.isPending
                                ? <ActivityIndicator size="small" color={C.cyan} />
                                : <CheckCircle2 size={20} color={C.cyan} />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setEditingName(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }} activeOpacity={0.7}>
                        <Text style={s.profileName}>{profile?.full_name || 'Add your name'}</Text>
                        <Pencil size={13} color={C.sub} />
                    </TouchableOpacity>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Mail size={12} color={C.sub} />
                    <Text style={s.profileEmail}>{profile?.email}</Text>
                </View>

                <View style={[s.roleBadge, { borderColor: `${roleCfg.color}40`, backgroundColor: `${roleCfg.color}12`, marginTop: 12 }]}>
                    <Shield size={11} color={roleCfg.color} />
                    <Text style={[s.roleBadgeText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
                </View>
            </Animated.View>

            {/* ── Admin shortcut ── */}
            {role === 'admin' && (
                <Animated.View entering={FadeInDown.delay(80).springify()}>
                    <TouchableOpacity onPress={() => router.push('/(admin)/' as any)} style={s.adminCard} activeOpacity={0.85}>
                        <View style={[s.adminIconBox]}>
                            <Shield size={18} color={C.pink} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.adminCardTitle}>Admin Core</Text>
                            <Text style={s.adminCardSub}>Manage users, roles, and system API keys</Text>
                        </View>
                        <ChevronRight size={18} color={C.pink} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ── CV / Resume ── */}
            <Animated.View entering={FadeInDown.delay(120).springify()} style={s.section}>
                <Text style={s.sectionTitle}>RESUME / CV</Text>
                <View style={s.cvCard}>
                    <View style={[s.cvIconBox]}>
                        <FileText size={20} color={C.cyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.cvTitle}>
                            {profile?.cv_storage_path ? 'CV on file' : 'No CV uploaded'}
                        </Text>
                        <Text style={s.cvSub}>
                            {profile?.cv_storage_path
                                ? 'Used to tailor auto-generated cover letters.'
                                : 'Upload a PDF or Word doc to improve match scoring.'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleCvUpload} disabled={uploading} style={s.cvBtn} activeOpacity={0.8}>
                        {uploading
                            ? <ActivityIndicator size="small" color={C.cyan} />
                            : <Upload size={15} color={C.cyan} />}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* ── BYOK: Bring Your Own Key ── */}
            <Animated.View entering={FadeInDown.delay(160).springify()} style={s.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Text style={s.sectionTitle}>BRING YOUR OWN KEY (BYOK)</Text>
                    <Sparkles size={13} color={C.amber} />
                </View>
                <Text style={s.sectionDesc}>
                    Add your own Gemini or RapidAPI key for unlimited scraping and AI cover letters.
                    Leave blank to use the shared system fallback (rate-limited).
                </Text>

                {/* Gemini key */}
                <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Key size={12} color={C.purple} />
                        <Text style={s.fieldLabel}>GEMINI API KEY</Text>
                    </View>
                    <View style={s.keyInputWrap}>
                        <TextInput
                            style={s.keyInput}
                            value={geminiInput}
                            onChangeText={setGeminiInput}
                            placeholder={profile?.gemini_key ? maskKey(profile.gemini_key) : 'AIzaSy...'}
                            placeholderTextColor={C.dim}
                            secureTextEntry={!showGemini}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowGemini((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            {showGemini ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* RapidAPI key */}
                <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Key size={12} color={C.cyan} />
                        <Text style={s.fieldLabel}>RAPIDAPI KEY (JSearch)</Text>
                    </View>
                    <View style={s.keyInputWrap}>
                        <TextInput
                            style={s.keyInput}
                            value={rapidInput}
                            onChangeText={setRapidInput}
                            placeholder={profile?.rapidapi_key ? maskKey(profile.rapidapi_key) : 'Your RapidAPI key...'}
                            placeholderTextColor={C.dim}
                            secureTextEntry={!showRapid}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowRapid((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            {showRapid ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => saveKeysMutation.mutate()}
                    disabled={saveKeysMutation.isPending || (!geminiInput.trim() && !rapidInput.trim())}
                    style={[s.saveKeysBtn, (!geminiInput.trim() && !rapidInput.trim()) && { opacity: 0.5 }]}
                    activeOpacity={0.85}
                >
                    {saveKeysMutation.isPending
                        ? <ActivityIndicator color="#000" size="small" />
                        : <Text style={s.saveKeysBtnText}>SAVE KEYS</Text>}
                </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 40 : 20 },
    scrollDesktop: { maxWidth: 640, width: '100%', alignSelf: 'center' as any },

    banner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16,
    },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    headerCard: {
        alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
        borderRadius: 24, padding: 28, marginBottom: 20,
    },
    avatarWrap: { width: 84, height: 84 },
    avatarImg: { width: 84, height: 84, borderRadius: 42 },
    avatarFallback: {
        width: 84, height: 84, borderRadius: 42, borderWidth: 2,
        backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 28, fontWeight: '800' },
    profileName: { fontSize: 18, fontWeight: '800', color: C.text },
    profileEmail: { fontSize: 12, color: C.sub },
    nameInput: {
        fontSize: 16, fontWeight: '700', color: C.text,
        borderBottomWidth: 1, borderBottomColor: `${C.cyan}40`,
        paddingVertical: 4, minWidth: 160, textAlign: 'center',
    },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
    },
    roleBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

    adminCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: `${C.pink}08`, borderWidth: 1, borderColor: `${C.pink}25`,
        borderRadius: 18, padding: 16, marginBottom: 20,
    },
    adminIconBox: {
        width: 42, height: 42, borderRadius: 12, backgroundColor: `${C.pink}14`,
        borderWidth: 1, borderColor: `${C.pink}30`, alignItems: 'center', justifyContent: 'center',
    },
    adminCardTitle: { fontSize: 14, fontWeight: '800', color: C.pink },
    adminCardSub: { fontSize: 11, color: C.sub, marginTop: 2 },

    section: {
        backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
        borderRadius: 20, padding: 18, marginBottom: 16,
    },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: C.cyan, letterSpacing: 1.5 },
    sectionDesc: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 4 },

    cvCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
    cvIconBox: {
        width: 42, height: 42, borderRadius: 12, backgroundColor: `${C.cyan}10`,
        borderWidth: 1, borderColor: `${C.cyan}25`, alignItems: 'center', justifyContent: 'center',
    },
    cvTitle: { fontSize: 13, fontWeight: '700', color: C.text },
    cvSub: { fontSize: 11, color: C.sub, marginTop: 2, lineHeight: 15 },
    cvBtn: {
        width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: `${C.cyan}30`,
        backgroundColor: `${C.cyan}08`, alignItems: 'center', justifyContent: 'center',
    },

    fieldLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 1.5 },
    keyInputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(4,12,20,0.7)', borderWidth: 1, borderColor: C.border,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    },
    keyInput: { flex: 1, fontSize: 13, color: C.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },

    saveKeysBtn: {
        marginTop: 18, height: 46, borderRadius: 14, backgroundColor: C.cyan,
        alignItems: 'center', justifyContent: 'center',
    },
    saveKeysBtnText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 1.5 },
});