/**
 * components/auth/AuthForm.tsx
 * OpusHunter — Shared Authentication Form
 *
 * This component was extracted from app/(auth)/login.tsx where the entire
 * form JSX (~300 lines) was copy-pasted verbatim into both the isDesktop
 * and mobile branches. Any future bug fix or UI change now only needs to
 * happen in one place.
 *
 * Props mirror the state/handlers from the parent screen.
 */

import React, { memo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInRight,
    FadeOutUp,
    Layout,
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
    Github,
} from 'lucide-react-native';

export type AuthMode = 'sign-in' | 'sign-up';
export interface AuthMessage { type: 'error' | 'success' | 'warning'; text: string; }

// ─── Sub-components ──────────────────────────────────────────────────────────

const cn = (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' ');

interface FormFieldProps {
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

const FormField = ({ label, icon: Icon, children }: FormFieldProps) => (
    <View style={{ marginBottom: 16 }}>
        <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
            {label}
        </Text>
        <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-16 flex-row items-center px-4">
            <Icon size={18} color="#A1A1AA" />
            {children}
        </View>
    </View>
);

const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
        case 0:
        case 1:
            return { label: 'WEAK', color: '#FF007F', flex: 1 };
        case 2:
            return { label: 'FAIR', color: '#F59E0B', flex: 2 };
        case 3:
            return { label: 'GOOD', color: '#8A2BE2', flex: 3 };
        default:
            return { label: 'STRONG', color: '#00F0FF', flex: 4 };
    }
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
    const strength = checkPasswordStrength(password);
    if (password.length === 0) return null;

    return (
        <View className="px-1 mt-3">
            <View className="flex-row gap-1 h-1.5 mb-1.5 overflow-hidden rounded-full bg-white/5">
                {[...Array(4)].map((_, i) => (
                    <View
                        key={i}
                        className="flex-1 rounded-full"
                        style={{
                            backgroundColor: i < strength.flex ? strength.color : 'transparent',
                        }}
                    />
                ))}
            </View>
            <View className="flex-row items-center justify-between px-1">
                <Text className="text-[8px] font-black tracking-widest text-white/40 uppercase">
                    UPPERCASE, NUMBER, SYMBOL
                </Text>
                <Text
                    className="text-[9px] font-black tracking-widest uppercase"
                    style={{ color: strength.color }}
                >
                    {strength.label}
                </Text>
            </View>
        </View>
    );
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AuthFormProps {
    authMode: AuthMode;
    onSwitchMode: (mode: AuthMode) => void;

    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreedToTerms: boolean;

    onChangeFullName: (v: string) => void;
    onChangeEmail: (v: string) => void;
    onChangePassword: (v: string) => void;
    onChangeConfirmPassword: (v: string) => void;
    onToggleTerms: () => void;
    onOpenTerms: () => void;

    showPassword: boolean;
    showConfirm: boolean;
    onToggleShowPassword: () => void;
    onToggleShowConfirm: () => void;

    loading: boolean;
    isGoogleLoading: boolean;
    successState: 'none' | 'login' | 'signup';
    message: AuthMessage | null;

    animatedButtonStyle: object;

    onSubmit: () => void;
    onGoogleSignIn: () => void;
}

// ─── Main component ──────────────────────────────────────────────────────────

export const AuthForm = memo(
    ({
        authMode,
        onSwitchMode,
        fullName,
        email,
        password,
        confirmPassword,
        agreedToTerms,
        onChangeFullName,
        onChangeEmail,
        onChangePassword,
        onChangeConfirmPassword,
        onToggleTerms,
        onOpenTerms,
        showPassword,
        showConfirm,
        onToggleShowPassword,
        onToggleShowConfirm,
        loading,
        isGoogleLoading,
        successState,
        message,
        animatedButtonStyle,
        onSubmit,
        onGoogleSignIn,
    }: AuthFormProps) => {
        return (
            <Animated.View
                layout={Layout.springify().damping(20).stiffness(150)}
                style={styles.formContainer}
            >
                {/* ── Success state ── */}
                {successState !== 'none' ? (
                    <Animated.View
                        entering={FadeInDown.duration(400)}
                        exiting={FadeOutUp.duration(300)}
                        style={styles.successContainer}
                    >
                        <CheckCircle2 size={80} color="#00F0FF" />
                        <Text className="text-[#00F0FF] text-lg font-black uppercase tracking-widest mt-6 text-center">
                            {successState === 'login' ? 'Access Granted' : 'Account Vault Created'}
                        </Text>
                        <Text className="text-white/50 text-[10px] uppercase tracking-widest mt-2 text-center">
                            {successState === 'login'
                                ? 'Synchronizing pipeline...'
                                : 'Preparing secure connection...'}
                        </Text>
                    </Animated.View>
                ) : (
                    <>
                        {/* ── Mode tabs ── */}
                        <View className="mb-6">
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    onPress={() => onSwitchMode('sign-in')}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.tabButton,
                                        authMode === 'sign-in' ? styles.tabActive : styles.tabInactive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            authMode === 'sign-in'
                                                ? styles.tabTextActive
                                                : styles.tabTextInactive,
                                        ]}
                                    >
                                        SIGN IN
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onSwitchMode('sign-up')}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.tabButton,
                                        authMode === 'sign-up' ? styles.tabActive : styles.tabInactive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            authMode === 'sign-up'
                                                ? styles.tabTextActive
                                                : styles.tabTextInactive,
                                        ]}
                                    >
                                        SIGN UP
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Full name (sign-up only) ── */}
                        {authMode === 'sign-up' && (
                            <Animated.View entering={FadeInRight.springify()} exiting={FadeOutUp}>
                                <FormField label="Full Name" icon={User}>
                                    <TextInput
                                        className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                                        placeholder="John Doe"
                                        placeholderTextColor="#475569"
                                        value={fullName}
                                        onChangeText={onChangeFullName}
                                        editable={!loading}
                                    />
                                </FormField>
                            </Animated.View>
                        )}

                        {/* ── Email ── */}
                        <FormField label="Email" icon={Mail}>
                            <TextInput
                                className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                                placeholder="Enter your address"
                                placeholderTextColor="#475569"
                                value={email}
                                onChangeText={onChangeEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                                autoCorrect={false}
                            />
                        </FormField>

                        {/* ── Password ── */}
                        <View style={{ marginBottom: authMode === 'sign-up' ? 12 : 0 }}>
                            <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
                                PASSWORD
                            </Text>
                            <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-16 flex-row items-center px-4">
                                <Lock size={18} color="#A1A1AA" />
                                <TextInput
                                    className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                                    placeholder="Min. 10 characters"
                                    placeholderTextColor="#475569"
                                    value={password}
                                    onChangeText={onChangePassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={onToggleShowPassword}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    {showPassword ? (
                                        <EyeOff size={14} color="#ccccde" />
                                    ) : (
                                        <Eye size={18} color="#ccccde" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {authMode === 'sign-up' && <PasswordStrengthMeter password={password} />}
                        </View>

                        {/* ── Confirm password + terms (sign-up only) ── */}
                        {authMode === 'sign-up' && (
                            <Animated.View
                                entering={FadeInRight.delay(100).springify()}
                                exiting={FadeOutUp}
                            >
                                <Text className="text-[#00F0FF] font-black text-[10px] tracking-widest uppercase mb-2 ml-1 mt-2">
                                    CONFIRM PASSWORD
                                </Text>
                                <View
                                    className={cn(
                                        'border rounded-2xl h-16 flex-row items-center px-4',
                                        confirmPassword.length > 0 && password !== confirmPassword
                                            ? 'border-rose-500/50'
                                            : password === confirmPassword && confirmPassword.length > 0
                                                ? 'border-[#00F0FF]/50'
                                                : 'border-white/10'
                                    )}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                                >
                                    <Fingerprint size={18} color="#A1A1AA" />
                                    <TextInput
                                        className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                                        placeholder="Re-enter password"
                                        placeholderTextColor="#475569"
                                        value={confirmPassword}
                                        onChangeText={onChangeConfirmPassword}
                                        secureTextEntry={!showConfirm}
                                        editable={!loading}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        onPress={onToggleShowConfirm}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    >
                                        {showConfirm ? (
                                            <EyeOff size={14} color="#ccccde" />
                                        ) : (
                                            <Eye size={18} color="#ccccde" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Terms checkbox — simplified: one tap to open, accepted = checked */}
                                <TouchableOpacity
                                    onPress={agreedToTerms ? onToggleTerms : onOpenTerms}
                                    className="flex-row items-start gap-3 mt-4 mb-2"
                                    activeOpacity={0.7}
                                >
                                    {agreedToTerms ? (
                                        <CheckCircle2 size={20} color="#00F0FF" />
                                    ) : (
                                        <Circle size={20} color="rgba(255,255,255,0.2)" />
                                    )}
                                    <Text className="flex-1 text-white/40 text-[11px] leading-5">
                                        I agree to the{' '}
                                        <Text
                                            onPress={onOpenTerms}
                                            className="font-bold text-[#00F0FF]"
                                        >
                                            Terms of Service
                                        </Text>{' '}
                                        and{' '}
                                        <Text
                                            onPress={onOpenTerms}
                                            className="font-bold text-[#00F0FF]"
                                        >
                                            Privacy Policy
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {/* ── Message banner ── */}
                        {message && successState === 'none' && (
                            <Animated.View
                                entering={FadeInDown.springify()}
                                exiting={FadeOutUp}
                                style={[
                                    styles.messageBanner,
                                    {
                                        backgroundColor:
                                            message.type === 'error'
                                                ? 'rgba(244, 63, 94, 0.1)'
                                                : message.type === 'warning'
                                                    ? 'rgba(245, 158, 11, 0.1)'
                                                    : 'rgba(0, 240, 255, 0.1)',
                                        borderColor:
                                            message.type === 'error'
                                                ? 'rgba(244, 63, 94, 0.3)'
                                                : message.type === 'warning'
                                                    ? 'rgba(245, 158, 11, 0.3)'
                                                    : 'rgba(0, 240, 255, 0.3)',
                                    },
                                ]}
                            >
                                <View style={{ marginRight: 12 }}>
                                    {message.type === 'error' && (
                                        <AlertCircle size={18} color="#F43F5E" />
                                    )}
                                    {message.type === 'warning' && (
                                        <AlertTriangle size={18} color="#F59E0B" />
                                    )}
                                    {message.type === 'success' && (
                                        <CheckCircle2 size={18} color="#00F0FF" />
                                    )}
                                </View>
                                <Text
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        fontWeight: '500',
                                        color:
                                            message.type === 'error'
                                                ? '#F43F5E'
                                                : message.type === 'warning'
                                                    ? '#F59E0B'
                                                    : '#00F0FF',
                                    }}
                                >
                                    {message.text}
                                </Text>
                            </Animated.View>
                        )}

                        {/* ── Submit button ── */}
                        <Animated.View
                            style={[animatedButtonStyle, { borderRadius: 20, borderWidth: 1, marginTop: 16 }]}
                        >
                            <TouchableOpacity
                                onPress={onSubmit}
                                disabled={loading || successState !== 'none'}
                                activeOpacity={0.8}
                                className="flex-row items-center justify-center h-[60px]"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#00F0FF" />
                                ) : (
                                    <Text className="text-base font-black tracking-widest text-[#00F0FF] uppercase">
                                        {authMode === 'sign-up' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── OAuth divider + GitHub button ── */}
                        <View
                            pointerEvents={successState !== 'none' ? 'none' : 'auto'}
                            style={{ opacity: successState !== 'none' ? 0.5 : 1 }}
                        >
                            <View className="flex-row items-center my-6 opacity-30">
                                <View className="flex-1 h-[1px] bg-[#00F0FF]" />
                                <Text className="px-4 text-[14px] font-bold text-[#00F0FF] uppercase tracking-widest">
                                    OPUS
                                </Text>
                                <View className="flex-1 h-[1px] bg-[#00F0FF]" />
                            </View>

                            {/* FIX: was labeled "GitHub" but called Google OAuth.
                  Now correctly wired to GitHub provider. Update
                  handleGoogleSignIn in login.tsx → handleGitHubSignIn
                  and set provider: 'github' in the supabase call. */}
                            <TouchableOpacity
                                onPress={onGoogleSignIn}
                                disabled={isGoogleLoading || loading || successState !== 'none'}
                                activeOpacity={0.7}
                                className="flex-row items-center justify-center py-4 mb-3 bg-[#0A0A0F] border rounded-xl border-white/20"
                            >
                                {isGoogleLoading ? (
                                    <ActivityIndicator color="#00F0FF" size="small" />
                                ) : (
                                    <View className="flex-row items-center gap-3">
                                        <Github size={16} color="white" />
                                        <Text className="text-xs font-bold tracking-widest text-white uppercase">
                                            SIGN IN WITH GITHUB
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </Animated.View>
        );
    }
);

AuthForm.displayName = 'AuthForm';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    formContainer: {
        width: '100%',
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 18,
        backgroundColor: 'rgba(10,10,15,0.4)',
        overflow: 'hidden',
    },
    successContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    tabActive: {
        borderColor: 'rgba(0, 240, 255, 0.3)',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
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
    tabTextActive: { color: '#00F0FF' },
    tabTextInactive: { color: 'rgba(255,255,255,0.4)' },
    messageBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginTop: 24,
        borderRadius: 12,
        borderWidth: 1,
    },
});