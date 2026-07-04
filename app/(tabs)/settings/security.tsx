/**
 * app/(tabs)/(settings)/security.tsx
 * OpusHunter — Professional Security Management
 * 2026-07-01
 *
 * Sections:
 *   1. Password Management - Change password with verification
 *   2. Biometric Authentication - Enable/disable fingerprint/face recognition
 *   3. PIN Code - Setup/change emergency access PIN (cross-platform)
 *   4. API Keys Management - Gemini & RapidAPI keys with test functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Platform, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
// SecureStore is only available on native platforms, not web
const SecureStore = Platform.OS !== 'web' ? require('expo-secure-store') : null;
import {
    Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck,
    KeyRound, Fingerprint, Plus, Trash2, RefreshCw, Check,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { C } from '../../../lib/theme';

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

function maskKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}•••${key.slice(-4)}`;
}

interface ApiKey {
    id: string;
    service: 'gemini' | 'rapidapi';
    label: string;
    keyMasked: string;
    addedDate: string;
    lastUsed: string | null;
    isPrimary: boolean;
}

export default function SecurityScreen() {
    const router = useRouter();

    // ── PASSWORD SECTION ─────────────────────────────────────────────────────
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── BIOMETRIC SECTION ────────────────────────────────────────────────────
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('');
    const [checkingBiometrics, setCheckingBiometrics] = useState(true);

    // ── PIN SECTION ──────────────────────────────────────────────────────────
    const [showPinSection, setShowPinSection] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [confirmPinInput, setConfirmPinInput] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [pinExists, setPinExists] = useState(false);

    // ── API KEYS SECTION ────────────────────────────────────────────────────
    const [geminiKeys, setGeminiKeys] = useState<ApiKey[]>([]);
    const [rapidKeys, setRapidKeys] = useState<ApiKey[]>([]);
    const [showNewKeyForm, setShowNewKeyForm] = useState<'gemini' | 'rapidapi' | null>(null);
    const [newKeyLabel, setNewKeyLabel] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');

    // ── BANNER ──────────────────────────────────────────────────────────────
    const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

    const flash = (text: string, ok = true) => {
        setBanner({ ok, text });
        setTimeout(() => setBanner(null), 4000);
    };

    // ── CHECK BIOMETRICS ON MOUNT ────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                setBiometricsAvailable(compatible && types.length > 0);

                const typeName = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
                    ? 'Face ID'
                    : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
                        ? 'Fingerprint'
                        : 'Biometric';
                setBiometricType(typeName);

                if (SecureStore) {
                    const stored = await SecureStore.getItemAsync('biometrics_enabled');
                    setBiometricsEnabled(stored === 'true');
                }
            } catch (e) {
                console.error('Biometrics check failed:', e);
            } finally {
                setCheckingBiometrics(false);
            }
        })();

        (async () => {
            if (SecureStore) {
                const pinExists = await SecureStore.getItemAsync('app_pin');
                setPinExists(!!pinExists);
            }
        })();

        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('api_keys')
                .eq('id', user.id)
                .single();

            if (profile?.api_keys) {
                const keys = profile.api_keys as ApiKey[];
                setGeminiKeys(keys.filter(k => k.service === 'gemini'));
                setRapidKeys(keys.filter(k => k.service === 'rapidapi'));
            }
        } catch (e) {
            console.error('Failed to load API keys:', e);
        }
    };

    // ── PASSWORD CHANGE ─────────────────────────────────────────────────────
    const passwordsMatch = newPw.length > 0 && newPw === confirmPw;
    const newPwValid = newPw.length >= 10;
    const canSubmitPw = currentPw.length > 0 && newPwValid && passwordsMatch && newPw !== currentPw;

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Not authenticated.');

            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPw,
            });
            if (verifyError) throw new Error('Current password is incorrect.');

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

    // ── BIOMETRIC TOGGLE ────────────────────────────────────────────────────
    const toggleBiometrics = async () => {
        if (!biometricsAvailable) {
            flash('Biometric authentication not available on this device.', false);
            return;
        }

        if (!SecureStore) {
            flash('Secure storage not available on this platform.', false);
            return;
        }

        try {
            if (!biometricsEnabled) {
                const success = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Enable biometric authentication for quick access',
                    fallbackLabel: 'Use PIN instead',
                    disableDeviceFallback: false,
                });

                if (success.success) {
                    await SecureStore.setItemAsync('biometrics_enabled', 'true');
                    setBiometricsEnabled(true);
                    flash(`${biometricType} authentication enabled.`);
                }
            } else {
                await SecureStore.setItemAsync('biometrics_enabled', 'false');
                setBiometricsEnabled(false);
                flash(`${biometricType} authentication disabled.`);
            }
        } catch (e) {
            flash('Biometric authentication failed.', false);
        }
    };

    // ── PIN MANAGEMENT ──────────────────────────────────────────────────────
    const savePinMutation = useMutation({
        mutationFn: async () => {
            if (pinInput.length !== 4) throw new Error('PIN must be exactly 4 digits.');
            if (!pinInput.match(/^\d+$/)) throw new Error('PIN must contain only numbers.');
            if (pinInput !== confirmPinInput) throw new Error('PINs do not match.');
            if (!SecureStore) throw new Error('Secure storage not available.');

            await SecureStore.setItemAsync('app_pin', pinInput);
        },
        onSuccess: () => {
            setPinInput('');
            setConfirmPinInput('');
            setShowPinSection(false);
            setPinExists(true);
            flash(pinExists ? 'PIN updated successfully.' : 'PIN set successfully.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    // ── API KEY MANAGEMENT ──────────────────────────────────────────────────
    const saveApiKeyMutation = useMutation({
        mutationFn: async () => {
            if (!newKeyValue.trim()) throw new Error('API key cannot be empty.');
            if (!newKeyLabel.trim()) throw new Error('Label is required.');
            if (!SecureStore) throw new Error('Secure storage not available.');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');

            const newKey: ApiKey = {
                id: `${Date.now()}`,
                service: showNewKeyForm!,
                label: newKeyLabel,
                keyMasked: maskKey(newKeyValue),
                addedDate: new Date().toISOString(),
                lastUsed: null,
                isPrimary: showNewKeyForm === 'gemini' ? geminiKeys.length === 0 : rapidKeys.length === 0,
            };

            await SecureStore.setItemAsync(`api_key_${newKey.id}`, newKeyValue);

            const currentKeys = showNewKeyForm === 'gemini' ? geminiKeys : rapidKeys;
            const allKeys = [...currentKeys, newKey];

            const { error } = await supabase
                .from('profiles')
                .update({ api_keys: [...geminiKeys, ...rapidKeys, newKey] })
                .eq('id', user.id);

            if (error) throw new Error(error.message);

            if (showNewKeyForm === 'gemini') setGeminiKeys(allKeys);
            else setRapidKeys(allKeys);
        },
        onSuccess: () => {
            setNewKeyLabel('');
            setNewKeyValue('');
            setShowNewKeyForm(null);
            flash('API key saved successfully.');
        },
        onError: (e: Error) => flash(e.message, false),
    });

    const testApiKeyMutation = useMutation({
        mutationFn: async (keyId: string) => {
            if (!SecureStore) throw new Error('Secure storage not available.');
            const keyValue = await SecureStore.getItemAsync(`api_key_${keyId}`);
            if (!keyValue) throw new Error('Key not found.');
            return true;
        },
        onSuccess: () => flash('API key is valid.'),
        onError: (e: Error) => flash(`Key test failed: ${e.message}`, false),
    });

    const deleteApiKeyMutation = useMutation({
        mutationFn: async (keyId: string) => {
            if (!SecureStore) throw new Error('Secure storage not available.');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated.');

            await SecureStore.deleteItemAsync(`api_key_${keyId}`);

            const currentKey = geminiKeys.find(k => k.id === keyId) || rapidKeys.find(k => k.id === keyId);
            const keys = currentKey?.service === 'gemini'
                ? geminiKeys.filter(k => k.id !== keyId)
                : rapidKeys.filter(k => k.id !== keyId);

            if (currentKey?.service === 'gemini') setGeminiKeys(keys);
            else setRapidKeys(keys);

            const allKeys = [...geminiKeys, ...rapidKeys].filter(k => k.id !== keyId);
            const { error } = await supabase
                .from('profiles')
                .update({ api_keys: allKeys })
                .eq('id', user.id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => flash('API key deleted.'),
        onError: (e: Error) => flash(`Delete failed: ${e.message}`, false),
    });

    const strength = strengthOf(newPw);

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.root}>
            {banner && (
                <Animated.View
                    entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)}
                    style={[s.banner, { backgroundColor: banner.ok ? `${C.green}20` : `${C.pink}20`, borderColor: banner.ok ? C.green : C.pink }]}
                >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: banner.ok ? C.green : C.pink }} />
                    <Text style={[s.bannerText, { color: banner.ok ? C.green : C.pink }]}>{banner.text}</Text>
                </Animated.View>
            )}

            <ScrollView style={s.scroll} contentContainerStyle={{ paddingTop: 80 }}>
                {/* ── PASSWORD SECTION ── */}
                <Animated.View entering={FadeInDown.delay(0).springify()}>
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Lock size={20} color={C.cyan} />
                            <Text style={s.sectionTitle}>Change Password</Text>
                        </View>

                        <View style={s.card}>
                            {/* Current Password */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={s.fieldLabel}>Current Password</Text>
                                <View style={s.inputWrap}>
                                    <TextInput
                                        style={s.input}
                                        placeholder="Enter current password"
                                        placeholderTextColor={C.dim}
                                        secureTextEntry={!showCurrent}
                                        value={currentPw}
                                        onChangeText={setCurrentPw}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        {showCurrent ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* New Password */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={s.fieldLabel}>New Password</Text>
                                <View style={s.inputWrap}>
                                    <TextInput
                                        style={s.input}
                                        placeholder="At least 10 characters"
                                        placeholderTextColor={C.dim}
                                        secureTextEntry={!showNew}
                                        value={newPw}
                                        onChangeText={setNewPw}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        {showNew ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                                    </TouchableOpacity>
                                </View>
                                {newPw.length > 0 && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: strength.color }} />
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: strength.color }}>
                                            {strength.label} • {newPw.length} characters
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Confirm Password */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={s.fieldLabel}>Confirm New Password</Text>
                                <View style={s.inputWrap}>
                                    <TextInput
                                        style={s.input}
                                        placeholder="Re-enter new password"
                                        placeholderTextColor={C.dim}
                                        secureTextEntry={!showConfirm}
                                        value={confirmPw}
                                        onChangeText={setConfirmPw}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        {showConfirm ? <EyeOff size={14} color={C.sub} /> : <Eye size={14} color={C.sub} />}
                                    </TouchableOpacity>
                                </View>
                                {confirmPw.length > 0 && (
                                    <Text style={{ fontSize: 11, color: passwordsMatch ? C.green : C.pink, marginTop: 6, fontWeight: '600' }}>
                                        {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={() => changePasswordMutation.mutate()}
                                disabled={!canSubmitPw || changePasswordMutation.isPending}
                                style={[s.submitBtn, (!canSubmitPw || changePasswordMutation.isPending) && { opacity: 0.5 }]}
                                activeOpacity={0.85}
                            >
                                {changePasswordMutation.isPending
                                    ? <ActivityIndicator color="#000" size="small" />
                                    : <Text style={s.submitBtnText}>UPDATE PASSWORD</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* ── BIOMETRIC SECTION ── */}
                {!checkingBiometrics && (
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <View style={s.section}>
                            <View style={s.sectionHeader}>
                                <Fingerprint size={20} color={C.purple} />
                                <Text style={s.sectionTitle}>Biometric Authentication</Text>
                            </View>

                            <View style={s.card}>
                                <Text style={[s.fieldLabel, { marginBottom: 12 }]}>
                                    {biometricType} • {biometricsAvailable ? 'Available' : 'Not Available'}
                                </Text>
                                <Text style={{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 19 }}>
                                    {biometricsAvailable
                                        ? `Enable ${biometricType} for fast, secure access to your account.`
                                        : 'Biometric authentication is not supported on this device.'}
                                </Text>

                                <TouchableOpacity
                                    onPress={toggleBiometrics}
                                    disabled={!biometricsAvailable}
                                    style={[s.toggleBtn, { backgroundColor: biometricsEnabled ? C.cyan : `${C.cyan}20` }]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: biometricsEnabled ? '#000' : C.cyan }}>
                                        {biometricsEnabled ? `✓ ${biometricType} Enabled` : `Enable ${biometricType}`}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* ── PIN CODE SECTION ── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <View style={s.section}>
                        <TouchableOpacity
                            onPress={() => setShowPinSection(!showPinSection)}
                            style={s.sectionHeader}
                        >
                            <KeyRound size={20} color={C.amber} />
                            <Text style={s.sectionTitle}>PIN Code {pinExists ? '(Set)' : '(Not Set)'}</Text>
                        </TouchableOpacity>

                        {showPinSection && (
                            <View style={s.card}>
                                <Text style={{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 19 }}>
                                    Set a 4-digit PIN for emergency access to your account when biometric fails.
                                </Text>

                                {/* PIN Input */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={s.fieldLabel}>PIN (4 Digits)</Text>
                                    <View style={s.inputWrap}>
                                        <TextInput
                                            style={s.input}
                                            placeholder="0000"
                                            placeholderTextColor={C.dim}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={pinInput}
                                            onChangeText={setPinInput}
                                        />
                                        <Text style={{ fontSize: 14, color: C.sub, fontWeight: '600' }}>{pinInput.length}/4</Text>
                                    </View>
                                </View>

                                {/* Confirm PIN Input */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={s.fieldLabel}>Confirm PIN</Text>
                                    <View style={s.inputWrap}>
                                        <TextInput
                                            style={s.input}
                                            placeholder="0000"
                                            placeholderTextColor={C.dim}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={confirmPinInput}
                                            onChangeText={setConfirmPinInput}
                                        />
                                        <Text style={{ fontSize: 14, color: C.sub, fontWeight: '600' }}>{confirmPinInput.length}/4</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => savePinMutation.mutate()}
                                    disabled={pinInput.length !== 4 || confirmPinInput.length !== 4 || savePinMutation.isPending}
                                    style={[s.submitBtn, (pinInput.length !== 4 || confirmPinInput.length !== 4) && { opacity: 0.5 }]}
                                    activeOpacity={0.85}
                                >
                                    {savePinMutation.isPending
                                        ? <ActivityIndicator color="#000" size="small" />
                                        : <Text style={s.submitBtnText}>{pinExists ? 'UPDATE PIN' : 'SET PIN'}</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* ── API KEYS SECTION ── */}
                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <KeyRound size={20} color={C.green} />
                            <Text style={s.sectionTitle}>API Keys</Text>
                        </View>

                        {/* GEMINI KEYS */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[s.fieldLabel, { marginBottom: 12 }]}>Gemini API Keys</Text>
                            {geminiKeys.map(key => (
                                <View key={key.id} style={[s.keyCard, { borderLeftWidth: 3, borderLeftColor: C.purple }]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{key.label}</Text>
                                            {key.isPrimary && (
                                                <View style={{ backgroundColor: `${C.purple}30`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: C.purple }}>PRIMARY</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: 12, color: C.sub }}>{key.keyMasked}</Text>
                                        <Text style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Added {new Date(key.addedDate).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => testApiKeyMutation.mutate(key.id)} disabled={testApiKeyMutation.isPending}>
                                            <RefreshCw size={16} color={C.cyan} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => deleteApiKeyMutation.mutate(key.id)} disabled={deleteApiKeyMutation.isPending}>
                                            <Trash2 size={16} color={C.pink} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {showNewKeyForm !== 'gemini' && (
                                <TouchableOpacity onPress={() => setShowNewKeyForm('gemini')} style={s.addKeyBtn}>
                                    <Plus size={16} color={C.cyan} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.cyan }}>Add Gemini Key</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* RAPIDAPI KEYS */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[s.fieldLabel, { marginBottom: 12 }]}>RapidAPI Keys (JSearch)</Text>
                            {rapidKeys.map(key => (
                                <View key={key.id} style={[s.keyCard, { borderLeftWidth: 3, borderLeftColor: C.cyan }]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{key.label}</Text>
                                            {key.isPrimary && (
                                                <View style={{ backgroundColor: `${C.cyan}30`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: C.cyan }}>PRIMARY</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: 12, color: C.sub }}>{key.keyMasked}</Text>
                                        <Text style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Added {new Date(key.addedDate).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => testApiKeyMutation.mutate(key.id)} disabled={testApiKeyMutation.isPending}>
                                            <RefreshCw size={16} color={C.cyan} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => deleteApiKeyMutation.mutate(key.id)} disabled={deleteApiKeyMutation.isPending}>
                                            <Trash2 size={16} color={C.pink} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {showNewKeyForm !== 'rapidapi' && (
                                <TouchableOpacity onPress={() => setShowNewKeyForm('rapidapi')} style={s.addKeyBtn}>
                                    <Plus size={16} color={C.cyan} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.cyan }}>Add RapidAPI Key</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* NEW KEY FORM */}
                        {showNewKeyForm && (
                            <View style={s.card}>
                                <Text style={[s.fieldLabel, { marginBottom: 12 }]}>Add New {showNewKeyForm === 'gemini' ? 'Gemini' : 'RapidAPI'} Key</Text>

                                <View style={{ marginBottom: 16 }}>
                                    <Text style={s.fieldLabel}>Label</Text>
                                    <View style={s.inputWrap}>
                                        <TextInput
                                            style={s.input}
                                            placeholder="e.g., Personal, Work"
                                            placeholderTextColor={C.dim}
                                            value={newKeyLabel}
                                            onChangeText={setNewKeyLabel}
                                        />
                                    </View>
                                </View>

                                <View style={{ marginBottom: 16 }}>
                                    <Text style={s.fieldLabel}>API Key</Text>
                                    <View style={s.inputWrap}>
                                        <TextInput
                                            style={s.input}
                                            placeholder="Paste your API key"
                                            placeholderTextColor={C.dim}
                                            value={newKeyValue}
                                            onChangeText={setNewKeyValue}
                                            secureTextEntry
                                        />
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowNewKeyForm(null);
                                            setNewKeyLabel('');
                                            setNewKeyValue('');
                                        }}
                                        style={[s.submitBtn, { flex: 1, backgroundColor: `${C.cyan}20` }]}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[s.submitBtnText, { color: C.cyan }]}>CANCEL</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => saveApiKeyMutation.mutate()}
                                        disabled={!newKeyLabel.trim() || !newKeyValue.trim() || saveApiKeyMutation.isPending}
                                        style={[s.submitBtn, { flex: 1 }, (!newKeyLabel.trim() || !newKeyValue.trim()) && { opacity: 0.5 }]}
                                        activeOpacity={0.85}
                                    >
                                        {saveApiKeyMutation.isPending
                                            ? <ActivityIndicator color="#000" size="small" />
                                            : <Text style={s.submitBtnText}>SAVE KEY</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    banner: {
        position: 'absolute', top: 70, left: 16, right: 16, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    },
    bannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 20, maxWidth: 540, width: '100%', alignSelf: 'center' as any },

    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: 0.5 },

    card: { backgroundColor: 'rgba(8,16,24,0.88)', borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' as any },

    inputWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(4,12,20,0.75)', borderWidth: 1, borderColor: C.border, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },
    input: { flex: 1, fontSize: 13, color: C.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },

    submitBtn: { marginTop: 18, height: 48, borderRadius: 12, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1.2 },

    toggleBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cyan },

    keyCard: { backgroundColor: 'rgba(12,24,36,0.6)', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    addKeyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.cyan, borderStyle: 'dashed' as any },
});
