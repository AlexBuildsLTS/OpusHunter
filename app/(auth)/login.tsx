/**
 * app/(auth)/login.tsx
 * OpusHunter — Authentication Screen
 * 2026-07-01 — Rebuilt for visual excellence and cross-platform parity.
 *
 * Design principles:
 *   - Palette synced with lib/theme.ts (C.cyan = #00D4FF, C.purple = #7B5EA7,
 *     C.pink = #E8436A) — identical to global.css CSS variables and tailwind.config.js tokens.
 *   - Desktop (≥768px web): Left form column (max-w 440px) + Right feature panel
 *   - Mobile / APK / iOS: Single-column, keyboard-aware, no horizontal stretch
 *   - Terms popup: Compact, sleek card — not bulky, scroll-to-accept preserved
 *   - Ambient background: GPU-safe static CSS gradients on web; Reanimated ripple on native
 *   - Feature cards: Constrained width, never stretch on large viewports
 *   - All StyleSheet values, no inline objects except where unavoidable
 *   - Google OAuth on web + native (WebBrowser + AuthSession)
 */

import React, {
    useState,
    useCallback,
    useEffect,
    memo,
} from 'react';
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
    withSpring,
    interpolate,
    interpolateColor,
    Easing,
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
    Github,
    Linkedin,
    Twitter,
    ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

// ── Platform constant ─────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === 'web';
WebBrowser.maybeCompleteAuthSession();

import { C as T } from '../../lib/theme';


// ── Feature card data ─────────────────────────────────────────────────────────

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

// ── Password Strength Meter ───────────────────────────────────────────────────

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
        <View style={s.strengthWrap}>
            <View style={s.strengthBars}>
                {[0, 1, 2, 3].map((i) => (
                    <View
                        key={i}
                        style={[s.strengthBar, { backgroundColor: i < score ? color : 'rgba(255,255,255,0.08)' }]}
                    />
                ))}
            </View>
            <View style={s.strengthLabelRow}>
                <Text style={s.strengthHint}>UPPERCASE · NUMBER · SYMBOL</Text>
                <Text style={[s.strengthLabel, { color }]}>{label}</Text>
            </View>
        </View>
    );
});
PasswordStrengthMeter.displayName = 'PasswordStrengthMeter';

// ── Form Field Wrapper ────────────────────────────────────────────────────────

const FormField = memo(({
    label,
    icon: Icon,
    children,
    highlighted = false,
    error = false,
}: {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
    highlighted?: boolean;
    error?: boolean;
}) => (
    <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>{label}</Text>
        <View style={[
            s.fieldRow,
            highlighted ? s.fieldRowHighlighted : null,
            error ? s.fieldRowError : null,
        ]}>
            <Icon
                size={16}
                color={highlighted ? T.cyan : error ? T.pink : '#55687A'}
            />
            {children}
        </View>
    </View>
));
FormField.displayName = 'FormField';

// ── Ambient Background (web-only, performance-first static CSS) ───────────────

const AmbientBg = memo(() => {
    if (!IS_WEB) return null;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* @ts-ignore web-only */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 65% 55% at 72% 48%, rgba(123,94,167,0.11) 0%, transparent 65%)',
            }} />
            {/* @ts-ignore web-only */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 45% 50% at 22% 18%, rgba(0,212,255,0.07) 0%, transparent 60%)',
            }} />
            {/* @ts-ignore web-only */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 35% 30% at 80% 85%, rgba(232,67,106,0.05) 0%, transparent 55%)',
            }} />
        </View>
    );
});
AmbientBg.displayName = 'AmbientBg';

// ── Animated Ripple (native only) ─────────────────────────────────────────────

const RippleOrb = memo(() => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0.35);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1, { duration: 3400, easing: Easing.out(Easing.sin) }),
            -1, false,
        );
        opacity.value = withRepeat(
            withTiming(0, { duration: 3400, easing: Easing.out(Easing.sin) }),
            -1, false,
        );
    }, []);

    const ring1 = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(scale.value, [0, 1], [0.08, 1]) }],
        opacity: opacity.value,
    }));
    const ring2 = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(scale.value, [0, 1], [0.08, 0.7]) }],
        opacity: interpolate(opacity.value, [0, 0.35], [0, 0.18]),
    }));

    return (
        <View style={s.rippleWrap} pointerEvents="none">
            <Animated.View style={[s.rippleRing, s.rippleRing1, ring1]} />
            <Animated.View style={[s.rippleRing, s.rippleRing2, ring2]} />
            <View style={s.rippleDot} />
        </View>
    );
});
RippleOrb.displayName = 'RippleOrb';

// ── Feature Cards — Desktop right panel ───────────────────────────────────────

const FeatureCards = memo(() => (
    <View style={s.featurePanelInner}>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={s.featurePanelHeadline}>
            <Text style={s.featurePanelTitle}>Why OpusHunter?</Text>
            <Text style={s.featurePanelSub}>The intelligent pipeline that works while you sleep.</Text>
        </Animated.View>

        {FEATURE_CARDS.map((item, i) => (
            <Animated.View
                key={item.title}
                entering={FadeInDown.delay(300 + i * 100).springify().damping(18)}
            >
                <View style={[s.featureCard, { borderColor: `${item.color}16` }]}>
                    <View style={[s.featureIconBox, { backgroundColor: `${item.color}12`, borderColor: `${item.color}22` }]}>
                        <item.icon size={18} color={item.color} />
                    </View>
                    <View style={s.featureCardBody}>
                        <Text style={s.featureTitle}>{item.title}</Text>
                        <Text style={s.featureDesc}>{item.desc}</Text>
                    </View>
                    <ChevronRight size={14} color={`${item.color}50`} />
                </View>
            </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(800).springify()} style={s.socialRow}>
            <Github size={20} color="rgba(255,255,255,0.2)" />
            <Twitter size={20} color={`${T.cyan}55`} />
            <Linkedin size={20} color={`${T.purple}55`} />
        </Animated.View>
    </View>
));
FeatureCards.displayName = 'FeatureCards';

// ── Terms Modal — compact, sleek, scroll-to-accept ────────────────────────────

const TERMS_SECTIONS = [
    {
        title: 'Terms of Service',
        updated: 'July 2026',
        items: [
            ['Acceptance', 'By accessing OpusHunter, you agree to these Terms. The platform provides automated job scraping and application execution for enterprise and personal use.'],
            ['Acceptable Use', 'You must not execute denial-of-service attacks on job boards, reverse-engineer the edge architecture, or submit maliciously crafted applications.'],
            ['Liability', 'OpusHunter does not guarantee employment, interview conversions, or ATS bypass success. Automated pipeline use is at your own risk.'],
        ],
    },
    {
        title: 'Privacy Policy',
        updated: 'July 2026',
        items: [
            ['Data & CV Storage', 'Your encrypted CVs are stored in a secure Supabase Vault. Documents are parsed only for job matching and never sold to third parties.'],
            ['Credential Security', 'All credentials are encrypted at rest. You retain full data sovereignty and may permanently delete your Vault at any time.'],
        ],
    },
];

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
            <View style={s.termsOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <Animated.View entering={FadeInDown.springify().damping(20)} style={s.termsCard}>
                    {/* Header */}
                    <View style={s.termsHeader}>
                        <View style={s.termsHeaderLeft}>
                            <ShieldCheck size={16} color={T.cyan} />
                            <Text style={s.termsHeaderTitle}>Legal & Privacy</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.termsCloseBtn}>
                            <X size={16} color={T.sub} />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable content */}
                    <ScrollView
                        style={s.termsScroll}
                        contentContainerStyle={s.termsScrollContent}
                        showsVerticalScrollIndicator={false}
                        onLayout={(e) => setSvHeight(e.nativeEvent.layout.height)}
                        onContentSizeChange={(_, ch) => {
                            if (svHeight > 0 && ch <= svHeight + 60) setCanAccept(true);
                        }}
                        onScroll={(e) => {
                            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50)
                                setCanAccept(true);
                        }}
                        scrollEventThrottle={16}
                    >
                        {TERMS_SECTIONS.map((section) => (
                            <View key={section.title} style={s.termsSection}>
                                <View style={s.termsSectionHeader}>
                                    <Text style={s.termsSectionTitle}>{section.title}</Text>
                                    <Text style={s.termsSectionDate}>{section.updated}</Text>
                                </View>
                                {section.items.map(([heading, body]) => (
                                    <View key={heading} style={s.termsItem}>
                                        <Text style={s.termsItemTitle}>{heading}</Text>
                                        <Text style={s.termsItemBody}>{body}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.termsFooter}>
                        {!canAccept && (
                            <Text style={s.termsScrollHint}>↓ Scroll to read all terms</Text>
                        )}
                        <TouchableOpacity
                            disabled={!canAccept}
                            onPress={() => { onAccept(); onClose(); }}
                            style={[s.termsAcceptBtn, canAccept ? s.termsAcceptActive : s.termsAcceptDisabled]}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.termsAcceptText, { color: canAccept ? '#020507' : 'rgba(255,255,255,0.2)' }]}>
                                {canAccept ? 'I Agree & Accept' : 'Read All Terms'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
});
TermsModal.displayName = 'TermsModal';

// ── Brand Header ──────────────────────────────────────────────────────────────

const BrandHeader = memo(() => (
    <Animated.View entering={FadeInDown.delay(0).duration(600).springify()} style={s.brandHeader}>
        <View style={s.brandIconBox}>
            <Image
                source={require('../../assets/icon.png')}
                style={s.brandIcon}
                resizeMode="contain"
            />
        </View>
        <Text style={s.brandName}>
            Opus<Text style={{ color: T.cyan }}>Hunter</Text>
        </Text>
        <Text style={s.brandSub}>AI-Powered Job Application Engine</Text>
    </Animated.View>
));
BrandHeader.displayName = 'BrandHeader';

// ── Security Footer ───────────────────────────────────────────────────────────

const SecurityFooter = memo(() => (
    <Animated.View entering={FadeInDown.delay(600).springify()} style={s.securityFooter}>
        <ShieldCheck size={12} color={T.amber} />
        <Text style={s.securityText}>Enterprise-Grade Pipeline Encryption</Text>
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

    // ── Button animated color (state-driven) ──────────────────────────────────
    const btnAnim = useSharedValue(0);

    useEffect(() => {
        if (success !== 'none' || message?.type === 'success') {
            btnAnim.value = withTiming(1, { duration: 300 });
        } else if (message?.type === 'error') {
            btnAnim.value = withTiming(2, { duration: 300 });
        } else if (message?.type === 'warning') {
            btnAnim.value = withTiming(3, { duration: 300 });
        } else {
            btnAnim.value = withTiming(0, { duration: 300 });
        }
    }, [success, message]);

    const btnStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            btnAnim.value, [0, 1, 2, 3],
            ['rgba(0,212,255,0.06)', 'rgba(0,198,125,0.08)', 'rgba(232,67,106,0.08)', 'rgba(245,158,11,0.08)'],
        ),
        borderColor: interpolateColor(
            btnAnim.value, [0, 1, 2, 3],
            ['rgba(0,212,255,0.28)', 'rgba(0,198,125,0.4)', 'rgba(232,67,106,0.4)', 'rgba(245,158,11,0.4)'],
        ),
    }));

    // ── Handlers ──────────────────────────────────────────────────────────────

    const switchMode = useCallback((m: AuthMode) => {
        setMode(m);
        setMessage(null);
        setConfirmPassword('');
        setFullName('');
        setAgreedToTerms(false);
        setShowPassword(false);
        setShowConfirm(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        setMessage(null);
        const trimEmail = email.trim();
        setLoading(true);

        if (mode === 'sign-in') {
            const v = Validator.signIn(trimEmail, password);
            if (!v.valid) {
                setLoading(false);
                return setMessage({ type: 'error', text: v.error || 'Validation failed' });
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
                return setMessage({ type: 'error', text: v.error || 'Validation failed' });
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
        <Animated.View
            layout={Layout.springify().damping(22).stiffness(160)}
            style={s.formCard}
        >
            {/* ── Success state ── */}
            {success !== 'none' ? (
                <Animated.View entering={FadeInDown.springify()} style={s.successBlock}>
                    <View style={s.successRing}>
                        <CheckCircle2 size={38} color={T.cyan} />
                    </View>
                    <Text style={s.successTitle}>
                        {success === 'login' ? 'Access Granted' : 'Vault Created'}
                    </Text>
                    <Text style={s.successSub}>
                        {success === 'login' ? 'Synchronizing pipeline…' : 'Preparing your workspace…'}
                    </Text>
                </Animated.View>
            ) : (
                <>
                    {/* ── Mode tabs ── */}
                    <View style={s.tabs}>
                        {(['sign-in', 'sign-up'] as AuthMode[]).map((m) => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => switchMode(m)}
                                activeOpacity={0.75}
                                style={[s.tab, mode === m ? s.tabActive : s.tabInactive]}
                            >
                                <Text style={[s.tabText, mode === m ? s.tabTextActive : s.tabTextInactive]}>
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
                                    style={s.input}
                                    placeholder="Jane Doe"
                                    placeholderTextColor={T.dim}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    editable={!loading}
                                    autoCorrect={false}
                                    autoCapitalize="words"
                                    {...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {})}
                                />
                            </FormField>
                        </Animated.View>
                    )}

                    {/* ── Email ── */}
                    <FormField label="EMAIL" icon={Mail}>
                        <TextInput
                            style={s.input}
                            placeholder="you@example.com"
                            placeholderTextColor={T.dim}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                            autoCorrect={false}
                            {...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {})}
                        />
                    </FormField>

                    {/* ── Password ── */}
                    <View style={{ marginBottom: mode === 'sign-up' ? 4 : 0 }}>
                        <FormField label="PASSWORD" icon={Lock}>
                            <TextInput
                                style={s.input}
                                placeholder="Min. 10 characters"
                                placeholderTextColor={T.dim}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                                autoCapitalize="none"
                                autoCorrect={false}
                                {...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {})}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword((p) => !p)}
                                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                            >
                                {showPassword
                                    ? <EyeOff size={16} color="#55687A" />
                                    : <Eye size={16} color="#55687A" />}
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
                            <View style={{ marginTop: 12 }}>
                                <FormField
                                    label="CONFIRM PASSWORD"
                                    icon={Fingerprint}
                                    highlighted={confirmPassword.length > 0 && password === confirmPassword}
                                    error={confirmPassword.length > 0 && password !== confirmPassword}
                                >
                                    <TextInput
                                        style={s.input}
                                        placeholder="Re-enter password"
                                        placeholderTextColor={T.dim}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirm}
                                        editable={!loading}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        {...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {})}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirm((p) => !p)}
                                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                                    >
                                        {showConfirm
                                            ? <EyeOff size={16} color="#55687A" />
                                            : <Eye size={16} color="#55687A" />}
                                    </TouchableOpacity>
                                </FormField>

                                {/* Terms checkbox — compact */}
                                <TouchableOpacity
                                    onPress={() => agreedToTerms ? setAgreedToTerms(false) : setShowTerms(true)}
                                    activeOpacity={0.7}
                                    style={s.termsRow}
                                >
                                    {agreedToTerms
                                        ? <CheckCircle2 size={17} color={T.cyan} />
                                        : <Circle size={17} color="rgba(255,255,255,0.18)" />}
                                    <Text style={s.termsText}>
                                        I agree to the{' '}
                                        <Text onPress={() => setShowTerms(true)} style={s.termsLink}>
                                            Terms of Service
                                        </Text>
                                        {' '}and{' '}
                                        <Text onPress={() => setShowTerms(true)} style={s.termsLink}>
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
                                s.banner,
                                {
                                    backgroundColor:
                                        message.type === 'error' ? 'rgba(232,67,106,0.08)'
                                            : message.type === 'warning' ? 'rgba(245,158,11,0.08)'
                                                : 'rgba(0,212,255,0.08)',
                                    borderColor:
                                        message.type === 'error' ? 'rgba(232,67,106,0.28)'
                                            : message.type === 'warning' ? 'rgba(245,158,11,0.28)'
                                                : 'rgba(0,212,255,0.28)',
                                },
                            ]}
                        >
                            {message.type === 'error' && <AlertCircle size={15} color={T.pink} />}
                            {message.type === 'warning' && <AlertTriangle size={15} color={T.amber} />}
                            {message.type === 'success' && <CheckCircle2 size={15} color={T.cyan} />}
                            <Text style={[
                                s.bannerText,
                                {
                                    color: message.type === 'error' ? T.pink
                                        : message.type === 'warning' ? T.amber
                                            : T.cyan,
                                },
                            ]}>
                                {message.text}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Submit button ── */}
                    <Animated.View style={[s.submitBtn, btnStyle]}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading || success !== 'none'}
                            activeOpacity={0.8}
                            style={s.submitBtnInner}
                        >
                            {loading
                                ? <ActivityIndicator color={T.cyan} />
                                : <Text style={s.submitBtnText}>
                                    {mode === 'sign-up' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                                </Text>}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── OAuth divider + Google button ── */}
                    <View
                        pointerEvents={success !== 'none' ? 'none' : 'auto'}
                        style={{ opacity: success !== 'none' ? 0.4 : 1 }}
                    >
                        <View style={s.dividerRow}>
                            <View style={s.dividerLine} />
                            <Text style={s.dividerText}>OR</Text>
                            <View style={s.dividerLine} />
                        </View>

                        <TouchableOpacity
                            onPress={handleGoogle}
                            disabled={googleLoading || loading || success !== 'none'}
                            activeOpacity={0.75}
                            style={s.googleBtn}
                        >
                            {googleLoading
                                ? <ActivityIndicator color={T.cyan} size="small" />
                                : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Image
                                            source={require('../../assets/google-logo.png')}
                                            style={s.googleLogo}
                                            resizeMode="contain"
                                        />
                                        <Text style={s.googleBtnText}>CONTINUE WITH GOOGLE</Text>
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
        <View style={s.root}>
            <AmbientBg />

            {/* Google OAuth loading overlay */}
            {googleLoading && (
                <Animated.View entering={FadeInDown.duration(250)} style={s.oauthOverlay}>
                    <View style={s.oauthSpinner}>
                        <Image
                            source={require('../../assets/google-logo.png')}
                            style={{ width: 28, height: 28, marginBottom: 16 }}
                            resizeMode="contain"
                        />
                        <Text style={s.oauthText}>Connecting to Google…</Text>
                    </View>
                </Animated.View>
            )}

            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                {isDesktop ? (
                    /* ── Desktop: side-by-side ── */
                    <View style={s.desktopContainer}>
                        {/* Left: form column — max-width capped */}
                        <View style={s.desktopLeft}>
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={s.desktopLeftContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <BrandHeader />
                                {renderForm()}
                                <SecurityFooter />
                            </ScrollView>
                        </View>

                        {/* Right: feature panel */}
                        <View style={s.desktopRight}>
                            <RippleOrb />
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
                            contentContainerStyle={s.mobileContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <BrandHeader />
                            {renderForm()}

                            {/* Feature cards on mobile — real elevated cards */}
                            <View style={s.mobileFeatureStrip}>
                                <Animated.View entering={FadeInDown.delay(350).springify()}>
                                    <Text style={s.mobileFeatureHeading}>Why OpusHunter?</Text>
                                </Animated.View>
                                {FEATURE_CARDS.map((item, i) => (
                                    <Animated.View
                                        key={item.title}
                                        entering={FadeInDown.delay(400 + i * 80).springify().damping(18)}
                                    >
                                        <View style={[s.mobileFeatureCard, { borderColor: `${item.color}18` }]}>
                                            <View style={[s.mobileFeatureIcon, { backgroundColor: `${item.color}12`, borderColor: `${item.color}28` }]}>
                                                <item.icon size={15} color={item.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.mobileFeatureTitle}>{item.title}</Text>
                                                <Text style={s.mobileFeatureDesc}>{item.desc}</Text>
                                            </View>
                                        </View>
                                    </Animated.View>
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
// All values derived from the T palette above (= lib/theme.ts tokens)

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: T.obsidian,
    },

    // ── Brand header ──
    brandHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    brandIconBox: {
        width: 80,
        height: 80,
        borderRadius: 22,
        backgroundColor: 'rgba(0,212,255,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(0,212,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    brandIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    brandName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    brandSub: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '600',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },

    // ── Form card ──
    formCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(8,14,22,0.82)',
        overflow: 'hidden',
    },

    // ── Tabs ──
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.025)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.065)',
        borderRadius: 13,
        padding: 3,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    tabActive: {
        borderColor: 'rgba(0,212,255,0.25)',
        backgroundColor: 'rgba(0,212,255,0.08)',
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
    tabTextInactive: { color: 'rgba(255,255,255,0.32)' },

    // ── Form fields ──
    fieldWrap: {
        marginBottom: 13,
    },
    fieldLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: T.cyan,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginLeft: 2,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        height: 52,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.025)',
        gap: 10,
    },
    fieldRowHighlighted: {
        borderColor: 'rgba(0,212,255,0.32)',
        backgroundColor: 'rgba(0,212,255,0.04)',
    },
    fieldRowError: {
        borderColor: 'rgba(232,67,106,0.35)',
        backgroundColor: 'rgba(232,67,106,0.04)',
    },
    input: {
        flex: 1,
        height: '100%',
        color: T.text,
        fontSize: 14,
        fontWeight: '500',
        ...(IS_WEB ? ({ outlineStyle: 'none' } as any) : {}),
    },

    // ── Password strength ──
    strengthWrap: {
        paddingHorizontal: 4,
        marginTop: 8,
        marginBottom: 2,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
        height: 3,
        marginBottom: 5,
        borderRadius: 4,
        overflow: 'hidden',
    },
    strengthBar: {
        flex: 1,
        borderRadius: 4,
    },
    strengthLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    strengthHint: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.25)',
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    strengthLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // ── Terms row ──
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        marginTop: 12,
        marginBottom: 2,
    },
    termsText: {
        flex: 1,
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11,
        lineHeight: 17,
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
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    bannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 17,
    },

    // ── Submit button ──
    submitBtn: {
        borderRadius: 15,
        borderWidth: 1.5,
        marginTop: 18,
        overflow: 'hidden',
    },
    submitBtnInner: {
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,212,255,0.10)',
    },
    submitBtnText: {
        color: T.cyan,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },

    // ── Divider ──
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    dividerText: {
        color: 'rgba(255,255,255,0.22)',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
    },

    // ── Google button ──
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
        backgroundColor: 'rgba(255,255,255,0.035)',
        marginBottom: 2,
    },
    googleLogo: {
        width: 18,
        height: 18,
        borderRadius: 4,
    },
    googleBtnText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },

    // ── Success state ──
    successBlock: {
        paddingVertical: 44,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    successRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 1.5,
        borderColor: 'rgba(0,212,255,0.3)',
        backgroundColor: 'rgba(0,212,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: T.cyan,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    successSub: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.38)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // ── Security footer ──
    securityFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 20,
        marginBottom: 10,
        opacity: 0.65,
    },
    securityText: {
        fontSize: 9,
        fontWeight: '700',
        color: T.amber,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // ── OAuth overlay ──
    oauthOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(2,5,7,0.96)',
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
        width: 440,
        maxWidth: 440,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.04)',
        backgroundColor: 'rgba(4,10,18,0.65)',
    },
    desktopLeftContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 38,
        paddingVertical: 52,
    },
    desktopRight: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 56,
        paddingVertical: 48,
        overflow: 'hidden',
    },

    // ── Mobile layout ──
    mobileContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 80,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },

    // ── Mobile feature strip ──
    mobileFeatureStrip: {
        marginTop: 24,
        gap: 10,
    },
    mobileFeatureHeading: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.35)',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        marginBottom: 4,
        marginLeft: 2,
    },
    mobileFeatureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: 'rgba(8,14,22,0.70)',
    },
    mobileFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 8,
    },
    mobileFeatureIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    mobileFeatureTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.82)',
        letterSpacing: 0.1,
        marginBottom: 2,
    },
    mobileFeatureDesc: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        lineHeight: 14,
    },

    // ── Desktop feature panel ──
    featurePanelInner: {
        flex: 1,
        justifyContent: 'center',
        gap: 14,
        maxWidth: 560,
        alignSelf: 'center',
        width: '100%',
    },
    featurePanelHeadline: {
        marginBottom: 6,
    },
    featurePanelTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: T.text,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    featurePanelSub: {
        fontSize: 13,
        color: T.sub,
        lineHeight: 19,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: 'rgba(8,14,22,0.5)',
        gap: 14,
    },
    featureIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexShrink: 0,
    },
    featureCardBody: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: T.text,
        letterSpacing: 0.1,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 11,
        color: T.sub,
        lineHeight: 15,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 24,
        justifyContent: 'center',
        marginTop: 12,
    },

    // ── Ripple animation (native) ──
    rippleWrap: {
        position: 'absolute',
        right: -80,
        top: '8%',
        width: 560,
        height: 560,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rippleRing: {
        position: 'absolute',
        borderRadius: 280,
    },
    rippleRing1: {
        width: 520,
        height: 520,
        borderWidth: 1.5,
        borderColor: T.pink,
    },
    rippleRing2: {
        width: 520,
        height: 520,
        borderWidth: 1,
        borderColor: T.purple,
    },
    rippleDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: T.pink,
        shadowColor: T.pink,
        shadowRadius: 10,
        shadowOpacity: 0.9,
        shadowOffset: { width: 0, height: 0 },
    },

    // ── Terms modal ── Compact, sleek, not bulky ──
    termsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2,5,7,0.78)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    termsCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '80%',
        backgroundColor: 'rgba(8,14,22,0.97)',
        borderWidth: 1,
        borderColor: 'rgba(0,212,255,0.14)',
        borderRadius: 22,
        overflow: 'hidden',
    },
    termsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    termsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    termsHeaderTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: T.text,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    termsCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    termsScroll: {
        flex: 1,
    },
    termsScrollContent: {
        padding: 18,
        gap: 20,
        paddingBottom: 32,
    },
    termsSection: {
        gap: 12,
    },
    termsSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    termsSectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: T.text,
    },
    termsSectionDate: {
        fontSize: 9,
        fontWeight: '700',
        color: T.cyan,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    termsItem: {
        gap: 4,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(0,212,255,0.12)',
    },
    termsItemTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.75)',
    },
    termsItemBody: {
        fontSize: 12,
        color: T.sub,
        lineHeight: 18,
    },
    termsFooter: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    termsScrollHint: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.28)',
        textAlign: 'center',
        letterSpacing: 1,
    },
    termsAcceptBtn: {
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    termsAcceptActive: {
        backgroundColor: T.cyan,
    },
    termsAcceptDisabled: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    termsAcceptText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});