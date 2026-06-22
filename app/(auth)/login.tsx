import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
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
    Dimensions,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import {
    Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle,
    AlertTriangle, Circle, Shield, Zap, Briefcase, Search,
    FileText, Radar, Fingerprint, Github, Twitter, Linkedin,
    ShieldCheck, X,
} from 'lucide-react-native';
import Animated, {
    FadeInDown, FadeInRight, FadeOutUp, LinearTransition,
    useSharedValue, useAnimatedStyle, withRepeat, withTiming,
    interpolate, withDelay, interpolateColor, Easing, useFrameCallback,
    Layout,

} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const AuthValidator = {
    validateSignIn: (email: string, pass: string) => {
        if (!email || !/\S+@\S+\.\S+/.test(email)) return { valid: false, error: 'Invalid email address.' };
        if (!pass) return { valid: false, error: 'Password is required.' };
        return { valid: true };
    },
    validateSignUp: (email: string, pass: string, confirm: string, name: string) => {
        if (!name || name.length < 2) return { valid: false, error: 'Name must be at least 2 characters.' };
        if (!email || !/\S+@\S+\.\S+/.test(email)) return { valid: false, error: 'Invalid email address.' };
        if (!pass || pass.length < 10) return { valid: false, error: 'Password must be at least 10 characters.' };
        if (pass !== confirm) return { valid: false, error: 'Passwords do not match.' };
        return { valid: true };
    }
};

const CustomFadeIn = ({ children, delay = 0, duration = 500, translateYStart = 20, style }: any) => (
    <Animated.View
        entering={FadeInDown.delay(delay).duration(duration).springify().withInitialValues({ transform: [{ translateY: translateYStart }] })}
        style={style}
    >
        {children}
    </Animated.View>
);

const ProcessingLoader = ({ size = 60, color = '#00F0FF' }: { size?: number; color?: string }) => {
    const rotation = useSharedValue(0);
    useEffect(() => {
        rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    }, []);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));
    return (
        <Animated.View style={[{
            width: size, height: size, borderRadius: size / 2,
            borderTopColor: color, borderRightColor: color,
            borderBottomColor: 'transparent', borderLeftColor: 'transparent',
            borderWidth: size / 10,
        }, animatedStyle]} />
    );
};

const AUTH_THEME = {
    cyan: '#00F0FF',
    purple: '#8A2BE2',
    pink: '#FF007F',
    obsidian: '#020205',
    card: '#0A0A0F',
    amber: '#F59E0B',
};

const IS_WEB = Platform.OS === 'web';
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'sign-in' | 'sign-up';
type MessageType = 'error' | 'warning' | 'success';

interface FormFieldProps {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

const BENTO_ITEMS = [
    { icon: Radar, title: 'Distributed Scraping Engine', desc: 'Deno edge functions extract jobs from 50+ boards seamlessly.', color: '#00F0FF' },
    { icon: Zap, title: 'Algorithmic Match Scoring', desc: 'Instant resume parsing and JD compatibility calculation.', color: '#8A2BE2' },
    { icon: Briefcase, title: 'Auto-Application Pipeline', desc: 'One-click Tinder-style swipe interface to mass-apply.', color: '#FF007F' },
    { icon: Shield, title: 'Anti-Block Architecture', desc: 'Dynamic proxy rotation to bypass strict rate-limiting firewalls.', color: '#00F0FF' },
];

function mapAuthError(errorMessage: string): { type: MessageType; text: string } {
    if (!errorMessage) return { type: 'error', text: 'An unknown error occurred.' };
    const lowMsg = errorMessage.toLowerCase();
    if (lowMsg.includes('user already registered') || lowMsg.includes('already exists'))
        return { type: 'warning', text: 'This email is already registered. Please sign in.' };
    if (lowMsg.includes('password should be at least'))
        return { type: 'warning', text: 'Your password must be at least 10 characters long.' };
    if (lowMsg.includes('rate limit'))
        return { type: 'warning', text: 'Too many attempts. Please wait a moment.' };
    if (lowMsg.includes('email not confirmed'))
        return { type: 'warning', text: 'Account pending verification. Check your inbox.' };
    if (lowMsg.includes('invalid login credentials'))
        return { type: 'error', text: 'Incorrect email or password. Please try again.' };
    if (lowMsg.includes('network') || lowMsg.includes('fetch'))
        return { type: 'error', text: 'Network failed. Please check your connection.' };
    return { type: 'error', text: errorMessage };
}

const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    switch (score) {
        case 0: case 1: return { label: 'WEAK', color: '#FF007F', flex: 1 };
        case 2: return { label: 'FAIR', color: '#F59E0B', flex: 2 };
        case 3: return { label: 'GOOD', color: '#8A2BE2', flex: 3 };
        case 4: return { label: 'STRONG', color: '#00F0FF', flex: 4 };
        default: return { label: 'WEAK', color: '#FF007F', flex: 1 };
    }
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
    const strength = checkPasswordStrength(password);
    if (password.length === 0) return null;
    return (
        <View className="px-1 mt-3">
            <View className="flex-row gap-1 h-1.5 mb-1.5 overflow-hidden rounded-full bg-white/5">
                {[...Array(4)].map((_, i) => (
                    <View key={i} className="flex-1 rounded-full" style={{ backgroundColor: i < strength.flex ? strength.color : 'transparent' }} />
                ))}
            </View>
            <View className="flex-row items-center justify-between px-1">
                <Text className="text-[8px] font-black tracking-widest text-white/40 uppercase">UPPERCASE, NUMBER, SYMBOL</Text>
                <Text className="text-[9px] font-black tracking-widest uppercase" style={{ color: strength.color }}>{strength.label}</Text>
            </View>
        </View>
    );
};

const TermsModal = ({ visible, onClose, onAccept }: { visible: boolean; onClose: () => void; onAccept: () => void }) => {
    const [canAccept, setCanAccept] = useState(false);
    const [scrollViewHeight, setScrollViewHeight] = useState(0);

    useEffect(() => { if (visible) setCanAccept(false); }, [visible]);

    const handleContentSizeChange = (_: number, contentHeight: number) => {
        if (scrollViewHeight > 0 && contentHeight <= scrollViewHeight + 50) setCanAccept(true);
    };

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) setCanAccept(true);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="items-center justify-center flex-1 px-4 bg-black/80">
                <View className="bg-[#00001a] border border-[#00F0FF]/30 rounded-[32px] w-full max-w-[800px] max-h-[85vh] overflow-hidden">
                    <View className="flex-row items-center justify-between p-6 border-b border-white/5 bg-[#020205]">
                        <View className="flex-row items-center gap-3">
                            <ShieldCheck size={24} color="#00F0FF" />
                            <Text className="text-sm font-black tracking-widest text-white uppercase">Legal & Privacy Protocol</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        onScroll={handleScroll}
                        onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
                        onContentSizeChange={handleContentSizeChange}
                        scrollEventThrottle={16}
                        className="px-6 py-8"
                    >
                        <Text className="mb-6 text-2xl font-black tracking-wide text-white">Terms of Service</Text>
                        <Text className="text-[10px] font-bold text-[#00F0FF] uppercase tracking-widest mb-6">Last Updated: June 2026</Text>

                        <Text className="mb-2 text-sm font-bold text-white">1. Acceptance of Terms</Text>
                        <Text className="text-[13px] text-white/60 leading-6 mb-6">
                            By accessing or utilizing OpusHunter, you expressly agree to be legally bound by these Terms. OpusHunter is designed for enterprise and personal utility, providing automated job scraping and application execution.
                        </Text>

                        <Text className="mb-2 text-sm font-bold text-white">2. Acceptable Use and Restrictions</Text>
                        <Text className="text-[13px] text-white/60 leading-6 mb-6">
                            You are strictly prohibited from:{'\n'}• Executing denial-of-service attacks on target job boards.{'\n'}• Attempting to reverse engineer the Edge routing architecture.{'\n'}• Utilizing the automated pipeline to submit maliciously crafted resumes.
                        </Text>

                        <Text className="mb-2 text-sm font-bold text-white">3. Platform Liability Disclaimer</Text>
                        <Text className="text-[13px] text-white/60 leading-6 mb-10">
                            OpusHunter utilizes algorithmic matching. We do not guarantee employment, interview conversions, or successful bypassing of third-party ATS systems. Use of this automated engine is at your own risk.
                        </Text>

                        <View className="h-[1px] w-full bg-white/10 mb-10" />

                        <Text className="mb-6 text-2xl font-black tracking-wide text-white">Privacy Policy</Text>

                        <Text className="mb-2 text-sm font-bold text-white">1. Data Vault & Document Parsing</Text>
                        <Text className="text-[13px] text-white/60 leading-6 mb-6">
                            To facilitate auto-applications, OpusHunter stores your encrypted CVs in a secure Supabase Vault. Your documents are parsed exclusively for job matching and are never sold to external data brokers.
                        </Text>

                        <Text className="mb-2 text-sm font-bold text-white">2. Credential Security</Text>
                        <Text className="text-[13px] text-white/60 leading-6 mb-12">
                            Any external credentials are encrypted client-side and at rest. You maintain absolute sovereignty over your data and may permanently purge your Vault at any time.
                        </Text>
                    </ScrollView>

                    <View className="p-6 border-t border-white/10 bg-[#020205]">
                        <Text className="text-[10px] text-center text-white/40 uppercase tracking-widest mb-4">Scroll to bottom to accept</Text>
                        <TouchableOpacity
                            disabled={!canAccept}
                            onPress={() => { onAccept(); onClose(); }}
                            className={`w-full h-14 rounded-xl items-center justify-center ${canAccept ? 'bg-[#00F0FF]' : 'bg-white/5'}`}
                        >
                            <Text className={`text-sm font-black tracking-widest uppercase ${canAccept ? 'text-black' : 'text-white/30'}`}>
                                {canAccept ? 'I Agree & Accept' : 'Read to Accept'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ── Ambient Engine ────────────────────────────────────────────────────────────

const SingleRipple = memo(({ color, delay, duration, maxSize }: { color: string; delay: number; duration: number; maxSize: number }) => {
    const progress = useSharedValue(0);
    useEffect(() => {
        progress.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.sin) }), -1, false));
    }, []);
    const animatedStyle = useAnimatedStyle(() => ({
        width: interpolate(progress.value, [0, 1], [0, maxSize]),
        height: interpolate(progress.value, [0, 1], [0, maxSize]),
        borderRadius: interpolate(progress.value, [0, 1], [0, maxSize / 2]),
        opacity: interpolate(progress.value, [0, 0.1, 0.6, 1], [0, 0.4, 0.05, 0]),
        borderWidth: interpolate(progress.value, [0, 1], [24, 2]),
    }));
    return <Animated.View style={[{ position: 'absolute', borderColor: color, backgroundColor: 'transparent' }, animatedStyle]} />;
});
SingleRipple.displayName = 'SingleRipple';

const WanderingCore = memo(({ coreSize, color, maxWaveSize, waveCount, baseDuration }: any) => {
    const { width, height } = Dimensions.get('window');
    const time = useSharedValue(0);
    const stagger = baseDuration / waveCount;

    useFrameCallback((frameInfo) => {
        if (frameInfo.timeSincePreviousFrame === null) return;
        time.value += frameInfo.timeSincePreviousFrame / 3000;
    });

    const animatedPosition = useAnimatedStyle(() => ({
        transform: [
            { translateX: width / 2 + Math.sin(time.value * 0.4) * (width * 0.3) },
            { translateY: height / 2 + Math.cos(time.value * 0.3) * (height * 0.2) },
        ],
    }));

    const corePulse = useSharedValue(0.6);
    useEffect(() => {
        corePulse.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, []);

    const coreStyle = useAnimatedStyle(() => ({
        opacity: interpolate(corePulse.value, [0.4, 1], [0.4, 1]),
        transform: [{ scale: interpolate(corePulse.value, [0.4, 1], [0.8, 1.2]) }],
    }));

    return (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }, animatedPosition]}>
            {Array.from({ length: waveCount }).map((_, index) => (
                <SingleRipple key={index} color={color} delay={index * stagger} duration={baseDuration} maxSize={maxWaveSize} />
            ))}
            <Animated.View style={[coreStyle, {
                width: coreSize, height: coreSize, borderRadius: coreSize / 2,
                backgroundColor: color, shadowColor: color, shadowRadius: 15,
                shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
                ...(IS_WEB ? ({ boxShadow: `0 0 20px ${color}` } as any) : {}),
            }]} />
        </Animated.View>
    );
});
WanderingCore.displayName = 'WanderingCore';

const OrganicOrb = memo(({ color, size, initialX, initialY, speedX, speedY, phaseOffsetX, phaseOffsetY, opacityBase }: any) => {
    const { width, height } = Dimensions.get('window');
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
        if (frameInfo.timeSincePreviousFrame === null) return;
        time.value += frameInfo.timeSincePreviousFrame / 1000;
    });

    const animatedStyle = useAnimatedStyle(() => {
        const xOffset = Math.sin(time.value * speedX + phaseOffsetX) * (width * 0.3);
        const yOffset = Math.cos(time.value * speedY + phaseOffsetY) * (height * 0.2);
        const breathe = 1 + Math.sin(time.value * 0.5) * 0.15;
        return {
            transform: [{ translateX: initialX + xOffset }, { translateY: initialY + yOffset }, { scale: breathe }],
            opacity: opacityBase + Math.sin(time.value * 0.5) * 0.02,
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[{
                position: 'absolute', top: -size / 2, left: -size / 2,
                width: size, height: size, borderRadius: size / 2, backgroundColor: color,
                ...(IS_WEB ? ({ filter: 'blur(60px)' } as any) : {}),
            }, animatedStyle]}
        />
    );
});
OrganicOrb.displayName = 'OrganicOrb';

const AmbientArchitecture = memo(() => {
    const { width, height } = Dimensions.get('window');
    const isDesktop = width >= 1024;
    const massiveWaveRadius = isDesktop ? width * 0.4 : height * 1.0;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <OrganicOrb color={AUTH_THEME.purple} size={width * 0.6} initialX={width * 0.8} initialY={height * 0.6} speedX={0.15} speedY={0.2} phaseOffsetX={Math.PI} phaseOffsetY={0} opacityBase={0.06} />
            <OrganicOrb color={AUTH_THEME.cyan} size={width * 0.4} initialX={width * 0.5} initialY={height * 0.8} speedX={0.25} speedY={0.1} phaseOffsetX={Math.PI / 4} phaseOffsetY={Math.PI} opacityBase={0.04} />
            <WanderingCore coreSize={12} color={AUTH_THEME.pink} maxWaveSize={massiveWaveRadius} waveCount={4} baseDuration={12000} />
        </View>
    );
});
AmbientArchitecture.displayName = 'AmbientArchitecture';

// ── Shared sub-components ─────────────────────────────────────────────────────

const BrandHeader = memo(() => (
    <Animated.View entering={FadeInDown.duration(1000).springify()} style={{ alignItems: 'center', marginBottom: 32 }}>
        <View className="w-24 h-24 rounded-3xl bg-[#0A0A0F] border border-[#00F0FF]/30 items-center justify-center mb-4">
            <Radar size={48} color="#00F0FF" />
        </View>
        <Text className="text-3xl font-black tracking-widest text-white uppercase">
            Opus<Text className="text-[#00F0FF]">Hunter</Text>
        </Text>
    </Animated.View>
));
BrandHeader.displayName = 'BrandHeader';

const FormField = ({ label, icon: Icon, children }: FormFieldProps) => (
    <View style={{ marginBottom: 16 }}>
        <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1">{label}</Text>
        <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-16 flex-row items-center px-4">
            <Icon size={18} color="#A1A1AA" />
            {children}
        </View>
    </View>
);

const SecurityFooter = memo(() => (
    <CustomFadeIn delay={400} duration={800} translateYStart={10}>
        <View className="flex-row items-center justify-center gap-1 mt-10" style={{ opacity: 0.8 }}>
            <ShieldCheck size={14} color={AUTH_THEME.amber} />
            <Text className="text-[10px] font-mono uppercase tracking-widest leading-4" style={{ color: AUTH_THEME.amber }}>
                Enterprise-Grade Pipeline Encryption
            </Text>
        </View>
    </CustomFadeIn>
));
SecurityFooter.displayName = 'SecurityFooter';

const MarketingContent = memo(({ isDesktop }: { isDesktop: boolean }) => (
    <View style={{ width: '100%', paddingBottom: 60, paddingHorizontal: isDesktop ? 0 : 16 }}>
        <View className="flex-col gap-5 mt-4">
            {BENTO_ITEMS.map((item, index) => (
                <CustomFadeIn key={item.title} delay={200 + index * 150} duration={800} translateYStart={30}>
                    <TouchableOpacity activeOpacity={0.8} className="p-6 border rounded-3xl border-white/10" style={{ backgroundColor: 'rgba(10, 10, 15, 0.8)' }}>
                        <View className="flex-row items-center gap-4 mb-2">
                            <View className="items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: `${item.color}15` }}>
                                <item.icon size={18} color={item.color} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-black tracking-wide text-white uppercase">{item.title}</Text>
                                <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest leading-4 mt-1">{item.desc}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </CustomFadeIn>
            ))}
        </View>
        <CustomFadeIn delay={800} duration={800} translateYStart={15}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 96, opacity: 0.6 }}>
                <Github color="#475569" size={26} />
                <Twitter color="#00F0FF" size={26} />
                <Linkedin color="#8A2BE2" size={26} />
            </View>
        </CustomFadeIn>
    </View>
));
MarketingContent.displayName = 'MarketingContent';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SignInScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [successState, setSuccessState] = useState<'none' | 'login' | 'signup'>('none');
    const [message, setMessage] = useState<{ type: MessageType; text: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const buttonColor = useSharedValue(0);

    useEffect(() => {
        if (successState !== 'none' || message?.type === 'success') {
            buttonColor.value = withTiming(1, { duration: 300 });
        } else if (message?.type === 'error') {
            buttonColor.value = withTiming(2, { duration: 300 });
        } else if (message?.type === 'warning') {
            buttonColor.value = withTiming(3, { duration: 300 });
        } else {
            buttonColor.value = withTiming(0, { duration: 300 });
        }
    }, [successState, message]);

    const animatedButtonStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(buttonColor.value, [0, 1, 2, 3], ['rgba(0, 240, 255, 0.1)', 'rgba(50, 255, 0, 0.15)', 'rgba(244, 63, 94, 0.1)', 'rgba(245, 158, 11, 0.1)']);
        const borderColor = interpolateColor(buttonColor.value, [0, 1, 2, 3], ['rgba(0, 240, 255, 0.3)', 'rgba(50, 255, 0, 0.5)', 'rgba(244, 63, 94, 0.4)', 'rgba(245, 158, 11, 0.4)']);
        return { backgroundColor, borderColor };
    });

    const handleAction = async () => {
        setMessage(null);
        const trimmedEmail = email.trim();
        setLoading(true);

        if (authMode === 'sign-in') {
            const validation = AuthValidator.validateSignIn(trimmedEmail, password);
            if (!validation.valid) {
                setLoading(false);
                return setMessage({ type: 'error', text: validation.error || 'Invalid input.' });
            }
            const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
            if (error) {
                setMessage(mapAuthError(error.message));
                setLoading(false);
            } else {
                setLoading(false);
                setSuccessState('login');
                setTimeout(() => router.replace('/(tabs)/dashboard'), 1500);
            }
        } else {
            if (!agreedToTerms) {
                setLoading(false);
                return setMessage({ type: 'warning', text: 'You must agree to the Terms of Service and Privacy Policy.' });
            }
            const validation = AuthValidator.validateSignUp(trimmedEmail, password, confirmPassword, fullName);
            if (!validation.valid) {
                setLoading(false);
                return setMessage({ type: 'error', text: validation.error || 'Invalid input.' });
            }
            const { error } = await supabase.auth.signUp({
                email: trimmedEmail,
                password,
                options: { data: { full_name: fullName.trim() } }
            });
            if (error) {
                setMessage(mapAuthError(error.message));
                setLoading(false);
            } else {
                setLoading(false);
                setSuccessState('signup');
                setTimeout(() => {
                    setSuccessState('none');
                    setAuthMode('sign-in');
                    setPassword('');
                    setConfirmPassword('');
                    setMessage({ type: 'success', text: 'Account created. Please sign in.' });
                }, 2000);
            }
        }
    };

    const handleGitHubSignIn = async () => {
        setIsGoogleLoading(true);
        setMessage(null);
        try {
            if (IS_WEB) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
                return;
            }
            const redirectUri = AuthSession.makeRedirectUri({ scheme: 'opushunter' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: { redirectTo: redirectUri, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (!data?.url) throw new Error('OAuth Portal URL could not be generated.');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

            if (result.type === 'success' && result.url) {
                const urlParts = result.url.split('#');
                const hashParams = urlParts[1];
                const queryParams = result.url.split('?')[1];
                const params = new URLSearchParams(hashParams || queryParams || '');
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                    if (sessionError) throw sessionError;
                    setIsGoogleLoading(false);
                    setSuccessState('login');
                    setTimeout(() => router.replace('/(tabs)/dashboard'), 1500);
                } else {
                    throw new Error('Verification failed: Handshake tokens were not returned.');
                }
            } else {
                setIsGoogleLoading(false);
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Identity link failed. Please try again.' });
            setIsGoogleLoading(false);
        }
    };

    // Inline form JSX (shared logic) rendered for both desktop and mobile
    const renderForm = () => (
        <Animated.View layout={Layout.springify().damping(20).stiffness(150)} style={styles.formContainer}>
            {successState !== 'none' ? (
                <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(300)} style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={80} color="#00F0FF" />
                    <Text className="text-[#00F0FF] text-lg font-black uppercase tracking-widest mt-6 text-center">
                        {successState === 'login' ? 'Access Granted' : 'Account Vault Created'}
                    </Text>
                    <Text className="text-white/50 text-[10px] uppercase tracking-widest mt-2 text-center">
                        {successState === 'login' ? 'Synchronizing pipeline...' : 'Preparing secure connection...'}
                    </Text>
                </Animated.View>
            ) : (
                <>
                    <View className="mb-6">
                        <View style={styles.tabContainer}>
                            <TouchableOpacity onPress={() => { setAuthMode('sign-in'); setConfirmPassword(''); setFullName(''); }} activeOpacity={0.8} style={[styles.tabButton, authMode === 'sign-in' ? styles.tabActive : styles.tabInactive]}>
                                <Text style={[styles.tabText, authMode === 'sign-in' ? styles.tabTextActive : styles.tabTextInactive]}>SIGN IN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setAuthMode('sign-up')} activeOpacity={0.8} style={[styles.tabButton, authMode === 'sign-up' ? styles.tabActive : styles.tabInactive]}>
                                <Text style={[styles.tabText, authMode === 'sign-up' ? styles.tabTextActive : styles.tabTextInactive]}>SIGN UP</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {authMode === 'sign-up' && (
                        <Animated.View entering={FadeInRight.springify()} exiting={FadeOutUp}>
                            <FormField label="Full Name" icon={User}>
                                <TextInput className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none" placeholder="John Doe" placeholderTextColor="#475569" value={fullName} onChangeText={setFullName} editable={!loading} />
                            </FormField>
                        </Animated.View>
                    )}

                    <FormField label="Email" icon={Mail}>
                        <TextInput className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none" placeholder="Enter Your Address" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} autoCorrect={false} />
                    </FormField>

                    <View style={{ marginBottom: authMode === 'sign-up' ? 12 : 0 }}>
                        <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1">PASSWORD</Text>
                        <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-16 flex-row items-center px-4">
                            <Lock size={18} color="#A1A1AA" />
                            <TextInput className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none" placeholder="Min. 10 characters" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!loading} autoCapitalize="none" autoCorrect={false} />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                {showPassword ? <EyeOff size={14} color="#ccccde" /> : <Eye size={18} color="#ccccde" />}
                            </TouchableOpacity>
                        </View>
                        {authMode === 'sign-up' && <PasswordStrengthMeter password={password} />}
                    </View>

                    {authMode === 'sign-up' && (
                        <Animated.View entering={FadeInRight.delay(100).springify()} exiting={FadeOutUp}>
                            <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1 mt-2">CONFIRM PASSWORD</Text>
                            <View className={cn('border rounded-2xl h-16 flex-row items-center px-4', confirmPassword.length > 0 && password !== confirmPassword ? 'border-rose-500/50' : password === confirmPassword && confirmPassword.length > 0 ? 'border-[#00F0FF]/50' : 'border-white/10')} style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <Fingerprint size={18} color="#A1A1AA" />
                                <TextInput className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none" placeholder="Re-enter Password" placeholderTextColor="#475569" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} editable={!loading} autoCapitalize="none" autoCorrect={false} />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                    {showConfirm ? <EyeOff size={14} color="#ccccde" /> : <Eye size={18} color="#ccccde" />}
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => { if (!agreedToTerms) setShowTermsModal(true); else setAgreedToTerms(false); }} className="flex-row items-start gap-3 mt-4 mb-2" activeOpacity={0.7}>
                                {agreedToTerms ? <CheckCircle2 size={20} color="#00F0FF" /> : <Circle size={20} color="rgba(255,255,255,0.2)" />}
                                <Text className="flex-1 text-white/40 text-[11px] leading-5">
                                    I agree to the <Text onPress={() => setShowTermsModal(true)} className="font-bold text-[#00F0FF]">Terms of Service</Text> and <Text onPress={() => setShowTermsModal(true)} className="font-bold text-[#00F0FF]">Privacy Policy</Text>
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {message && successState === 'none' && (
                        <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 24, borderRadius: 12, borderWidth: 1, backgroundColor: message.type === 'error' ? 'rgba(244, 63, 94, 0.1)' : message.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 240, 255, 0.1)', borderColor: message.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : message.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 240, 255, 0.3)' }}>
                            <View style={{ marginRight: 12 }}>
                                {message.type === 'error' && <AlertCircle size={18} color="#F43F5E" />}
                                {message.type === 'warning' && <AlertTriangle size={18} color="#F59E0B" />}
                                {message.type === 'success' && <CheckCircle2 size={18} color="#00F0FF" />}
                            </View>
                            <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: message.type === 'error' ? '#F43F5E' : message.type === 'warning' ? '#F59E0B' : '#00F0FF' }}>{message.text}</Text>
                        </Animated.View>
                    )}

                    <Animated.View style={[animatedButtonStyle, { borderRadius: 20, borderWidth: 1, marginTop: 16 }]}>
                        <TouchableOpacity onPress={handleAction} disabled={loading || successState !== 'none'} activeOpacity={0.8} className="flex-row items-center justify-center h-[60px]">
                            {loading ? <ActivityIndicator color="#00F0FF" /> : <Text className="text-base font-black tracking-widest text-[#00F0FF] uppercase">{authMode === 'sign-up' ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>}
                        </TouchableOpacity>
                    </Animated.View>

                    <View pointerEvents={successState !== 'none' ? 'none' : 'auto'} style={{ opacity: successState !== 'none' ? 0.5 : 1 }}>
                        <View className="flex-row items-center my-6 opacity-30">
                            <View className="flex-1 h-[1px] bg-[#00F0FF]" />
                            <Text className="px-4 text-[14px] font-bold text-[#00F0FF] uppercase tracking-widest">OPUS</Text>
                            <View className="flex-1 h-[1px] bg-[#00F0FF]" />
                        </View>
                        <TouchableOpacity onPress={handleGitHubSignIn} disabled={isGoogleLoading || loading || successState !== 'none'} activeOpacity={0.7} className="flex-row items-center justify-center py-4 mb-3 bg-[#0A0A0F] border rounded-xl border-white/20">
                            {isGoogleLoading ? <ActivityIndicator color="#00F0FF" size="small" /> : (
                                <View className="flex-row items-center gap-3">
                                    <Github size={16} color="#FFFFFF" />
                                    <Text className="text-xs font-bold tracking-widest text-white uppercase">SIGN IN WITH GITHUB</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </Animated.View>
    );

    return (
        <View className="flex-1 bg-[#020205]">
            {isGoogleLoading && (
                <Animated.View entering={FadeInDown.duration(300)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,2,5,0.95)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }]}>
                    <ProcessingLoader size={100} color="#00F0FF" />
                    <Text className="text-[#00F0FF] text-[10px] font-black tracking-[4px] uppercase mt-8">Authenticating Pipeline...</Text>
                </Animated.View>
            )}

            <AmbientArchitecture />

            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    {isDesktop ? (
                        <View style={styles.desktopContainer}>
                            <View style={styles.desktopSidebar}>
                                <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ maxWidth: 440, alignSelf: 'center', paddingVertical: 40, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    <BrandHeader />
                                    {renderForm()}
                                    <SecurityFooter />
                                </ScrollView>
                            </View>
                            <ScrollView style={styles.desktopScroll} contentContainerStyle={styles.desktopScrollContent}>
                                <MarketingContent isDesktop={true} />
                            </ScrollView>
                        </View>
                    ) : (
                        <ScrollView style={styles.mobileScroll} contentContainerStyle={styles.mobileScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <View style={styles.mobilePane}>
                                <BrandHeader />
                                {renderForm()}
                                <SecurityFooter />
                            </View>
                            <View className="h-[2px] bg-white/5 my-12 mx-8" />
                            <View style={styles.mobilePane}>
                                <MarketingContent isDesktop={false} />
                            </View>
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>

            <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} onAccept={() => setAgreedToTerms(true)} />
        </View>
    );
}

const styles = StyleSheet.create({
    desktopContainer: { flexDirection: 'row', flex: 1 },
    desktopSidebar: { width: '40%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 48, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(2, 2, 5, 0.4)' },
    desktopScroll: { flex: 1 },
    desktopScrollContent: { padding: 80, paddingBottom: 150, flexGrow: 1, justifyContent: 'center' },
    mobileScroll: { flex: 1 },
    mobileScrollContent: { flexGrow: 1, paddingBottom: 100, alignSelf: 'center', width: '100%', maxWidth: 500 },
    mobilePane: { padding: 24, paddingTop: 40 },
    formContainer: { width: '100%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 18, backgroundColor: 'rgba(10,10,15,0.4)', overflow: 'hidden' },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 4, marginBottom: 24 },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    tabActive: { borderColor: 'rgba(0, 240, 255, 0.3)', backgroundColor: 'rgba(0, 240, 255, 0.1)' },
    tabInactive: { borderColor: 'transparent', backgroundColor: 'transparent' },
    tabText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
    tabTextActive: { color: '#00F0FF' },
    tabTextInactive: { color: 'rgba(255,255,255,0.4)' },
});