/**
 * app/(tabs)/profile.tsx
 * OpusHunter — Profile Screen
 * 2026-07-01 — Rebuilt on the shared design system.
 *
 * Changes from the previous version:
 *   - Fixed the crash: imported `MobileHeader` from a file that didn't
 *     exist anywhere in the repo. Now uses the real `AppHeader`.
 *   - Every section is now a `GlassCard` instead of a hand-rolled
 *     StyleSheet card with its own hex values — this is what makes the
 *     bento look consistent instead of screen-specific.
 *   - Avatar upload is now real: taps the avatar → expo-image-picker →
 *     uploads to the new `avatars` bucket (see
 *     supabase/migrations/20260701_avatars_bucket.sql) → updates
 *     profiles.avatar_url. Previously there was no upload path at all and
 *     no bucket for it to go to.
 *   - NativeWind (`className`) is used for layout/spacing/color everywhere
 *     Tailwind can express it; inline style is reserved for things
 *     NativeWind genuinely can't do cross-platform (e.g. removing the web
 *     text-input outline).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
    Mail, FileText, Upload, CheckCircle2, AlertCircle,
    Shield, Key, Eye, EyeOff, Sparkles, ChevronRight, Pencil, Camera,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import { C, ROLE_CFG, type RoleName } from '../../lib/theme';
import { PageContainer } from '../../components/layout/PageContainer';
import { GlassCard } from '../../components/ui/GlassCard';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function maskKey(key: string | null): string {
    if (!key || key.length < 8) return '';
    return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
}

// ── Small shared bits ────────────────────────────────────────────────────────

function Banner({ banner }: { banner: { ok: boolean; text: string } | null }) {
    if (!banner) return null;
    return (
        <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutUp.duration(200)}
            className="mb-4 flex-row items-center gap-2 rounded-2xl border px-4 py-2.5"
            style={{
                borderColor: banner.ok ? `${C.green}40` : `${C.pink}40`,
                backgroundColor: banner.ok ? `${C.green}0F` : `${C.pink}0F`,
            }}
        >
            {banner.ok ? <CheckCircle2 size={14} color={C.green} /> : <AlertCircle size={14} color={C.pink} />}
            <Text className="flex-1 text-[13px] font-semibold" style={{ color: banner.ok ? C.green : C.pink }}>
                {banner.text}
            </Text>
        </Animated.View>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Text className="mb-3 text-[11px] font-extrabold tracking-widest" style={{ color: C.cyan }}>
            {children}
        </Text>
    );
}

const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {};

export default function ProfileScreen() {
    const router = useRouter();
    const qc = useQueryClient();

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [geminiInput, setGeminiInput] = useState('');
    const [rapidInput, setRapidInput] = useState('');
    const [showGemini, setShowGemini] = useState(false);
    const [showRapid, setShowRapid] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
    const [uploadingCv, setUploadingCv] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

    const role = (profile?.role ?? 'member') as RoleName;
    const roleCfg = ROLE_CFG[role];

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
            flash('API keys saved.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    // ── Avatar upload — new: previously there was no bucket to upload to ────
    const handleAvatarUpload = useCallback(async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                flash('Photo library permission is required.', false);
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setUploadingAvatar(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');

            const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
            const path = `${user.id}/avatar.${ext}`;

            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
            // Cache-bust so the new image shows immediately even though the path is stable.
            const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ avatar_url: bustedUrl })
                .eq('id', user.id);
            if (dbError) throw dbError;

            qc.invalidateQueries({ queryKey: ['my_profile_full'] });
            flash('Profile picture updated.');
        } catch (e: any) {
            flash(e.message ?? 'Upload failed.', false);
        } finally {
            setUploadingAvatar(false);
        }
    }, [qc]);

    // ── CV upload ────────────────────────────────────────────────────────────
    const handleCvUpload = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setUploadingCv(true);

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
            setUploadingCv(false);
        }
    }, [qc]);

    if (isLoading) {
        return (
            <PageContainer width="panel">
                <View className="items-center justify-center flex-1">
                    <ActivityIndicator color={C.cyan} size="large" />
                </View>
            </PageContainer>
        );
    }

    return (
        <PageContainer width="panel">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <Banner banner={banner} />

                {/* ── Avatar + role ── */}
                <Animated.View entering={FadeInDown.delay(40).springify()}>
                    <GlassCard tint={role === 'admin' ? 'pink' : role === 'premium' ? 'amber' : 'purple'} className="items-center mb-4">
                        <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar} activeOpacity={0.85}>
                            <View className="items-center justify-center w-24 h-24 overflow-hidden border-2 rounded-full" style={{ borderColor: `${roleCfg.color}50` }}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator color={roleCfg.color} />
                                ) : profile?.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                ) : (
                                    <Text className="text-3xl font-extrabold" style={{ color: roleCfg.color }}>{initials}</Text>
                                )}
                            </View>
                            <View
                                className="absolute items-center justify-center w-8 h-8 border-2 rounded-full -bottom-1 -right-1"
                                style={{ borderColor: C.core, backgroundColor: C.cyan }}
                            >
                                <Camera size={14} color="#020507" />
                            </View>
                        </TouchableOpacity>

                        {editingName ? (
                            <View className="flex-row items-center gap-2 mt-4">
                                <TextInput
                                    className="min-w-[160px] border-b pb-1 text-center text-base font-bold"
                                    style={{ color: C.text, borderColor: `${C.cyan}40`, ...webNoOutline }}
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
                            <TouchableOpacity onPress={() => setEditingName(true)} className="flex-row items-center gap-2 mt-4" activeOpacity={0.7}>
                                <Text className="text-lg font-extrabold" style={{ color: C.text }}>{profile?.full_name || 'Add your name'}</Text>
                                <Pencil size={13} color={C.sub} />
                            </TouchableOpacity>
                        )}

                        <View className="mt-1.5 flex-row items-center gap-1.5">
                            <Mail size={12} color={C.sub} />
                            <Text className="text-xs" style={{ color: C.sub }}>{profile?.email}</Text>
                        </View>

                        <View
                            className="mt-3 flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5"
                            style={{ borderColor: `${roleCfg.color}40`, backgroundColor: roleCfg.bg }}
                        >
                            <Shield size={11} color={roleCfg.color} />
                            <Text className="text-[11px] font-black tracking-widest" style={{ color: roleCfg.color }}>{roleCfg.label}</Text>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ── Admin shortcut ── */}
                {role === 'admin' && (
                    <Animated.View entering={FadeInDown.delay(80).springify()}>
                        <TouchableOpacity onPress={() => router.push('/(admin)/' as any)} activeOpacity={0.85}>
                            <GlassCard tint="pink" padding="sm" className="mb-4 flex-row items-center gap-3.5">
                                <View className="items-center justify-center border h-11 w-11 rounded-xl" style={{ backgroundColor: `${C.pink}14`, borderColor: `${C.pink}30` }}>
                                    <Shield size={18} color={C.pink} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-extrabold" style={{ color: C.pink }}>Admin Core</Text>
                                    <Text className="mt-0.5 text-[11px]" style={{ color: C.sub }}>Manage users, roles, and system API keys</Text>
                                </View>
                                <ChevronRight size={18} color={C.pink} />
                            </GlassCard>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── CV / Resume ── */}
                <Animated.View entering={FadeInDown.delay(120).springify()}>
                    <GlassCard padding="md" className="mb-4">
                        <SectionTitle>RESUME / CV</SectionTitle>
                        <View className="flex-row items-center gap-3.5">
                            <View className="items-center justify-center border h-11 w-11 rounded-xl" style={{ backgroundColor: `${C.cyan}10`, borderColor: `${C.cyan}25` }}>
                                <FileText size={20} color={C.cyan} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[13px] font-bold" style={{ color: C.text }}>
                                    {profile?.cv_storage_path ? 'CV on file' : 'No CV uploaded'}
                                </Text>
                                <Text className="mt-0.5 text-[11px] leading-4" style={{ color: C.sub }}>
                                    {profile?.cv_storage_path
                                        ? 'Used to tailor auto-generated cover letters.'
                                        : 'Upload a PDF or Word doc to improve match scoring.'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleCvUpload}
                                disabled={uploadingCv}
                                activeOpacity={0.8}
                                className="items-center justify-center w-10 h-10 border rounded-xl"
                                style={{ borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}08` }}
                            >
                                {uploadingCv ? <ActivityIndicator size="small" color={C.cyan} /> : <Upload size={15} color={C.cyan} />}
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ── BYOK: Bring Your Own Key ── */}
                <Animated.View entering={FadeInDown.delay(160).springify()}>
                    <GlassCard tint="amber" padding="md">
                        <View className="flex-row items-center gap-2 mb-3">
                            <SectionTitle>BRING YOUR OWN KEY (BYOK)</SectionTitle>
                            <Sparkles size={13} color={C.amber} />
                        </View>
                        <Text className="text-xs leading-[18px]" style={{ color: C.sub }}>
                            Add your own Gemini or RapidAPI key for unlimited scraping and AI cover letters.
                            Leave blank to use the shared system fallback (rate-limited).
                        </Text>

                        {/* Gemini key */}
                        <View className="mt-3.5">
                            <View className="mb-1.5 flex-row items-center gap-1.5">
                                <Key size={12} color={C.purple} />
                                <Text className="text-[10px] font-bold tracking-widest" style={{ color: C.sub }}>GEMINI API KEY</Text>
                            </View>
                            <View className="flex-row items-center gap-2.5 rounded-xl border px-3.5 py-3" style={{ backgroundColor: 'rgba(4,12,20,0.7)', borderColor: C.border }}>
                                <TextInput
                                    className="flex-1 text-[13px]"
                                    style={{ color: C.text, ...webNoOutline }}
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
                        <View className="mt-3.5">
                            <View className="mb-1.5 flex-row items-center gap-1.5">
                                <Key size={12} color={C.cyan} />
                                <Text className="text-[10px] font-bold tracking-widest" style={{ color: C.sub }}>RAPIDAPI KEY (JSearch)</Text>
                            </View>
                            <View className="flex-row items-center gap-2.5 rounded-xl border px-3.5 py-3" style={{ backgroundColor: 'rgba(4,12,20,0.7)', borderColor: C.border }}>
                                <TextInput
                                    className="flex-1 text-[13px]"
                                    style={{ color: C.text, ...webNoOutline }}
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
                            activeOpacity={0.85}
                            className="mt-4 h-[46px] items-center justify-center rounded-2xl"
                            style={{ backgroundColor: C.cyan, opacity: (!geminiInput.trim() && !rapidInput.trim()) ? 0.5 : 1 }}
                        >
                            {saveKeysMutation.isPending
                                ? <ActivityIndicator color="#000" size="small" />
                                : <Text className="text-xs font-black tracking-widest text-black">SAVE KEYS</Text>}
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>
            </ScrollView>
        </PageContainer>
    );
}