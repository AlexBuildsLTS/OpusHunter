/**
 * app/(auth)/login.tsx
 * OpusHunter — Authentication Screen
 *
 * Completely self-contained. No external AuthForm component required.
 *
 * Features:
 *   - Desktop (≥768px): Side-by-side layout (form left, feature cards right)
 *   - Mobile / APK / iOS: Single-column scroll, full-width form
 *   - Google OAuth (prepared, wired to supabase provider: 'google')
 *   - Email + Password sign-in and sign-up
 *   - Terms of Service modal (scroll-to-accept)
 *   - Password strength meter
 *   - Animated ambient background (Reanimated v4 worklets)
 *   - Fully typed, zero inline `any` in component logic
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeInDown,
    FadeInRight,
    FadeOutUp,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSpring,
    interpolate,
    interpolateColor,
    Easing,
    useFrameCallback,
    runOnJS,
} from 'react-native-reanimated';
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Circle,
    Fingerprint,
    ShieldCheck,
    X,
    Radar,
    Zap,
    Briefcase,
    Shield,
    Twitter,
    Linkedin,
    Github,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === 'web';

WebBrowser.maybeCompleteAuthSession();

const T = {
    cyan: '#00F0FF',
    purple: '#8A2BE2',
    pink: '#FF007F',
    amber: '#F59E0B',
    obsidian: '#020205',
    card: '#0A0A0F',
    border: 'rgba(255,255,255,0.07)',
    sub: 'rgba(255,255,255,0.45)',
};

const FEATURE_CARDS = [
    {
        icon: Radar,
        title: 'Distributed Scraping Engine',
        desc: 'Deno edge functions extract jobs from 50+ boards seamlessly.',
        color: T.cyan,
    },
    {
        icon: Zap,
        title: 'Algorithmic Match Scoring',
        desc: 'Instant resume parsing and JD compatibility calculation.',
        color: T.purple,
    },
    {
        icon: Briefcase,
        title: 'Auto-Application Pipeline',
        desc: 'Tinder-style swipe interface. Send 100+ applications daily.',
        color: T.pink,
    },
    {
        icon: Shield,
        title: 'Anti-Block Architecture',
        desc: 'Dynamic proxy rotation to bypass rate-limiting firewalls.',
        color: T.cyan,
    },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthMode = 'sign-in' | 'sign-up';
type MessageType = 'error' | 'warning' | 'success';

interface AuthMessage {
    type: MessageType;
    text: string;
}

// ── Validators ────────────────────────────────────────────────────────────────

const Validator = {
    signIn(email: string, pass: string): { valid: boolean; error?: string } {
        if (!email || !/\S+@\S+\.\S+/.test(email))
            return { valid: false, error: 'Invalid email address.' };
        if (!pass) return { valid: false, error: 'Password is required.' };
        return { valid: true };
    },
    signUp(email: string, pass: string, confirm: string, name: string): { valid: boolean; error?: string } {
        if (!name || name.trim().length < 2)
            return { valid: false, error: 'Name must be at least 2 characters.' };
        if (!email || !/\S+@\S+\.\S+/.test(email))
            return { valid: false, error: 'Invalid email address.' };
        if (!pass || pass.length < 10)
            return { valid: false, error: 'Password must be at least 10 characters.' };
        if (pass !== confirm)
            return { valid: false, error: 'Passwords do not match.' };
        return { valid: true };
    },
};

function mapAuthError(msg: string): AuthMessage {
    const m = msg.toLowerCase();
    if (m.includes('already registered') || m.includes('already exists'))
        return { type: 'warning', text: 'Email already registered. Sign in instead.' };
    if (m.includes('password should be at least'))
        return { type: 'warning', text: 'Password must be at least 10 characters.' };
    if (m.includes('rate limit'))
        return { type: 'warning', text: 'Too many attempts. Please wait a moment.' };
    if (m.includes('email not confirmed'))
        return { type: 'warning', text: 'Check your inbox to confirm your email.' };
    if (m.includes('invalid login credentials'))
        return { type: 'error', text: 'Incorrect email or password.' };
    if (m.includes('network') || m.includes('fetch'))
        return { type: 'error', text: 'Network error. Check your connection.' };
    return { type: 'error', text: msg };
}

// ── Password Strength ─────────────────────────────────────────────────────────

function getStrength(pw: string) {
    let s = 0;
    if (pw.length > 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const map = [
        { label: 'WEAK', color: T.pink },
        { label: 'WEAK', color: T.pink },
        { label: 'FAIR', color: T.amber },
        { label: 'GOOD', color: T.purple },
        { label: 'STRONG', color: T.cyan },
    ];
    return { ...map[s], score: s };
}

const PasswordStrengthMeter = memo(({ password }: { password: string }) => {
    if (!password.length) return null;
    const { label, color, score } = getStrength(password);
    return (
        <View style={{ paddingHorizontal: 4, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4, height: 3, marginBottom: 6, borderRadius: 4, overflow: 'hidden' }}>
                {[0, 1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            borderRadius: 4,
                            backgroundColor: i < score ? color : 'rgba(255,255,255,0.08)',
                        }}
                    />
                ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Uppercase · Number · Symbol
                </Text>
                <Text style={{ fontSize: 9, color, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>
                    {label}
                </Text>
            </View>
        </View>
    );
});
PasswordStrengthMeter.displayName = 'PasswordStrengthMeter';

// ── Form Field ────────────────────────────────────────────────────────────────

const FormField = memo(({
    label,
    icon: Icon,
    children,
    highlighted = false,
}: {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
    highlighted?: boolean;
}) => (
    <View style={{ marginBottom: 14 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[
            styles.fieldRow,
            highlighted ? styles.fieldRowHighlighted : null,
        ]}>
            <Icon size={17} color={highlighted ? T.cyan : '#64748B'} />
            {children}
        </View>
    </View>
));
FormField.displayName = 'FormField';

// ── Ambient Background (Web-only, GPU-safe) ───────────────────────────────────

const AmbientBg = memo(() => {
    if (!IS_WEB) return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore web-only */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 60% 60% at 75% 50%, rgba(138,43,226,0.12) 0%, transparent 65%)',
            }} />
            {/* @ts-ignore web-only */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 40% 50% at 25% 20%, rgba(0,240,255,0.07) 0%, transparent 60%)',
            }} />
        </View>
    );
});
AmbientBg.displayName = 'AmbientBg';

// ── Animated Ripple Core (Native + Web) ──────────────────────────────────────

const RippleCore = memo(() => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1, { duration: 3200, easing: Easing.out(Easing.sin) }),
            -1, false,
        );
        opacity.value = withRepeat(
            withTiming(0, { duration: 3200, easing: Easing.out(Easing.sin) }),
            -1, false,
        );
    }, []);

    const ring1 = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(scale.value, [0, 1], [0.1, 1]) }],
        opacity: interpolate(opacity.value, [0, 1], [0.35, 0]),
    }));
    const ring2 = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(scale.value, [0, 1], [0.1, 0.75]) }],
        opacity: interpolate(opacity.value, [0, 1], [0.2, 0]),
    }));

    return (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 600, height: 600, right: -100, top: '10%' }} pointerEvents="none">
            <Animated.View style={[{ position: 'absolute', width: 560, height: 560, borderRadius: 280, borderWidth: 1.5, borderColor: T.pink }, ring1]} />
            <Animated.View style={[{ position: 'absolute', width: 560, height: 560, borderRadius: 280, borderWidth: 1, borderColor: T.purple }, ring2]} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: T.pink, shadowColor: T.pink, shadowRadius: 12, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 } }} />
        </View>
    );
});
RippleCore.displayName = 'RippleCore';

// ── Feature Cards (Right Panel) ────────────────────────────────────────────────

const FeatureCards = memo(() => (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16, paddingHorizontal: 8 }}>
        {FEATURE_CARDS.map((item, i) => (
            <Animated.View
                key={item.title}
                entering={FadeInDown.delay(300 + i * 120).springify().damping(18)}
            >
                <View style={[styles.featureCard, { borderColor: `${item.color}18` }]}>
                    <View style={[styles.featureIconBox, { backgroundColor: `${item.color}14`, borderColor: `${item.color}25` }]}>
                        <item.icon size={19} color={item.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.featureTitle, { color: '#E2EBF0' }]}>{item.title}</Text>
                        <Text style={styles.featureDesc}>{item.desc}</Text>
                    </View>
                </View>
            </Animated.View>
        ))}

        {/* Social links */}
        <Animated.View entering={FadeInDown.delay(800).springify()} style={{ flexDirection: 'row', gap: 28, justifyContent: 'center', marginTop: 20, opacity: 0.5 }}>
            <Github size={22} color="#475569" />
            <Twitter size={22} color={T.cyan} />
            <Linkedin size={22} color={T.purple} />
        </Animated.View>
    </View>
));
FeatureCards.displayName = 'FeatureCards';

// ── Terms Modal ───────────────────────────────────────────────────────────────

const TermsModal = memo(({ visible, onClose, onAccept }: {
    visible: boolean;
    onClose: () => void;
    onAccept: () => void;
}) => {
    const [canAccept, setCanAccept] = useState(false);
    const [svHeight, setSvHeight] = useState(0);

    useEffect(() => { if (visible) setCanAccept(false); }, [visible]);

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ShieldCheck size={20} color={T.cyan} />
                            <Text style={styles.modalHeaderText}>Legal & Privacy Protocol</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <X size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                        onLayout={(e) => setSvHeight(e.nativeEvent.layout.height)}
                        onContentSizeChange={(_, ch) => {
                            if (svHeight > 0 && ch <= svHeight + 50) setCanAccept(true);
                        }}
                        onScroll={(e) => {
                            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50)
                                setCanAccept(true);
                        }}
                        scrollEventThrottle={16}
                    >
                        <Text style={styles.modalTitle}>Terms of Service</Text>
                        <Text style={styles.modalMeta}>Last Updated: June 2026</Text>

                        {[
                            ['1. Acceptance of Terms', 'By accessing OpusHunter, you agree to these Terms. The platform provides automated job scraping and application execution for enterprise and personal use.'],
                            ['2. Acceptable Use', 'You must not execute denial-of-service attacks on job boards, reverse-engineer the edge architecture, or submit maliciously crafted applications via the pipeline.'],
                            ['3. Platform Liability', 'OpusHunter does not guarantee employment, interview conversions, or ATS bypass success. Automated pipeline use is at your own risk.'],
                        ].map(([heading, body]) => (
                            <View key={heading} style={{ marginBottom: 24 }}>
                                <Text style={styles.modalSection}>{heading}</Text>
                                <Text style={styles.modalBody}>{body}</Text>
                            </View>
                        ))}

                        <View style={styles.divider} />
                        <Text style={[styles.modalTitle, { marginTop: 24 }]}>Privacy Policy</Text>
                        <Text style={styles.modalMeta}>Last Updated: June 2026</Text>

                        {[
                            ['1. Data Vault & CV Storage', 'Your encrypted CVs are stored in a secure Supabase Vault. Documents are parsed only for job matching and never sold to third parties.'],
                            ['2. Credential Security', 'All credentials are encrypted client-side and at rest. You retain full sovereignty and may permanently delete your Vault at any time.'],
                        ].map(([heading, body]) => (
                            <View key={heading} style={{ marginBottom: 24 }}>
                                <Text style={styles.modalSection}>{heading}</Text>
                                <Text style={styles.modalBody}>{body}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Accept footer */}
                    <View style={styles.modalFooter}>
                        {!canAccept && (
                            <Text style={styles.modalScrollHint}>Scroll to bottom to accept</Text>
                        )}
                        <TouchableOpacity
                            disabled={!canAccept}
                            onPress={() => { onAccept(); onClose(); }}
                            style={[styles.modalAcceptBtn, canAccept ? styles.modalAcceptActive : styles.modalAcceptDisabled]}
                        >
                            <Text style={[styles.modalAcceptText, { color: canAccept ? '#000' : 'rgba(255,255,255,0.25)' }]}>
                                {canAccept ? 'I Agree & Accept' : 'Read to Accept'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});
TermsModal.displayName = 'TermsModal';

// ── Brand Header ──────────────────────────────────────────────────────────────

const BrandHeader = memo(() => (
    <Animated.View entering={FadeInDown.delay(0).duration(700).springify()} style={styles.brandHeader}>
        <View style={styles.brandIconBox}>
            <Image
                source={require('../../assets/icon.png')}
                style={styles.brandIcon}
                resizeMode="contain"
            />
        </View>
        <Text style={styles.brandName}>
            Opus<Text style={{ color: T.cyan }}>Hunter</Text>
        </Text>
        <Text style={styles.brandSub}>AI-Powered Job Application Engine</Text>
    </Animated.View>
));
BrandHeader.displayName = 'BrandHeader';

// ── Security Footer ───────────────────────────────────────────────────────────

const SecurityFooter = memo(() => (
    <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.securityFooter}>
        <ShieldCheck size={13} color={T.amber} />
        <Text style={styles.securityText}>Enterprise-Grade Pipeline Encryption</Text>
    </Animated.View>
));
SecurityFooter.displayName = 'SecurityFooter';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = IS_WEB && width >= 768;

    // ── State ─────────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<AuthMode>('sign-in');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [success, setSuccess] = useState<'none' | 'login' | 'signup'>('none');
    const [message, setMessage] = useState<AuthMessage | null>(null);

    // ── Button animated color ─────────────────────────────────────────────────
    const btnAnim = useSharedValue(0);

    useEffect(() => {
        if (success !== 'none' || message?.type === 'success') {
            btnAnim.value = withTiming(1, { duration: 280 });
        } else if (message?.type === 'error') {
            btnAnim.value = withTiming(2, { duration: 280 });
        } else if (message?.type === 'warning') {
            btnAnim.value = withTiming(3, { duration: 280 });
        } else {
            btnAnim.value = withTiming(0, { duration: 280 });
        }
    }, [success, message]);

    const btnStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(btnAnim.value, [0, 1, 2, 3],
            ['rgba(0,240,255,0.06)', 'rgba(50,255,0,0.1)', 'rgba(244,63,94,0.08)', 'rgba(245,158,11,0.08)']),
        borderColor: interpolateColor(btnAnim.value, [0, 1, 2, 3],
            ['rgba(0,240,255,0.28)', 'rgba(50,255,0,0.45)', 'rgba(244,63,94,0.4)', 'rgba(245,158,11,0.4)']),
    }));

    // ── Handlers ──────────────────────────────────────────────────────────────

    const switchMode = useCallback((m: AuthMode) => {
        setMode(m);
        setMessage(null);
        setConfirmPassword('');
        setFullName('');
        setAgreedToTerms(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        setMessage(null);
        const trimEmail = email.trim();
        setLoading(true);

        if (mode === 'sign-in') {
            const v = Validator.signIn(trimEmail, password);
            if (!v.valid) {
                setLoading(false);
                return setMessage({ type: 'error', text: v.error! });
            }
            const { error } = await supabase.auth.signInWithPassword({ email: trimEmail, password });
            setLoading(false);
            if (error) return setMessage(mapAuthError(error.message));
            setSuccess('login');
            setTimeout(() => router.replace('/(tabs)/dashboard'), 1400);
        } else {
            if (!agreedToTerms) {
                setLoading(false);
                return setMessage({ type: 'warning', text: 'Please agree to the Terms of Service.' });
            }
            const v = Validator.signUp(trimEmail, password, confirmPassword, fullName);
            if (!v.valid) {
                setLoading(false);
                return setMessage({ type: 'error', text: v.error! });
            }
            const { error } = await supabase.auth.signUp({
                email: trimEmail,
                password,
                options: { data: { full_name: fullName.trim() } },
            });
            setLoading(false);
            if (error) return setMessage(mapAuthError(error.message));
            setSuccess('signup');
            setTimeout(() => {
                setSuccess('none');
                switchMode('sign-in');
                setPassword('');
                setMessage({ type: 'success', text: 'Account created. Please sign in.' });
            }, 1800);
        }
    }, [mode, email, password, confirmPassword, fullName, agreedToTerms, router, switchMode]);

    const handleGoogle = useCallback(async () => {
        setGoogleLoading(true);
        setMessage(null);
        try {
            if (IS_WEB) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
                return;
            }
            const redirectUri = AuthSession.makeRedirectUri({ scheme: 'opushunter' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUri, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (!data?.url) throw new Error('OAuth URL not returned.');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

            if (result.type === 'success' && result.url) {
                const urlParts = result.url.split('#');
                const params = new URLSearchParams(urlParts[1] || result.url.split('?')[1] || '');
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                    if (sessionError) throw sessionError;
                    setGoogleLoading(false);
                    setSuccess('login');
                    setTimeout(() => router.replace('/(tabs)/dashboard'), 1400);
                } else {
                    throw new Error('Tokens not returned from OAuth.');
                }
            } else {
                setGoogleLoading(false);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Google sign-in failed.';
            setMessage({ type: 'error', text: msg });
            setGoogleLoading(false);
        }
    }, [router]);

    // ── Form JSX ──────────────────────────────────────────────────────────────

    const renderForm = () => (
        <Animated.View layout={Layout.springify().damping(22).stiffness(160)} style={styles.formCard}>

            {/* ── Success state ── */}
            {success !== 'none' ? (
                <Animated.View entering={FadeInDown.springify()} style={styles.successBlock}>
                    <View style={styles.successIconRing}>
                        <CheckCircle2 size={40} color={T.cyan} />
                    </View>
                    <Text style={styles.successTitle}>
                        {success === 'login' ? 'Access Granted' : 'Vault Created'}
                    </Text>
                    <Text style={styles.successSub}>
                        {success === 'login' ? 'Synchronizing pipeline…' : 'Preparing your workspace…'}
                    </Text>
                </Animated.View>
            ) : (
                <>
                    {/* ── Mode tabs ── */}
                    <View style={styles.tabs}>
                        {(['sign-in', 'sign-up'] as AuthMode[]).map((m) => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => switchMode(m)}
                                activeOpacity={0.75}
                                style={[styles.tab, mode === m ? styles.tabActive : styles.tabInactive]}
                            >
                                <Text style={[styles.tabText, mode === m ? styles.tabTextActive : styles.tabTextInactive]}>
                                    {m === 'sign-in' ? 'SIGN IN' : 'SIGN UP'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Full name (sign-up only) ── */}
                    {mode === 'sign-up' && (
                        <Animated.View entering={FadeInRight.springify()} exiting={FadeOutUp.duration(200)}>
                            <FormField label="FULL NAME" icon={User}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#3D4A55"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    editable={!loading}
                                    autoCorrect={false}
                                />
                            </FormField>
                        </Animated.View>
                    )}

                    {/* ── Email ── */}
                    <FormField label="EMAIL" icon={Mail}>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#3D4A55"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                            autoCorrect={false}
                        />
                    </FormField>

                    {/* ── Password ── */}
                    <View style={{ marginBottom: mode === 'sign-up' ? 4 : 0 }}>
                        <FormField label="PASSWORD" icon={Lock}>
                            <TextInput
                                style={styles.input}
                                placeholder="Min. 10 characters"
                                placeholderTextColor="#3D4A55"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword((p) => !p)}
                                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                            >
                                {showPassword
                                    ? <EyeOff size={16} color="#64748B" />
                                    : <Eye size={16} color="#64748B" />}
                            </TouchableOpacity>
                        </FormField>
                        {mode === 'sign-up' && <PasswordStrengthMeter password={password} />}
                    </View>

                    {/* ── Confirm password + terms (sign-up only) ── */}
                    {mode === 'sign-up' && (
                        <Animated.View
                            entering={FadeInRight.delay(80).springify()}
                            exiting={FadeOutUp.duration(200)}
                        >
                            <View style={{ marginTop: 14 }}>
                                <FormField
                                    label="CONFIRM PASSWORD"
                                    icon={Fingerprint}
                                    highlighted={confirmPassword.length > 0 && password === confirmPassword}
                                >
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Re-enter password"
                                        placeholderTextColor="#3D4A55"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirm}
                                        editable={!loading}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirm((p) => !p)}
                                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                                    >
                                        {showConfirm
                                            ? <EyeOff size={16} color="#64748B" />
                                            : <Eye size={16} color="#64748B" />}
                                    </TouchableOpacity>
                                </FormField>

                                {/* Terms checkbox */}
                                <TouchableOpacity
                                    onPress={() => agreedToTerms ? setAgreedToTerms(false) : setShowTerms(true)}
                                    activeOpacity={0.7}
                                    style={styles.termsRow}
                                >
                                    {agreedToTerms
                                        ? <CheckCircle2 size={18} color={T.cyan} />
                                        : <Circle size={18} color="rgba(255,255,255,0.2)" />}
                                    <Text style={styles.termsText}>
                                        I agree to the{' '}
                                        <Text
                                            onPress={() => setShowTerms(true)}
                                            style={styles.termsLink}
                                        >
                                            Terms of Service
                                        </Text>
                                        {' '}and{' '}
                                        <Text
                                            onPress={() => setShowTerms(true)}
                                            style={styles.termsLink}
                                        >
                                            Privacy Policy
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {/* ── Message banner ── */}
                    {message && success === 'none' && (
                        <Animated.View
                            entering={FadeInDown.springify()}
                            exiting={FadeOutUp.duration(200)}
                            style={[
                                styles.banner,
                                {
                                    backgroundColor:
                                        message.type === 'error' ? 'rgba(244,63,94,0.08)'
                                            : message.type === 'warning' ? 'rgba(245,158,11,0.08)'
                                                : 'rgba(0,240,255,0.08)',
                                    borderColor:
                                        message.type === 'error' ? 'rgba(244,63,94,0.3)'
                                            : message.type === 'warning' ? 'rgba(245,158,11,0.3)'
                                                : 'rgba(0,240,255,0.3)',
                                },
                            ]}
                        >
                            {message.type === 'error' && <AlertCircle size={16} color="#F43F5E" />}
                            {message.type === 'warning' && <AlertTriangle size={16} color={T.amber} />}
                            {message.type === 'success' && <CheckCircle2 size={16} color={T.cyan} />}
                            <Text style={[
                                styles.bannerText,
                                {
                                    color: message.type === 'error' ? '#F43F5E'
                                        : message.type === 'warning' ? T.amber
                                            : T.cyan,
                                },
                            ]}>
                                {message.text}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Submit button ── */}
                    <Animated.View style={[styles.submitBtn, btnStyle]}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading || success !== 'none'}
                            activeOpacity={0.8}
                            style={styles.submitBtnInner}
                        >
                            {loading
                                ? <ActivityIndicator color={T.cyan} />
                                : <Text style={styles.submitBtnText}>
                                    {mode === 'sign-up' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                                </Text>}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── Divider ── */}
                    <View
                        pointerEvents={success !== 'none' ? 'none' : 'auto'}
                        style={{ opacity: success !== 'none' ? 0.5 : 1 }}
                    >
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Google button ── */}
                        <TouchableOpacity
                            onPress={handleGoogle}
                            disabled={googleLoading || loading || success !== 'none'}
                            activeOpacity={0.75}
                            style={styles.googleBtn}
                        >
                            {googleLoading
                                ? <ActivityIndicator color={T.cyan} size="small" />
                                : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Image
                                            source={require('../../assets/google-logo.png')}
                                            style={styles.googleLogo}
                                            resizeMode="contain"
                                        />
                                        <Text style={styles.googleBtnText}>CONTINUE WITH GOOGLE</Text>
                                    </View>
                                )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </Animated.View>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <AmbientBg />

            {/* Google OAuth loading overlay */}
            {googleLoading && (
                <Animated.View
                    entering={FadeInDown.duration(250)}
                    style={styles.oauthOverlay}
                >
                    <View style={styles.oauthSpinner}>
                        <Image
                            source={require('../../assets/google-logo.png')}
                            style={{ width: 32, height: 32, marginBottom: 20 }}
                            resizeMode="contain"
                        />
                        <Text style={styles.oauthText}>Connecting to Google…</Text>
                    </View>
                </Animated.View>
            )}

            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                {isDesktop ? (
                    /* ── Desktop: side-by-side ── */
                    <View style={styles.desktopContainer}>
                        {/* Left: form */}
                        <View style={styles.desktopLeft}>
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={styles.desktopLeftContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <BrandHeader />
                                {renderForm()}
                                <SecurityFooter />
                            </ScrollView>
                        </View>

                        {/* Right: feature cards + ripple */}
                        <View style={styles.desktopRight}>
                            <RippleCore />
                            <FeatureCards />
                        </View>
                    </View>
                ) : (
                    /* ── Mobile / APK / iOS: single column ── */
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.mobileContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <BrandHeader />
                            {renderForm()}

                            {/* Feature cards on mobile — compact strip */}
                            <View style={styles.mobileFeaturesSection}>
                                <View style={styles.dividerLine} />
                                {FEATURE_CARDS.map((item) => (
                                    <View key={item.title} style={styles.mobileFeatureRow}>
                                        <View style={[styles.mobileFeatureIcon, { backgroundColor: `${item.color}12` }]}>
                                            <item.icon size={14} color={item.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mobileFeatureTitle}>{item.title}</Text>
                                            <Text style={styles.mobileFeatureDesc} numberOfLines={1}>{item.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <SecurityFooter />
                        </ScrollView>
                    </KeyboardAvoidingView>
                )}
            </SafeAreaView>

            <TermsModal
                visible={showTerms}
                onClose={() => setShowTerms(false)}
                onAccept={() => setAgreedToTerms(true)}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#020205',
    },

    // ── Brand header ──
    brandHeader: {
        alignItems: 'center',
        marginBottom: 28,
    },
    brandIconBox: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: 'rgba(0,240,255,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(0,240,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    brandIcon: {
        width: 52,
        height: 52,
        borderRadius: 12,
    },
    brandName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    brandSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        fontWeight: '600',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // ── Form card ──
    formCard: {
        width: '100%',
        padding: 22,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(10,10,18,0.55)',
        overflow: 'hidden',
    },

    // ── Tabs ──
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 3,
        marginBottom: 22,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 11,
        borderWidth: 1,
    },
    tabActive: {
        borderColor: 'rgba(0,240,255,0.28)',
        backgroundColor: 'rgba(0,240,255,0.09)',
    },
    tabInactive: {
        borderColor: 'transparent',
        backgroundColor: 'transparent',
    },
    tabText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    tabTextActive: { color: T.cyan },
    tabTextInactive: { color: 'rgba(255,255,255,0.35)' },

    // ── Form fields ──
    fieldLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: T.cyan,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 7,
        marginLeft: 2,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.025)',
        gap: 10,
    },
    fieldRowHighlighted: {
        borderColor: 'rgba(0,240,255,0.35)',
        backgroundColor: 'rgba(0,240,255,0.04)',
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#E2EBF0',
        fontSize: 14,
        fontWeight: '500',
        ...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {}),
    },

    // ── Terms ──
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 14,
        marginBottom: 4,
    },
    termsText: {
        flex: 1,
        color: 'rgba(255,255,255,0.38)',
        fontSize: 12,
        lineHeight: 18,
    },
    termsLink: {
        color: T.cyan,
        fontWeight: '700',
    },

    // ── Message banner ──
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    bannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
    },

    // ── Submit button ──
    submitBtn: {
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 18,
        overflow: 'hidden',
    },
    submitBtnInner: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: T.cyan,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },

    // ── Divider ──
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 20,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 18,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    dividerText: {
        color: 'rgba(255,255,255,0.25)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },

    // ── Google button ──
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginBottom: 4,
    },
    googleLogo: {
        width: 20,
        height: 20,
        borderRadius: 4,
    },
    googleBtnText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },

    // ── Success state ──
    successBlock: {
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    successIconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1.5,
        borderColor: 'rgba(0,240,255,0.3)',
        backgroundColor: 'rgba(0,240,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: T.cyan,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    successSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // ── Security footer ──
    securityFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 24,
        marginBottom: 12,
        opacity: 0.7,
    },
    securityText: {
        fontSize: 10,
        fontWeight: '700',
        color: T.amber,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    },

    // ── OAuth loading overlay ──
    oauthOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(2,2,5,0.96)',
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    oauthSpinner: {
        alignItems: 'center',
    },
    oauthText: {
        color: T.cyan,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
    },

    // ── Desktop layout ──
    desktopContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    desktopLeft: {
        width: 420,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.04)',
        backgroundColor: 'rgba(2,2,8,0.6)',
    },
    desktopLeftContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 40,
        paddingBottom: 60,
    },
    desktopRight: {
        flex: 1,
        justifyContent: 'center',
        padding: 60,
        overflow: 'hidden',
    },

    // ── Mobile layout ──
    mobileContent: {
        flexGrow: 1,
        padding: 22,
        paddingTop: 24,
        paddingBottom: 80,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },

    // ── Mobile feature strip ──
    mobileFeaturesSection: {
        marginTop: 36,
        gap: 12,
    },
    mobileFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    mobileFeatureIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileFeatureTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.75)',
        letterSpacing: 0.2,
    },
    mobileFeatureDesc: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.32)',
        marginTop: 1,
    },

    // ── Feature cards (desktop) ──
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.025)',
    },
    featureIconBox: {
        width: 46,
        height: 46,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexShrink: 0,
    },
    featureTitle: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
        marginBottom: 3,
    },
    featureDesc: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.38)',
        lineHeight: 16,
    },

    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.82)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '88%',
        backgroundColor: '#05050F',
        borderWidth: 1,
        borderColor: 'rgba(0,240,255,0.18)',
        borderRadius: 28,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalHeaderText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    modalMeta: {
        fontSize: 10,
        color: T.cyan,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 20,
    },
    modalSection: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    modalBody: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 20,
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(0,0,0,0.2)',
        gap: 12,
    },
    modalScrollHint: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    modalAcceptBtn: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalAcceptActive: {
        backgroundColor: T.cyan,
    },
    modalAcceptDisabled: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    modalAcceptText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});