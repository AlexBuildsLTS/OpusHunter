/**
 * app/(settings)/security.tsx
 * OpusHunter — Security & Password
 * 2026-06-29
 *
 * Change Password flow:
 *   1. Current password (verified via a fresh sign-in call before the update,
 *      since supabase.auth.updateUser doesn't itself re-verify the old password)
 *   2. New password
 *   3. Confirm new password — must match exactly
 *   Submit is disabled until all three are valid and the two new-password
 *   fields match. This satisfies "change password with confirm password,
 *   confirmed two times."
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
    Lock, Eye, EyeOff, CheckCircle2,
    AlertCircle, ShieldCheck, KeyRound,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { AppHeader } from '../../components/layout/AppHeader';

function strengthOf(pw: string) {
    let sc = 0;
    if (pw.length >= 10) sc++;
    if (/[A-Z]/.test(pw)) sc++;
    if (/[0-9]/.test(pw)) sc++;
    if (/[^A-Za-z0-9]/.test(pw)) sc++;
    const map = [
        { label: 'WEAK', color: C.pink }, { label: 'WEAK', color: C.pink },
        { label: 'FAIR', color: C.amber }, { label: 'GOOD', color: C.purple }, { label: 'STRONG', color: C.cyan },
    ] as const;
    return { ...map[sc], score: sc };
}

export default function SecurityScreen() {
    const router = useRouter();

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    const flash = (text: string, ok = true) => {
        setBanner({ ok, text });
        setTimeout(() => setBanner(null), 4000);
    };

    const passwordsMatch = newPw.length > 0 && newPw === confirmPw;
    const newPwValid = newPw.length >= 10;
    const canSubmit = currentPw.length > 0 && newPwValid && passwordsMatch && newPw !== currentPw;

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Not authenticated.');

            // Step 1: re-verify the CURRENT password by attempting a fresh sign-in.
            // supabase.auth.updateUser() does not itself check the old password,
            // so without this step anyone with an active session could change the
            // password without ever knowing the original — this closes that gap.
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPw,
            });
            if (verifyError) throw new Error('Current password is incorrect.');

            // Step 2: apply the new password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
            if (updateError) throw new Error(updateError.message);
        },
        onSuccess: () => {
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            flash('Password updated successfully.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    const strength = strengthOf(newPw);

    return (
        <View style={s.root}>
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { backgroundColor: banner.ok ? `${C.green}15` : `${C.pink}15`, borderColor: banner.ok ? `${C.green}40` : `${C.pink}40` }]}
                >
                    {banner.ok ? <CheckCircle2 size={15} color={C.green} /> : <AlertCircle size={15} color={C.pink} />}
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            <AppHeader title="Security" subtitle="Change your password" />

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.iconWrap}>
                    <ShieldCheck size={26} color={C.cyan} />
                </View>

                <Text style={s.sectionTitle}>CHANGE PASSWORD</Text>
                <Text style={s.sectionDesc}>
                    Enter your current password, then your new password twice to confirm.
                </Text>

                <View style={s.card}>
                    {/* Current password */}
                    <View>
                        <Text style={s.fieldLabel}>CURRENT PASSWORD</Text>
                        <View style={s.inputWrap}>
                            <Lock size={15} color={C.sub} />
                            <TextInput
                                style={s.input}
                                value={currentPw}
                                onChangeText={setCurrentPw}
                                placeholder="Enter current password"
                                placeholderTextColor={C.dim}
                                secureTextEntry={!showCurrent}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                {showCurrent ? <EyeOff size={15} color={C.sub} /> : <Eye size={15} color={C.sub} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* New password */}
                    <View style={{ marginTop: 16 }}>
                        <Text style={s.fieldLabel}>NEW PASSWORD</Text>
                        <View style={s.inputWrap}>
                            <KeyRound size={15} color={C.sub} />
                            <TextInput
                                style={s.input}
                                value={newPw}
                                onChangeText={setNewPw}
                                placeholder="Min. 10 characters"
                                placeholderTextColor={C.dim}
                                secureTextEntry={!showNew}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                {showNew ? <EyeOff size={15} color={C.sub} /> : <Eye size={15} color={C.sub} />}
                            </TouchableOpacity>
                        </View>
                        {newPw.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 4, height: 3, borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                                    {[0, 1, 2, 3].map((i) => (
                                        <View key={i} style={{ flex: 1, borderRadius: 4, backgroundColor: i < strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                                    ))}
                                </View>
                                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: strength.color }}>{strength.label}</Text>
                            </View>
                        )}
                    </View>

                    {/* Confirm new password — second confirmation, as requested */}
                    <View style={{ marginTop: 16 }}>
                        <Text style={s.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                        <View style={[s.inputWrap, confirmPw.length > 0 && !passwordsMatch && { borderColor: `${C.pink}45` }]}>
                            <KeyRound size={15} color={C.sub} />
                            <TextInput
                                style={s.input}
                                value={confirmPw}
                                onChangeText={setConfirmPw}
                                placeholder="Re-enter new password"
                                placeholderTextColor={C.dim}
                                secureTextEntry={!showConfirm}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                {showConfirm ? <EyeOff size={15} color={C.sub} /> : <Eye size={15} color={C.sub} />}
                            </TouchableOpacity>
                        </View>
                        {confirmPw.length > 0 && !passwordsMatch && (
                            <Text style={{ fontSize: 11, color: C.pink, marginTop: 6, fontWeight: '600' }}>Passwords do not match.</Text>
                        )}
                        {passwordsMatch && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <CheckCircle2 size={12} color={C.green} />
                                <Text style={{ fontSize: 11, color: C.green, fontWeight: '600' }}>Passwords match.</Text>
                            </View>
                        )}
                        {newPw.length > 0 && newPw === currentPw && (
                            <Text style={{ fontSize: 11, color: C.amber, marginTop: 6, fontWeight: '600' }}>New password must differ from current password.</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={() => changePasswordMutation.mutate()}
                        disabled={!canSubmit || changePasswordMutation.isPending}
                        style={[s.submitBtn, (!canSubmit || changePasswordMutation.isPending) && { opacity: 0.5 }]}
                        activeOpacity={0.85}
                    >
                        {changePasswordMutation.isPending
                            ? <ActivityIndicator color="#000" />
                            : <Text style={s.submitBtnText}>UPDATE PASSWORD</Text>}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
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

    scroll: { paddingHorizontal: 20, maxWidth: 520, width: '100%', alignSelf: 'center' as any, alignItems: 'center' },
    iconWrap: {
        width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: `${C.cyan}40`,
        backgroundColor: `${C.cyan}10`, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: 1.5 },
    sectionDesc: { fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 18, paddingHorizontal: 20 },

    card: { width: '100%', backgroundColor: 'rgba(8,16,24,0.88)', borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 20 },
    fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.cyan, marginBottom: 6 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(4,12,20,0.75)', borderWidth: 1, borderColor: C.border, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    input: { flex: 1, fontSize: 14, color: C.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },

    submitBtn: { marginTop: 22, height: 50, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 1.5 },
});