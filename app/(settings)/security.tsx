/**
 * app/(settings)/security.tsx
 * OpusHunter — Security Settings
 * 2026-06-28
 *
 * - Change password via supabase.auth.updateUser
 * - Sign out of all other sessions
 * - Navigation: router.replace back to /(settings) not router.back()
 */

import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, LogOut } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const C = {
    cyan: '#00D4FF', purple: '#7B5EA7', pink: '#E8436A',
    green: '#00C67D', amber: '#F59E0B',
    bg: '#0A1419', border: 'rgba(120,200,240,0.09)',
    text: '#D8E4EC', sub: 'rgba(216,228,236,0.45)',
};

function PwField({ label, value, onChange, placeholder }: {
    label: string; value: string;
    onChange: (v: string) => void; placeholder: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            <View style={s.fieldRow}>
                <Lock size={16} color="#64748B" />
                <TextInput style={s.fieldInput} value={value} onChangeText={onChange}
                    placeholder={placeholder} placeholderTextColor="#3D4A55"
                    secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
                    {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})} />
                <TouchableOpacity onPress={() => setShow(p => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {show ? <EyeOff size={15} color={C.sub} /> : <Eye size={15} color={C.sub} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function SecurityScreen() {
    const router = useRouter();
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [loading, setLoading] = useState(false);
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    const goBack = () => router.replace('/(settings)');

    const handleChangePassword = async () => {
        if (!newPw || newPw.length < 10) {
            setBanner({ ok: false, text: 'New password must be at least 10 characters.' });
            return;
        }
        if (newPw !== confirmPw) {
            setBanner({ ok: false, text: 'Passwords do not match.' });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPw });
        setLoading(false);
        if (error) {
            setBanner({ ok: false, text: error.message });
        } else {
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setBanner({ ok: true, text: 'Password updated successfully.' });
        }
    };

    const handleSignOutAll = async () => {
        setLoading(true);
        await supabase.auth.signOut({ scope: 'global' });
        router.replace('/(auth)/login');
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {/* Header */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={s.header}>
                    <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={16} color={C.cyan} />
                        <Text style={s.backText}>Settings</Text>
                    </TouchableOpacity>
                    <Text style={s.pageTitle}>Security</Text>
                    <View style={{ width: 70 }} />
                </Animated.View>

                {/* Banner */}
                {banner && (
                    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                        style={[s.banner, { borderColor: banner.ok ? `${C.cyan}30` : `${C.pink}30`, backgroundColor: banner.ok ? `${C.cyan}08` : `${C.pink}08` }]}>
                        {banner.ok ? <CheckCircle2 size={14} color={C.cyan} /> : <AlertCircle size={14} color={C.pink} />}
                        <Text style={[s.bannerText, { color: banner.ok ? C.cyan : C.pink }]}>{banner.text}</Text>
                    </Animated.View>
                )}

                {/* Change password */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={s.card}>
                    <Text style={s.cardTitle}>Change Password</Text>
                    <Text style={s.cardSub}>Minimum 10 characters.</Text>
                    <PwField label="NEW PASSWORD" value={newPw} onChange={setNewPw} placeholder="Min. 10 characters" />
                    <PwField label="CONFIRM NEW PASSWORD" value={confirmPw} onChange={setConfirmPw} placeholder="Re-enter new password" />
                    <TouchableOpacity onPress={handleChangePassword} disabled={loading || !newPw || !confirmPw}
                        style={[s.saveBtn, (!newPw || !confirmPw || loading) && { opacity: 0.45 }]} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>Update Password</Text>}
                    </TouchableOpacity>
                </Animated.View>

                {/* Sessions */}
                <Animated.View entering={FadeInDown.delay(160).springify()} style={s.card}>
                    <Text style={s.cardTitle}>Sessions</Text>
                    <Text style={s.cardSub}>Sign out of all devices. You will be redirected to login.</Text>
                    <TouchableOpacity onPress={handleSignOutAll} disabled={loading}
                        style={s.signOutAllBtn} activeOpacity={0.75}>
                        <LogOut size={15} color={C.pink} />
                        <Text style={s.signOutAllText}>Sign Out All Devices</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingTop: Platform.OS === 'web' ? 40 : 56, paddingHorizontal: 20, paddingBottom: 100, maxWidth: 600, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 70 },
    backText: { fontSize: 13, color: C.cyan, fontWeight: '600' },
    pageTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
    card: { backgroundColor: 'rgba(11,24,34,0.9)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(120,200,240,0.09)', padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 },
    cardSub: { fontSize: 11, color: C.sub, marginBottom: 18, lineHeight: 16 },
    fieldLabel: { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(120,200,240,0.1)', borderRadius: 14, paddingHorizontal: 14, height: 52 },
    fieldInput: { flex: 1, fontSize: 14, color: C.text, height: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
    saveBtn: { height: 52, borderRadius: 14, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    saveBtnText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1 },
    signOutAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1, borderColor: `${C.pink}35`, backgroundColor: `${C.pink}08` },
    signOutAllText: { fontSize: 13, fontWeight: '700', color: C.pink },
});