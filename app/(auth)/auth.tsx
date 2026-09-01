/**
 * app/(auth)/auth.tsx
 * OpusHunter — Single Authentication Screen (Login/Register).
 * Adapted from VeraxAI UX patterns, but re-themed for OpusHunter (aerospace cyan/blue).
 * Uses assets/icon.png as logo. Smooth tab transition, password strength meter.
 * Mobile-friendly terms modal. Google OAuth via Supabase.
 * Works flawlessly on iOS, Android, and Web (Vercel).
 */

import React, { useState, useRef, useEffect } from "react";
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
  Image,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase";
import { colors, radius } from "../../constants/theme";
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
  ShieldCheck,
  X,
  Fingerprint,
  Cpu,
  Zap,
  Send,
  ShieldAlert,
  Terminal,
  Globe,
  Share2,
  ExternalLink,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Typography } from "../../components/ui/Typography";

const APP_ICON = require("../../assets/icon.png");

// ─── Types ─────────────────────────────────────────────────────────────
type AuthMode = "sign-in" | "sign-up";

interface AuthFormProps {
  authMode: AuthMode;
  switchMode: (mode: AuthMode) => void;
  fullName: string;
  setFullName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (agreed: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onForgotSecret: () => void;
  message: { type: "error" | "warning" | "success"; text: string } | null;
  successState: "none" | "login" | "signup";
  setShowTermsModal: (show: boolean) => void;
}

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

// ─── Password Strength Meter ──────────────────────────────────────────────
const checkPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length > 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 0:
    case 1:
      return { label: "WEAK", color: colors.accent.red, flex: 1 };
    case 2:
      return { label: "FAIR", color: colors.accent.amber, flex: 2 };
    case 3:
      return { label: "GOOD", color: colors.accent.cyan, flex: 3 };
    case 4:
      return { label: "STRONG", color: colors.accent.green, flex: 4 };
    default:
      return { label: "WEAK", color: colors.accent.red, flex: 1 };
  }
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const strength = checkPasswordStrength(password);
  if (password.length === 0) return null;

  return (
    <View style={styles.strengthMeter}>
      <View style={styles.strengthBars}>
        {[...Array(4)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              {
                backgroundColor:
                  i < strength.flex ? strength.color : "rgba(255,255,255,0.05)",
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.strengthLabelRow}>
        <Typography variant="caption" color="dim">
          UPPERCASE, NUMBER, SYMBOL
        </Typography>
        <Typography
          variant="caption"
          style={{ color: strength.color, fontWeight: "900" }}
        >
          {strength.label}
        </Typography>
      </View>
    </View>
  );
};

// ─── Terms Modal ─────────────────────────────────────────────────────────
const TermsModal = ({ visible, onClose, onAccept }: TermsModalProps) => {
  const [canAccept, setCanAccept] = useState(false);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  useEffect(() => {
    if (visible) setCanAccept(false);
  }, [visible]);

  const handleContentSizeChange = (_w: number, contentHeight: number) => {
    if (scrollViewHeight > 0 && contentHeight <= scrollViewHeight + 50) {
      setCanAccept(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      setCanAccept(true);
    }
  };

  // Smooth scale + fade entrance for the modal card (Reanimated, 120fps).
  const cardProgress = useSharedValue(0);

  useEffect(() => {
    cardProgress.value = withTiming(visible ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.back(1.2)),
    });
  }, [visible, cardProgress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [
      { scale: 0.92 + cardProgress.value * 0.08 },
      { translateY: (1 - cardProgress.value) * 24 },
    ],
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, cardStyle]}>
          <View style={styles.modalHeader}>
            <ShieldCheck size={20} color={colors.accent.cyan} />
            <Typography variant="bodySm" weight="bold" color="primary">
              Terms & Privacy
            </Typography>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            onScroll={handleScroll}
            onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            style={styles.modalScroll}
          >
            <Typography
              variant="h4"
              weight="bold"
              color="primary"
              style={styles.modalSectionTitle}
            >
              Terms of Service
            </Typography>
            <Typography
              variant="bodySm"
              color="secondary"
              style={styles.modalText}
            >
              By accessing, downloading, or utilizing the OpusHunter platform,
              you expressly agree to comply with these Terms of Service.
              OpusHunter is designed for professional job application
              automation.
            </Typography>

            <Typography
              variant="h4"
              weight="bold"
              color="primary"
              style={styles.modalSectionTitle}
            >
              Acceptable Use
            </Typography>
            <Typography
              variant="bodySm"
              color="secondary"
              style={styles.modalText}
            >
              You agree to use the Service solely for lawful purposes. You are
              strictly prohibited from attempting to reverse engineer,
              decompile, or extract the proprietary scraping algorithms.
            </Typography>

            <Typography
              variant="h4"
              weight="bold"
              color="primary"
              style={styles.modalSectionTitle}
            >
              AI Disclaimer
            </Typography>
            <Typography
              variant="bodySm"
              color="secondary"
              style={styles.modalText}
            >
              OpusHunter leverages state-of-the-art AI models to generate cover
              letters and analyze job descriptions. Due to the probabilistic
              nature of AI, outputs may contain inaccuracies. All AI-generated
              content is provided on an "AS IS" basis.
            </Typography>

            <Typography
              variant="h4"
              weight="bold"
              color="primary"
              style={styles.modalSectionTitle}
            >
              Data Privacy
            </Typography>
            <Typography
              variant="bodySm"
              color="secondary"
              style={styles.modalText}
            >
              Your CV, certifications, and career data are stored securely. You
              may permanently delete your account and all associated data at any
              time through settings.
            </Typography>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Typography
              variant="caption"
              color="dim"
              style={styles.modalFooterText}
            >
              Scroll to bottom to accept
            </Typography>
            <TouchableOpacity
              disabled={!canAccept}
              onPress={() => {
                onAccept();
                onClose();
              }}
              style={[
                styles.modalAcceptBtn,
                !canAccept && styles.modalAcceptBtnDisabled,
              ]}
            >
              <Typography
                variant="bodySm"
                weight="bold"
                style={{
                  color: canAccept ? colors.text.inverse : colors.text.dim,
                }}
              >
                {canAccept ? "I Agree & Accept" : "Read to Accept"}
              </Typography>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Main Auth Screen ──────────────────────────────────────────────────────
export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState<"none" | "login" | "signup">(
    "none",
  );
  const [message, setMessage] = useState<{
    type: "error" | "warning" | "success";
    text: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (loading) return;
    setMessage(null);
    const trimmedEmail = email.trim();
    setLoading(true);

    try {
      if (authMode === "sign-in") {
        if (!trimmedEmail || !password) {
          setMessage({
            type: "error",
            text: "Email and password are required.",
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });
        if (error) throw error;
        setLoading(false);
        setSuccessState("login");
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        // Route guard in app/_layout.tsx owns the redirect: once the session
        // is set (via onAuthStateChange) it routes to /(tabs) or profile-setup.
      } else {
        if (!agreedToTerms) {
          setMessage({
            type: "warning",
            text: "You must agree to the Terms of Service.",
          });
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          setMessage({ type: "error", text: "Full name is required." });
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setMessage({ type: "error", text: "Passwords do not match." });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        setLoading(false);
        setSuccessState("signup");
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        setTimeout(() => {
          setSuccessState("none");
          setAuthMode("sign-in");
          setPassword("");
          setConfirmPassword("");
          setMessage({
            type: "success",
            text: "Account created. Please sign in.",
          });
        }, 2000);
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({
        type: "error",
        text: err.message || "Authentication failed.",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // `window` only exists on web — native uses the app scheme redirect.
      const redirectTo =
        Platform.OS === "web"
          ? window.location.origin + "/(tabs)"
          : "opushunter://(tabs)";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Google sign-in failed.",
      });
    }
  };

  const handleForgotSecret = async () => {
    if (!email.trim()) {
      setMessage({ type: "warning", text: "Enter your email address first." });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setMessage({
        type: "success",
        text: "Password reset link sent to email.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Password reset failed.",
      });
    }
  };

  const switchMode = (mode: "sign-in" | "sign-up") => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAuthMode(mode);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {isDesktop ? (
            <View style={styles.desktopContainer}>
              <View style={styles.desktopSidebar}>
                <ScrollView
                  style={{ flex: 1, width: "100%" }}
                  contentContainerStyle={styles.desktopScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <BrandHeader />
                  <AuthForm
                    authMode={authMode}
                    switchMode={switchMode}
                    fullName={fullName}
                    setFullName={setFullName}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    rememberMe={rememberMe}
                    setRememberMe={setRememberMe}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    loading={loading}
                    onSubmit={handleSubmit}
                    onGoogleSignIn={handleGoogleSignIn}
                    onForgotSecret={handleForgotSecret}
                    message={message}
                    successState={successState}
                    setShowTermsModal={setShowTermsModal}
                  />
                  <SecurityFooter />
                </ScrollView>
              </View>
              <View style={styles.desktopFeatures}>
                <MarketingContent />
              </View>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.mobileScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.mobilePane}>
                <BrandHeader />
                <AuthForm
                  authMode={authMode}
                  switchMode={switchMode}
                  fullName={fullName}
                  setFullName={setFullName}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  rememberMe={rememberMe}
                  setRememberMe={setRememberMe}
                  agreedToTerms={agreedToTerms}
                  setAgreedToTerms={setAgreedToTerms}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onGoogleSignIn={handleGoogleSignIn}
                  onForgotSecret={handleForgotSecret}
                  message={message}
                  successState={successState}
                  setShowTermsModal={setShowTermsModal}
                />
                <SecurityFooter />
              </View>
              <View style={styles.mobileDivider} />
              <View style={styles.mobilePane}>
                <MarketingContent />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAgreedToTerms(true)}
      />
    </View>
  );
}

// ─── Brand Header (Exact Reference Match) ──────────────────────────────────
const BrandHeader = () => (
  <Animated.View entering={FadeInDown.duration(800)} style={styles.brandHeader}>
    <View style={styles.brandHeader}>
      <Image
        source={APP_ICON}
        style={styles.brandIconImage}
        resizeMode="contain"
      />
    </View>
    <View>
      <Typography
        variant="caption"
        style={[styles.brandSubtitle, { color: colors.accent.cyan }]}
      >
        AUTONOMOUS PIPELINE <Terminal size={18} color={colors.accent.green} />
      </Typography>
    </View>
  </Animated.View>
);

// ─── Auth Form ─────────────────────────────────────────────────────────────
const AuthForm = ({
  authMode,
  switchMode,
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  rememberMe,
  setRememberMe,
  agreedToTerms,
  setAgreedToTerms,
  loading,
  onSubmit,
  onGoogleSignIn,
  onForgotSecret,
  message,
  successState,
  setShowTermsModal,
}: AuthFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isSignUp = authMode === "sign-up";

  // Animated tab indicator: slides smoothly between SIGN IN (0) and REGISTER (1).
  // Width/position are derived from the measured container width (padding = 4).
  const [tabWidth, setTabWidth] = useState(0);
  const tabProgress = useSharedValue(isSignUp ? 1 : 0);

  useEffect(() => {
    tabProgress.value = withTiming(isSignUp ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [isSignUp, tabProgress]);

  const indicatorWidth = tabWidth > 0 ? (tabWidth - 8) / 2 : 0;
  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabProgress.value * indicatorWidth }],
    width: indicatorWidth,
  }));

  return (
    <Animated.View
      layout={Layout.springify().damping(20).stiffness(150)}
      style={styles.formContainer}
    >
      {successState !== "none" ? (
        <Animated.View
          entering={FadeInDown.duration(400)}
          exiting={FadeOutUp.duration(300)}
          style={styles.successContainer}
        >
          <CheckCircle2 size={80} color={colors.accent.green} />
          <Typography
            variant="h4"
            weight="bold"
            color="success"
            textAlign="center"
            style={styles.successText}
          >
            {successState === "login" ? "Access Granted" : "Account Created"}
          </Typography>
          <Typography variant="caption" color="secondary" textAlign="center">
            {successState === "login"
              ? "Synchronizing workspace..."
              : "Preparing secure connection..."}
          </Typography>
        </Animated.View>
      ) : (
        <>
          {/* Tab Switch — sliding indicator animates between the two modes */}
          <View
            style={styles.tabContainer}
            onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
          >
            {tabWidth > 0 && (
              <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
            )}
            <TouchableOpacity
              onPress={() => switchMode("sign-in")}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Typography
                variant="caption"
                weight="bold"
                style={{
                  color: !isSignUp ? colors.accent.cyan : colors.text.dim,
                }}
              >
                SIGN IN
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchMode("sign-up")}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Typography
                variant="caption"
                weight="bold"
                style={{
                  color: isSignUp ? colors.accent.cyan : colors.text.dim,
                }}
              >
                REGISTER
              </Typography>
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(160)}
              style={{ marginBottom: 12 }}
            >
              <Typography
                variant="caption"
                weight="bold"
                color="accent"
                style={styles.fieldLabel}
              >
                FULL NAME
              </Typography>
              <View style={styles.inputWrapper}>
                <User size={18} color={colors.text.dim} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.text.dim}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </Animated.View>
          )}

          <View style={{ marginBottom: 12 }}>
            <Typography
              variant="caption"
              weight="bold"
              color="accent"
              style={styles.fieldLabel}
            >
              EMAIL
            </Typography>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={colors.text.dim} />
              <TextInput
                style={styles.input}
                placeholder="admin@gmail.com"
                placeholderTextColor={colors.text.dim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={{ marginBottom: isSignUp ? 12 : 8 }}>
            <Typography
              variant="caption"
              weight="bold"
              color="accent"
              style={styles.fieldLabel}
            >
              PASSWORD
            </Typography>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={colors.text.dim} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor={colors.text.dim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff size={14} color={colors.text.dim} />
                ) : (
                  <Eye size={18} color={colors.text.dim} />
                )}
              </TouchableOpacity>
            </View>
            {isSignUp && <PasswordStrengthMeter password={password} />}
          </View>

          {!isSignUp && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(160)}
              style={styles.authOptionsRow}
            >
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberRow}
                activeOpacity={0.8}
              >
                {rememberMe ? (
                  <CheckCircle2 size={16} color={colors.accent.cyan} />
                ) : (
                  <Circle size={16} color={colors.text.dim} />
                )}
                <Typography variant="caption" color="secondary">
                  Remember me
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity onPress={onForgotSecret} activeOpacity={0.8}>
                <Typography
                  variant="caption"
                  color="accent"
                  style={{ fontWeight: "700" }}
                >
                  FORGOT SECRET?
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          )}

          {isSignUp && (
            <Animated.View
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(160)}
              style={{ marginBottom: 12 }}
            >
              <Typography
                variant="caption"
                weight="bold"
                color="accent"
                style={styles.fieldLabel}
              >
                CONFIRM PASSWORD
              </Typography>
              <View
                style={[
                  styles.inputWrapper,
                  confirmPassword.length > 0 &&
                    password !== confirmPassword &&
                    styles.inputError,
                ]}
              >
                <Fingerprint size={18} color={colors.text.dim} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter Password"
                  placeholderTextColor={colors.text.dim}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={8}
                >
                  {showConfirm ? (
                    <EyeOff size={14} color={colors.text.dim} />
                  ) : (
                    <Eye size={18} color={colors.text.dim} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (!agreedToTerms) setShowTermsModal(true);
                  else setAgreedToTerms(false);
                }}
                style={styles.termsRow}
                activeOpacity={0.7}
              >
                {agreedToTerms ? (
                  <CheckCircle2 size={18} color={colors.accent.cyan} />
                ) : (
                  <Circle size={18} color={colors.text.dim} />
                )}
                <Typography variant="caption" color="dim" style={{ flex: 1 }}>
                  I agree to the{" "}
                  <Text
                    style={{ color: colors.accent.cyan, fontWeight: "700" }}
                    onPress={() => setShowTermsModal(true)}
                  >
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={{ color: colors.accent.cyan, fontWeight: "700" }}
                    onPress={() => setShowTermsModal(true)}
                  >
                    Privacy Policy
                  </Text>
                </Typography>
              </TouchableOpacity>
            </Animated.View>
          )}

          {message && (
            <Animated.View
              entering={FadeInDown.springify()}
              exiting={FadeOutUp}
              style={[
                styles.messageBox,
                styles[
                  message.type === "error"
                    ? "message_error"
                    : message.type === "warning"
                      ? "message_warning"
                      : "message_success"
                ],
              ]}
            >
              {message.type === "error" && (
                <AlertCircle size={18} color={colors.accent.red} />
              )}
              {message.type === "warning" && (
                <AlertTriangle size={18} color={colors.accent.amber} />
              )}
              {message.type === "success" && (
                <CheckCircle2 size={18} color={colors.accent.green} />
              )}
              <Typography
                variant="bodySm"
                color={
                  message.type === "error"
                    ? "error"
                    : message.type === "warning"
                      ? "warning"
                      : "success"
                }
                style={{ flex: 1 }}
              >
                {message.text}
              </Typography>
            </Animated.View>
          )}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={loading || successState !== "none"}
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.accent.cyan} />
            ) : (
              <Typography
                variant="bodySm"
                weight="bold"
                color="accent"
                style={styles.submitBtnText}
              >
                {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
              </Typography>
            )}
          </TouchableOpacity>

          {!isSignUp && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Typography
                  variant="caption"
                  color="dim"
                  style={styles.dividerText}
                >
                  OR BYPASS VIA
                </Typography>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                onPress={onGoogleSignIn}
                style={styles.googleBtn}
                activeOpacity={0.8}
              >
                <Image
                  source={require("../../assets/google-logo.png")}
                  style={{ width: 18, height: 18, marginRight: 8 }}
                />
                <Typography
                  variant="bodySm"
                  weight="bold"
                  style={styles.googleBtnText}
                >
                  CONTINUE WITH GOOGLE
                </Typography>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </Animated.View>
  );
};

// ─── Marketing Content (Exact Reference Match) ─────────────────────────────
const MarketingContent = () => (
  <View style={styles.marketingContainer}>
    <View style={styles.heroTextContainer}>
      <Typography
        variant="h3"
        weight="bold"
        color="primary"
        style={styles.heroTitle}
      >
        OpusHunter Autonomous for Job Applications
      </Typography>
      <Typography
        variant="bodySm"
        color="secondary"
        style={styles.heroSubtitle}
      >
        OpusHunter operates an autonomous, edge-deployed pipeline that executes
        while you sleep. Replace manual tracking with programmatic scaling.
      </Typography>
    </View>

    {[
      {
        icon: Cpu,
        title: "DISTRIBUTED SCRAPING ENGINE",
        desc: "Deno edge functions extract unstructured job payloads from 50+ global boards seamlessly.",
        color: colors.accent.cyan,
      },
      {
        icon: Zap,
        title: "ALGORITHMIC MATCH SCORING",
        desc: "Instant resume vector parsing and deep ATS compatibility calculation prior to application.",
        color: colors.accent.blue,
      },
      {
        icon: Send,
        title: "AUTO-APPLICATION PIPELINE",
        desc: "Tinder-style swipe triage deck. Dispatches personalized AI cover letters instantly.",
        color: colors.accent.red,
      },
      {
        icon: ShieldAlert,
        title: "ANTI-BLOCK ARCHITECTURE",
        desc: "Dynamic BYOK proxy rotation to bypass rate-limiting and 429 firewalls.",
        color: colors.accent.amber,
      },
    ].map((item, index) => {
      const [isHovered, setIsHovered] = useState(false);
      return (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(200 + index * 150).duration(800)}
          style={[
            styles.marketingCard,
            isHovered && {
              borderColor: item.color,
              transform: [{ scale: 1.02 }],
            },
          ]}
          // @ts-ignore
          onMouseEnter={() => setIsHovered(true)}
          // @ts-ignore
          onMouseLeave={() => setIsHovered(false)}
        >
          <View
            style={[
              styles.marketingIcon,
              {
                backgroundColor: `${item.color}15`,
                borderColor: `${item.color}40`,
                borderWidth: 1,
              },
            ]}
          >
            <item.icon size={20} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography
              variant="bodySm"
              weight="bold"
              color="primary"
              style={{ marginBottom: 2 }}
            >
              {item.title}
            </Typography>
            <Typography
              variant="caption"
              color="secondary"
              style={{ lineHeight: 18 }}
            >
              {item.desc}
            </Typography>
          </View>
        </Animated.View>
      );
    })}

    <View style={styles.socialIconsRow}>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://github.com")}
        style={styles.socialBtn}
        accessibilityLabel="GitHub"
      >
        <Globe size={18} color={colors.accent.green} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://twitter.com")}
        style={styles.socialBtn}
        accessibilityLabel="Twitter"
      >
        <Share2 size={18} color={colors.accent.blueGlow} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL("https://linkedin.com")}
        style={styles.socialBtn}
        accessibilityLabel="LinkedIn"
      >
        <ExternalLink size={18} color={colors.accent.cyan} />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Security Footer ───────────────────────────────────────────────────────
const SecurityFooter = () => (
  <Animated.View
    entering={FadeInDown.delay(400).duration(800)}
    style={styles.securityFooter}
  >
    <ShieldCheck size={14} color={colors.accent.amber} />
    <Typography variant="caption" color="warning" style={{ letterSpacing: 1 }}>
      ENTERPRISE-GRADE PIPELINE ENCRYPTION
    </Typography>
  </Animated.View>
);

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  brandIconImage: { width: 40, height: 40 },
  desktopContainer: { flexDirection: "row", flex: 1 },
  desktopSidebar: {
    width: "42%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    borderRightWidth: 1,
    borderRightColor: colors.surface.border,
    backgroundColor: "rgba(10, 15, 29, 0.4)",
  },
  desktopScrollContent: {
    maxWidth: 440,
    alignSelf: "center",
    paddingVertical: 30,
    flexGrow: 1,
    justifyContent: "center",
  },
  desktopFeatures: { flex: 1, padding: 60, justifyContent: "center" },
  mobileScrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
    alignSelf: "center",
    width: "100%",
    maxWidth: 500,
  },
  mobilePane: { padding: 24, paddingTop: 30 },
  mobileDivider: {
    height: 1,
    backgroundColor: colors.surface.border,
    marginVertical: 24,
    marginHorizontal: 24,
  },
  brandHeader: { alignItems: "center", marginBottom: 28 },
  brandLogoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(0, 210, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: { letterSpacing: 2, marginBottom: 4 },
  brandSubtitle: { letterSpacing: 1.5, fontSize: 10, color: colors.text.dim },
  formContainer: {
    width: "100%",
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    overflow: "hidden",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,210,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,210,255,0.3)",
    // Width + translateX are set in the animated style (tabIndicatorStyle).
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  fieldLabel: {
    marginBottom: 6,
    marginLeft: 4,
    fontSize: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    gap: 8,
  },
  inputError: { borderColor: colors.accent.red },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    // @ts-ignore: outlineStyle is a web-only property not in React Native's TextStyle
    outlineStyle: "none" as any,
  },
  authOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  strengthMeter: { marginTop: 8, paddingHorizontal: 4 },
  strengthBars: { flexDirection: "row", gap: 4, height: 4, marginBottom: 6 },
  strengthBar: { flex: 1, borderRadius: 2 },
  strengthLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  message_error: {
    backgroundColor: `${colors.accent.red}1A`,
    borderColor: `${colors.accent.red}4D`,
  },
  message_warning: {
    backgroundColor: `${colors.accent.amber}1A`,
    borderColor: `${colors.accent.amber}4D`,
  },
  message_success: {
    backgroundColor: `${colors.accent.green}1A`,
    borderColor: `${colors.accent.green}4D`,
  },
  submitBtn: {
    backgroundColor: `${colors.accent.cyan}1A`,
    borderWidth: 1,
    borderColor: `${colors.accent.cyan}4D`,
    borderRadius: radius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { letterSpacing: 2 },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surface.border },
  dividerText: { paddingHorizontal: 12, letterSpacing: 1.5, fontSize: 10 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  googleBtnText: { color: "#000000", letterSpacing: 1, fontSize: 13 },
  marketingContainer: { gap: 14 },
  heroTextContainer: { marginBottom: 12 },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: { fontSize: 14, lineHeight: 22 },
  marketingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  marketingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIconsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: "center",
    justifyContent: "center",
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    opacity: 0.8,
  },
  successContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successText: { marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 800,
    maxHeight: "85%",
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: "rgba(0,210,255,0.3)",
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  modalScroll: { padding: 24, flex: 1 },
  modalSectionTitle: { marginTop: 16, marginBottom: 8 },
  modalText: { lineHeight: 20 },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    alignItems: "center",
  },
  modalFooterText: { marginBottom: 8 },
  modalAcceptBtn: {
    width: "100%",
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.cyan,
  },
  modalAcceptBtnDisabled: {
    backgroundColor: colors.surface.border,
    opacity: 0.5,
  },
});
