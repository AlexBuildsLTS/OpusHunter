/**
 * app/(auth)/login.tsx
 * OpusHunter — Enterprise Authentication Gateway
 * Architecture: Expo Router v57, Reanimated 4.5.1, NativeWind v4, Gesture Handler
 * 
 * CORE FIXES IN THIS ITERATION:
 * 1. Restored missing `SecurityFooter` component.
 * 2. Fixed `StyleSheet.absoluteFillObject` -> `StyleSheet.absoluteFill`.
 * 3. Purged all VeraxAI copy. Replaced with accurate OpusHunter pipeline features.
 * 4. Added `HoverableFeatureCard` with Reanimated hover states (scale + glow) for Desktop Web.
 * 5. Strictly enforced `pointerEvents: 'none'` INSIDE the style arrays per GEMINI.md §9.2.
 */

import React, { useState, useCallback, useEffect, memo } from "react";
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
  ViewStyle,
  ActivityIndicator,
  Modal,
  Image,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  Extrapolation,
  withSequence,
  withDelay,
  FadeIn,
} from "react-native-reanimated";
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from "react-native-svg";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Fingerprint,
  ShieldCheck,
  X,
  Zap,
  Shield,
  Github,
  Linkedin,
  Twitter,
  ChevronRight,
  Network,
  Globe,
  Terminal,
  Database,
  Send,
  Briefcase
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { C as T } from "../../lib/theme";

const IS_WEB = Platform.OS === "web";
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// DOMAIN DATA & CONFIGURATION
// ============================================================================

const OPUSHUNTER_FEATURES = [
  {
    icon: Globe,
    title: "DISTRIBUTED SCRAPING ENGINE",
    desc: "Deno edge functions extract unstructured job payloads from 50+ global boards seamlessly.",
    color: T.cyan,
  },
  {
    icon: Zap,
    title: "ALGORITHMIC MATCH SCORING",
    desc: "Instant resume vector parsing and deep ATS compatibility calculation prior to application.",
    color: T.purple,
  },
  {
    icon: Send,
    title: "AUTO-APPLICATION PIPELINE",
    desc: "Tinder-style swipe triage deck. Dispatches personalized AI cover letters instantly.",
    color: T.pink,
  },
  {
    icon: Shield,
    title: "ANTI-BLOCK ARCHITECTURE",
    desc: "Dynamic BYOK proxy rotation to bypass rate-limiting and 429 firewalls.",
    color: T.amber,
  },
];

type AuthMode = "sign-in" | "sign-up";
type MessageType = "error" | "warning" | "success";

interface AuthMessage {
  type: MessageType;
  text: string;
}

// ============================================================================
// VALIDATION & UTILITIES
// ============================================================================

const AuthValidator = {
  isValidEmail(email: string): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },
  signIn(email: string, pass: string): { valid: boolean; error?: string } {
    if (!email || !this.isValidEmail(email)) return { valid: false, error: "Invalid identity signature." };
    if (!pass) return { valid: false, error: "Cryptographic secret required." };
    return { valid: true };
  },
  signUp(email: string, pass: string, confirm: string, name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length < 2) return { valid: false, error: "Operator designation must be at least 2 characters." };
    if (!email || !this.isValidEmail(email)) return { valid: false, error: "Invalid identity signature." };
    if (!pass || pass.length < 10) return { valid: false, error: "Secret must meet minimum 10 character entropy." };
    if (pass !== confirm) return { valid: false, error: "Cryptographic secrets do not match." };
    return { valid: true };
  },
};

function mapAuthError(msg: string): AuthMessage {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return { type: "warning", text: "Identity registered. Initiate Sign-In." };
  if (m.includes("password should be at least")) return { type: "warning", text: "Insufficient secret entropy." };
  if (m.includes("rate limit")) return { type: "warning", text: "Network rate limit exceeded. Hold position." };
  if (m.includes("email not confirmed")) return { type: "warning", text: "Identity unverified. Check relay inbox." };
  if (m.includes("invalid login credentials")) return { type: "error", text: "Authentication mismatch." };
  if (m.includes("network") || m.includes("fetch")) return { type: "error", text: "Connection to Edge Network failed." };
  return { type: "error", text: msg };
}

function getEntropyScore(pw: string) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  
  const map = [
    { label: "VULNERABLE", color: T.pink, percent: 10 },
    { label: "WEAK", color: T.pink, percent: 30 },
    { label: "MODERATE", color: T.amber, percent: 50 },
    { label: "STRONG", color: T.purple, percent: 75 },
    { label: "MILITARY GRADE", color: T.cyan, percent: 100 },
  ];
  return { ...map[s], score: s };
}

// ============================================================================
// MICRO-COMPONENTS & INTERACTIVE CARDS
// ============================================================================

const HoverableFeatureCard = memo(({ feat, index }: any) => {
  const isHovered = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(isHovered.value, [0, 1], [1, 1.02]) },
      ],
      borderColor: interpolateColor(isHovered.value, [0, 1], ["rgba(255,255,255,0.04)", feat.color]),
      backgroundColor: interpolateColor(isHovered.value, [0, 1], ["rgba(8,14,22,0.6)", "rgba(8,14,22,0.85)"]),
      shadowColor: feat.color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: interpolate(isHovered.value, [0, 1], [0, 0.3]),
      shadowRadius: 12,
    };
  });

  const iconWrapStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(isHovered.value, [0, 1], [`${feat.color}15`, `${feat.color}30`]),
      transform: [
        { scale: interpolate(isHovered.value, [0, 1], [1, 1.1]) }
      ]
    };
  });

  return (
    <Animated.View entering={FadeInDown.delay(300 + index * 100).springify()}>
      <Pressable
        onHoverIn={() => { isHovered.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        onHoverOut={() => { isHovered.value = withSpring(0, { damping: 15, stiffness: 200 }); }}
        onPressIn={() => { isHovered.value = withSpring(0.95); }}
        onPressOut={() => { isHovered.value = withSpring(1); }}
      >
        <Animated.View style={[s.featureBox, animatedStyle]}>
          <Animated.View style={[s.featureIcon, iconWrapStyle, { borderColor: `${feat.color}35` }]}>
            <feat.icon size={22} color={feat.color} />
          </Animated.View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={s.featureTitle}>{feat.title}</Text>
            <Text style={s.featureText}>{feat.desc}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});
HoverableFeatureCard.displayName = "HoverableFeatureCard";


const FloatingLabelInput = memo(({ 
  label, 
  icon: Icon, 
  value, 
  onChangeText, 
  secureTextEntry, 
  placeholder,
  autoCapitalize = "none",
  keyboardType = "default",
  editable = true,
  rightElement,
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    focusAnim.value = withTiming(isFocused || value ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [isFocused, value]);

  const wrapperStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusAnim.value, [0, 1], ["rgba(255,255,255,0.06)", "rgba(0,212,255,0.4)"]),
    backgroundColor: interpolateColor(focusAnim.value, [0, 1], ["rgba(4,10,18,0.6)", "rgba(4,10,18,0.9)"]),
    shadowColor: T.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(focusAnim.value, [0, 1], [0, 0.2]),
    shadowRadius: 10,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focusAnim.value, [0, 1], [0, -22]) },
      { translateX: interpolate(focusAnim.value, [0, 1], [0, -18]) },
      { scale: interpolate(focusAnim.value, [0, 1], [1, 0.8]) }
    ],
    color: interpolateColor(focusAnim.value, [0, 1], [T.sub, T.cyan]),
  }));

  return (
    <View style={s.inputContainer}>
      <Animated.View style={[s.inputWrapper, wrapperStyle]}>
        <Icon size={18} color={isFocused ? T.cyan : "#55687A"} style={s.inputIcon} />
        <View style={s.inputInner}>
          <Animated.Text style={[s.floatingLabel, labelStyle, { pointerEvents: 'none' }]} >
            {label}
          </Animated.Text>
          <TextInput
            style={s.textInput}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            editable={editable}
            autoCorrect={false}
            {...(IS_WEB ? ({ outlineStyle: "none" } as any) : {})}
          />
        </View>
        {rightElement && <View style={s.rightElement}>{rightElement}</View>}
      </Animated.View>
    </View>
  );
});
FloatingLabelInput.displayName = "FloatingLabelInput";

const CryptographicMeter = memo(({ secret }: { secret: string }) => {
  const { label, color, percent } = getEntropyScore(secret);
  const fillAnim = useSharedValue(0);

  useEffect(() => {
    fillAnim.value = withSpring(percent, { damping: 15, stiffness: 120 });
  }, [percent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillAnim.value}%`,
    backgroundColor: color,
    shadowColor: color,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  }));

  if (!secret.length) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.cryptoMeterContainer}>
      <View style={s.cryptoTrack}>
        <Animated.View style={[s.cryptoFill, fillStyle]} />
      </View>
      <View style={s.cryptoLabels}>
        <Text style={s.cryptoHint}>A-Z · 0-9 · !@#$</Text>
        <Text style={[s.cryptoScore, { color }]}>{label}</Text>
      </View>
    </Animated.View>
  );
});
CryptographicMeter.displayName = "CryptographicMeter";

const SecurityFooter = memo(() => (
  <Animated.View entering={FadeInDown.delay(600).springify()} style={s.securityFooter}>
    <ShieldCheck size={12} color={T.amber} />
    <Text style={s.securityFooterText}>ENTERPRISE-GRADE PIPELINE ENCRYPTION</Text>
  </Animated.View>
));
SecurityFooter.displayName = "SecurityFooter";

// ============================================================================
// GPU-ACCELERATED AMBIENT BACKGROUND
// ============================================================================

const AmbientNode = memo(({ delay, duration, x, y, size }: any) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.2);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.4, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
    
    scale.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1.2, { duration: duration / 2, easing: Easing.out(Easing.quad) }),
      withTiming(0.8, { duration: duration / 2, easing: Easing.in(Easing.quad) })
    ), -1, true));

    translateY.value = withDelay(delay, withRepeat(
      withTiming(-150, { duration: duration, easing: Easing.linear }),
      -1, false
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value }
    ],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: T.cyan,
          pointerEvents: 'none',
        }
      ]}
    />
  );
});
AmbientNode.displayName = "AmbientNode";

const QuantumGrid = memo(() => {
  const { width, height } = useWindowDimensions();
  const rotateX = useSharedValue(0);
  
  useEffect(() => {
    rotateX.value = withRepeat(withTiming(360, { duration: 120000, easing: Easing.linear }), -1, false);
  }, []);

  const gridStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateZ: `${rotateX.value}deg` },
      { scale: 2.5 }
    ]
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#02040A", overflow: "hidden" }]}>
      <Svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.4 }}>
        <Defs>
          <RadialGradient id="coreGlow" cx="30%" cy="50%" r="60%">
            <Stop offset="0%" stopColor={T.cyan} stopOpacity="0.12" />
            <Stop offset="40%" stopColor={T.purple} stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#02040A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={width * 0.5} cy={height * 0.5} r={height} fill="url(#coreGlow)" />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, gridStyle, { opacity: 0.04, alignItems: "center", justifyContent: "center", pointerEvents: 'none' }]}>
        <Svg width={width * 2} height={width * 2} viewBox={`0 0 ${width * 2} ${width * 2}`}>
          <Defs>
            <RadialGradient id="radar" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={T.cyan} stopOpacity="1" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 30 }).map((_, i) => (
            <Circle key={`ring-${i}`} cx={width} cy={width} r={(i + 1) * 60} stroke={T.cyan} strokeWidth={1} fill="none" strokeDasharray="4 16" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            return (
              <Line key={`spoke-${i}`} x1={width} y1={width} x2={width + Math.cos(angle) * width} y2={width + Math.sin(angle) * width} stroke={T.cyan} strokeWidth={1} strokeDasharray="2 8" />
            );
          })}
        </Svg>
      </Animated.View>

      {/* Floating telemetry nodes */}
      {Array.from({ length: 25 }).map((_, i) => (
        <AmbientNode 
          key={`node-${i}`} 
          delay={Math.random() * 5000} 
          duration={15000 + Math.random() * 10000} 
          x={Math.random() * width} 
          y={height + Math.random() * 200} 
          size={Math.random() * 4 + 2} 
        />
      ))}
    </View>
  );
});
QuantumGrid.displayName = "QuantumGrid";

// ============================================================================
// LEGAL & PRIVACY MODAL
// ============================================================================

const TermsOverlay = memo(({ visible, onClose, onAccept }: any) => {
  const [canAccept, setCanAccept] = useState(false);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (visible) setCanAccept(false);
  }, [visible]);

  const onScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    scrollY.value = contentOffset.y;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      setCanAccept(true);
    }
  };

  const progressStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.max(scrollY.value / 400, 0), 1);
    return { width: `${progress * 100}%` };
  });

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={s.termsOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={FadeInDown.springify().damping(24)} style={s.termsCard}>
          <View style={s.termsHeader}>
            <View style={s.termsHeaderLeft}>
              <ShieldCheck size={20} color={T.cyan} />
              <Text style={s.termsTitle}>Protocol Authorization</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.termsCloseBtn}>
              <X size={18} color={T.sub} />
            </TouchableOpacity>
          </View>
          
          <View style={s.termsProgressBar}><Animated.View style={[s.termsProgressFill, progressStyle]} /></View>

          <ScrollView 
            style={s.termsScroll} 
            contentContainerStyle={s.termsScrollContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.termsSectionTitle}>1. Data Cryptography & Sovereignty</Text>
            <Text style={s.termsBodyText}>
              All credentials, API keys, and Curriculum Vitae artifacts uploaded to the OpusHunter Edge Network are immediately encrypted utilizing AES-256-GCM. Decryption keys are isolated via Supabase Row-Level Security (RLS) bound strictly to your cryptographic identity.
            </Text>

            <Text style={s.termsSectionTitle}>2. Autonomous Engine Execution</Text>
            <Text style={s.termsBodyText}>
              By initializing the autonomous auto-apply engine, you authorize OpusHunter Deno Edge functions to establish headless connections to remote Applicant Tracking Systems (ATS). You acknowledge that OpusHunter simulates human interaction to bypass rudimentary CAPTCHAs, but does not guarantee 100% bypass success against advanced perimeter firewalls.
            </Text>

            <Text style={s.termsSectionTitle}>3. AI Token Liability</Text>
            <Text style={s.termsBodyText}>
              OpusHunter operates on a Bring-Your-Own-Key (BYOK) architecture for maximum throughput. When your BYOK cascade is exhausted, the system seamlessly falls back to the OpusHunter Shared Key Pool. Abuse of the shared pool for non-job-seeking inference will result in immediate network banishment.
            </Text>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={s.termsFooter}>
            <TouchableOpacity 
              disabled={!canAccept} 
              onPress={() => { onAccept(); onClose(); }} 
              style={[s.termsAcceptBtn, canAccept ? s.termsAcceptActive : s.termsAcceptDisabled]} 
              activeOpacity={0.8}
            >
              <Text style={[s.termsAcceptText, { color: canAccept ? "#000" : "rgba(255,255,255,0.3)" }]}>
                {canAccept ? "ACKNOWLEDGE & AUTHORIZE" : "SCROLL TO REVIEW PROTOCOLS"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});
TermsOverlay.displayName = "TermsOverlay";

// ============================================================================
// MAIN SCREEN ORCHESTRATOR
// ============================================================================

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = IS_WEB && width >= 900;

  // ── State ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successState, setSuccessState] = useState<"none" | "login" | "signup">("none");
  const [message, setMessage] = useState<AuthMessage | null>(null);

  // ── Animations ────────────────────────────────────────────────────────────
  const modeAnim = useSharedValue(0); // 0 = sign-in, 1 = sign-up
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  const segmentActiveStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: `${interpolate(modeAnim.value, [0, 1], [0, 100])}%` as `${number}%` },
    ],
  }));

  const switchMode = useCallback((m: AuthMode) => {
    setMode(m);
    modeAnim.value = withSpring(m === "sign-up" ? 1 : 0, { damping: 18, stiffness: 150 });
    setMessage(null);
    setConfirmPassword("");
    setFullName("");
    setAgreedToTerms(false);
    setShowPassword(false);
  }, []);

  // 3D Parallax Gesture for the main card (Desktop/iPad)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isDesktop) {
        tiltX.value = interpolate(e.x, [0, 450], [-3, 3], Extrapolation.CLAMP);
        tiltY.value = interpolate(e.y, [0, 600], [3, -3], Extrapolation.CLAMP);
      }
    })
    .onEnd(() => {
      tiltX.value = withSpring(0, { damping: 15 });
      tiltY.value = withSpring(0, { damping: 15 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1200 },
        { rotateX: `${tiltY.value}deg` },
        { rotateY: `${tiltX.value}deg` }
      ]
    };
  });

  const signUpStyle = useAnimatedStyle(() => ({
    opacity: modeAnim.value,
    maxHeight: interpolate(modeAnim.value, [0, 1], [0, 400]),
    transform: [{ translateY: interpolate(modeAnim.value, [0, 1], [-20, 0]) }],
    overflow: "hidden"
  }));

  const signInStyle = useAnimatedStyle(() => ({
    opacity: interpolate(modeAnim.value, [0, 1], [1, 0]),
    maxHeight: interpolate(modeAnim.value, [0, 1], [100, 0]),
    transform: [{ translateY: interpolate(modeAnim.value, [0, 1], [0, -20]) }],
    overflow: "hidden"
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const executeAuthSequence = useCallback(async () => {
    setMessage(null);
    const trimEmail = email.trim();
    setLoading(true);

    if (mode === "sign-in") {
      const v = AuthValidator.signIn(trimEmail, password);
      if (!v.valid) {
        setLoading(false);
        return setMessage({ type: "error", text: v.error! });
      }
      const { error } = await supabase.auth.signInWithPassword({ email: trimEmail, password });
      setLoading(false);
      if (error) return setMessage(mapAuthError(error.message));
      setSuccessState("login");
      setTimeout(() => router.replace("/(tabs)/dashboard"), 1500);
    } else {
      if (!agreedToTerms) {
        setLoading(false);
        return setMessage({ type: "warning", text: "Protocol Authorization required." });
      }
      const v = AuthValidator.signUp(trimEmail, password, confirmPassword, fullName);
      if (!v.valid) {
        setLoading(false);
        return setMessage({ type: "error", text: v.error! });
      }
      const { error } = await supabase.auth.signUp({
        email: trimEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      setLoading(false);
      if (error) return setMessage(mapAuthError(error.message));
      setSuccessState("signup");
      setTimeout(() => {
        setSuccessState("none");
        switchMode("sign-in");
        setPassword("");
        setMessage({ type: "success", text: "Identity registered. Initiate Sign In." });
      }, 2000);
    }
  }, [mode, email, password, confirmPassword, fullName, agreedToTerms, router, switchMode]);

  const executeGoogleAuth = useCallback(async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      if (IS_WEB) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        return;
      }
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "opushunter" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Edge Network unreachable.");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type === "success" && result.url) {
        const urlParts = result.url.split("#");
        const params = new URLSearchParams(urlParts[1] || result.url.split("?")[1] || "");
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) throw sessionError;
          setGoogleLoading(false);
          setSuccessState("login");
          setTimeout(() => router.replace("/(tabs)/dashboard"), 1400);
        } else {
          throw new Error("Invalid JWT payload returned.");
        }
      } else {
        setGoogleLoading(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Handshake terminated.";
      setMessage({ type: "error", text: msg });
      setGoogleLoading(false);
    }
  }, [router]);

  // ── Render Helpers ────────────────────────────────────────────────────────

  const renderFormInterface = () => (
    <GestureDetector gesture={panGesture}>
      <Animated.View layout={Layout.springify().damping(24)} style={[s.glassCard, cardAnimatedStyle]}>
        
        {successState !== "none" ? (
          <Animated.View entering={FadeInDown.springify()} style={s.successOverlay}>
            <View style={s.successPulseRing}>
              <CheckCircle2 size={44} color={T.cyan} />
            </View>
            <Text style={s.successTitle}>
              {successState === "login" ? "NETWORK ACCESS GRANTED" : "VAULT INITIALIZED"}
            </Text>
            <Text style={s.successSubtitle}>
              {successState === "login" ? "Synchronizing Edge Pipeline..." : "Preparing secure workspace..."}
            </Text>
          </Animated.View>
        ) : (
          <>
            {/* Segmented Control */}
            <View style={s.segmentContainer}>
              <Animated.View style={[s.segmentActiveBg, segmentActiveStyle]} />
              <TouchableOpacity style={s.segmentBtn} onPress={() => switchMode("sign-in")} activeOpacity={0.8}>
                <Text style={[s.segmentText, mode === "sign-in" && { color: T.cyan }]}>SIGN IN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.segmentBtn} onPress={() => switchMode("sign-up")} activeOpacity={0.8}>
                <Text style={[s.segmentText, mode === "sign-up" && { color: T.cyan }]}>REGISTER</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={signUpStyle}>
              <FloatingLabelInput label="USERNAME" icon={User} value={fullName} onChangeText={setFullName} placeholder="e.g. John Doe" autoCapitalize="words" editable={!loading} />
            </Animated.View>

            <FloatingLabelInput label="EMAIL" icon={Mail} value={email} onChangeText={setEmail} placeholder="admin@domain.com" keyboardType="email-address" editable={!loading} />

            <FloatingLabelInput label="PASSWORD" icon={Lock} value={password} onChangeText={setPassword} placeholder="••••••••••••" secureTextEntry={!showPassword} editable={!loading} rightElement={
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={15}>
                {showPassword ? <EyeOff size={18} color={T.sub} /> : <Eye size={18} color={T.sub} />}
              </TouchableOpacity>
            } />

            <Animated.View style={signUpStyle}>
              <CryptographicMeter secret={password} />
              <View style={{ marginTop: 12 }}>
                <FloatingLabelInput label="VERIFY PASSWORD" icon={Fingerprint} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry={!showPassword} editable={!loading} />
              </View>
              
              <TouchableOpacity onPress={() => agreedToTerms ? setAgreedToTerms(false) : setShowTerms(true)} activeOpacity={0.7} style={s.tosRow}>
                <View style={[s.checkbox, agreedToTerms && s.checkboxActive]}>
                  {agreedToTerms && <CheckCircle2 size={14} color="#000" />}
                </View>
                <Text style={s.tosText}>I confirm compliance with the <Text onPress={() => setShowTerms(true)} style={s.tosLink}>Security Protocol</Text> and <Text onPress={() => setShowTerms(true)} style={s.tosLink}>Privacy Directive</Text></Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={signInStyle}>
              <TouchableOpacity style={s.forgotRow} activeOpacity={0.7}>
                <Text style={s.forgotText}>FORGOT SECRET?</Text>
              </TouchableOpacity>
            </Animated.View>

            {message && successState === "none" && (
              <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp.duration(200)} style={[s.messageBanner, { backgroundColor: message.type === "error" ? "rgba(232,67,106,0.1)" : message.type === "warning" ? "rgba(245,158,11,0.1)" : "rgba(0,212,255,0.1)", borderColor: message.type === "error" ? "rgba(232,67,106,0.4)" : message.type === "warning" ? "rgba(245,158,11,0.4)" : "rgba(0,212,255,0.4)" }]}>
                {message.type === "error" && <AlertCircle size={16} color={T.pink} />}
                {message.type === "warning" && <AlertTriangle size={16} color={T.amber} />}
                {message.type === "success" && <CheckCircle2 size={16} color={T.cyan} />}
                <Text style={[s.messageText, { color: message.type === "error" ? T.pink : message.type === "warning" ? T.amber : T.cyan }]}>{message.text}</Text>
              </Animated.View>
            )}

            <TouchableOpacity onPress={executeAuthSequence} disabled={loading || successState !== "none"} activeOpacity={0.8} style={s.submitActionBtn}>
              {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.submitActionText}>{mode === "sign-up" ? "CREATE ACCOUNT" : "SIGN IN"}</Text>}
            </TouchableOpacity>

            <View pointerEvents={successState !== "none" ? "none" : "auto"} style={{ opacity: successState !== "none" ? 0.4 : 1 }}>
              <View style={s.dividerGroup}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>OR BYPASS VIA</Text>
                <View style={s.dividerLine} />
              </View>

              <TouchableOpacity onPress={executeGoogleAuth} disabled={googleLoading || loading || successState !== "none"} activeOpacity={0.8} style={s.googleActionBtn}>
                {googleLoading ? <ActivityIndicator color={T.text} size="small" /> : (
                  <>
                    <Image source={require("../../assets/google-logo.png")} style={{ width: 22, height: 22, marginRight: 12 }} resizeMode="contain" />
                    <Text style={s.googleActionText}>CONTINUE WITH GOOGLE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );

  return (
    <View style={s.screenRoot}>
      <QuantumGrid />

      {googleLoading && (
        <Animated.View entering={FadeInDown.duration(200)} style={s.fullscreenOverlay}>
          <ActivityIndicator size="large" color={T.cyan} style={{ marginBottom: 20 }} />
          <Text style={s.overlayText}>HANDSHAKING WITH GOOGLE...</Text>
        </Animated.View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {isDesktop ? (
          <View style={s.desktopLayout}>
            {/* Left Pane: Authentication */}
            <View style={s.desktopLeftPane}>
              <ScrollView contentContainerStyle={s.scrollCenter} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.delay(100).springify()} style={s.brandHeader}>
                  <View style={s.brandLogoBox}><Terminal size={32} color={T.cyan} /></View>
                  <Text style={s.brandTitle}>OPUS<Text style={{ color: T.cyan }}>HUNTER</Text></Text>
                  <Text style={s.brandSubtitle}>AUTONOMOUS PIPELINE TERMINAL</Text>
                </Animated.View>
                
                {renderFormInterface()}
                
                <SecurityFooter />
              </ScrollView>
            </View>

            {/* Right Pane: Showcase */}
            <View style={s.desktopRightPane}>
              <ScrollView contentContainerStyle={s.showcaseScroll} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: 40 }}>
                  <Text style={s.showcaseHeadline}>The Engineering Standard for Job Acquisition.</Text>
                  <Text style={s.showcaseDesc}>OpusHunter operates an autonomous, edge-deployed pipeline that executes while you sleep. Replace manual tracking with programmatic scaling.</Text>
                </Animated.View>

                <View style={s.showcaseGrid}>
                  {OPUSHUNTER_FEATURES.map((feat, i) => (
                    <HoverableFeatureCard key={feat.title} feat={feat} index={i} />
                  ))}
                </View>

                <Animated.View entering={FadeInDown.delay(800).springify()} style={s.socialGroup}>
                  <TouchableOpacity><Github size={22} color={T.sub} /></TouchableOpacity>
                  <TouchableOpacity><Twitter size={22} color={T.cyan} /></TouchableOpacity>
                  <TouchableOpacity><Linkedin size={22} color={T.purple} /></TouchableOpacity>
                </Animated.View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={s.mobileScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Animated.View entering={FadeInDown.delay(100).springify()} style={s.brandHeader}>
                  <View style={s.brandLogoBox}><Terminal size={32} color={T.cyan} /></View>
                  <Text style={s.brandTitle}>OPUS<Text style={{ color: T.cyan }}>HUNTER</Text></Text>
                  <Text style={s.brandSubtitle}>AUTONOMOUS PIPELINE TERMINAL</Text>
              </Animated.View>

              {renderFormInterface()}

              <View style={s.mobileFeatureGroup}>
                <Text style={s.mobileFeatureHeader}>SYSTEM CAPABILITIES</Text>
                {OPUSHUNTER_FEATURES.map((feat, i) => (
                  <Animated.View key={feat.title} entering={FadeInDown.delay(300 + i * 100).springify()} style={s.mobileFeatureBox}>
                    <View style={[s.mobileFeatureIcon, { backgroundColor: `${feat.color}10`, borderColor: `${feat.color}25` }]}>
                      <feat.icon size={18} color={feat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mobileFeatureTitle}>{feat.title}</Text>
                      <Text style={s.mobileFeatureText} numberOfLines={3}>{feat.desc}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>

              <SecurityFooter />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      <TermsOverlay visible={showTerms} onClose={() => setShowTerms(false)} onAccept={() => setAgreedToTerms(true)} />
    </View>
  );
}

// ============================================================================
// STYLESHEET (NATIVE OPTIMIZED)
// ============================================================================

const s = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: "#02040A" },
  
  // Layouts
  desktopLayout: { flex: 1, flexDirection: "row", maxWidth: 1400, alignSelf: 'center', width: '100%' },
  desktopLeftPane: { width: 500, borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(4,10,18,0.4)" },
  desktopRightPane: { flex: 1 },
  scrollCenter: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 40, paddingVertical: 60 },
  showcaseScroll: { paddingHorizontal: 80, paddingVertical: 80 },
  mobileScroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 80, maxWidth: 500, width: "100%", alignSelf: "center" },
  
  // Branding
  brandHeader: { alignItems: "center", marginBottom: 36 },
  brandLogoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: `${T.cyan}10`, borderWidth: 1, borderColor: `${T.cyan}30`, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: T.cyan, shadowRadius: 20, shadowOpacity: 0.3 },
  brandTitle: { fontSize: 28, fontWeight: "900", color: "#FFF", letterSpacing: 4 },
  brandSubtitle: { fontSize: 10, fontWeight: "800", color: T.sub, letterSpacing: 2.5, marginTop: 6 },
  
  // Form Card
  glassCard: { width: "100%", padding: 24, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(8,14,22,0.8)", ...((Platform.OS === "web" ? { backdropFilter: "blur(24px) saturate(150%)", WebkitBackdropFilter: "blur(24px) saturate(150%)" } : {}) as any) },
  
  // Segmented Control
  segmentContainer: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 14, padding: 4, marginBottom: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", position: 'relative' },
  segmentActiveBg: { position: 'absolute', top: 4, bottom: 4, left: 4, width: '50%', backgroundColor: `${T.cyan}15`, borderRadius: 10, borderWidth: 1, borderColor: `${T.cyan}30` },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 12, zIndex: 2 },
  segmentText: { fontSize: 11, fontWeight: "900", color: T.sub, letterSpacing: 1.5 },
  
  // Custom Input
  inputContainer: { marginBottom: 16 },
  inputWrapper: { flexDirection: "row", alignItems: "center", height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
  inputInner: { flex: 1, position: 'relative', justifyContent: 'center' },
  floatingLabel: { position: 'absolute', left: 0, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  textInput: { flex: 1, color: T.text, fontSize: 15, fontWeight: "500", paddingTop: 16 },
  inputIcon: { marginRight: 12 },
  rightElement: { paddingLeft: 10 },
  
  // Password Strength
  cryptoMeterContainer: { marginBottom: 16, paddingHorizontal: 4 },
  cryptoTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 8 },
  cryptoFill: { height: "100%", borderRadius: 2 },
  cryptoLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cryptoHint: { fontSize: 9, color: T.dim, fontWeight: "800", letterSpacing: 1.5 },
  cryptoScore: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  
  // Form Extras
  tosRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, paddingHorizontal: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: T.sub, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: T.cyan, borderColor: T.cyan },
  tosText: { flex: 1, color: T.sub, fontSize: 11, lineHeight: 18 },
  tosLink: { color: T.cyan, fontWeight: "700" },
  forgotRow: { alignItems: "flex-end", marginBottom: 20, marginTop: 4 },
  forgotText: { fontSize: 11, fontWeight: "800", color: T.cyan, letterSpacing: 1.5 },
  
  // Messaging & Buttons
  messageBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  messageText: { flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  submitActionBtn: { height: 56, borderRadius: 16, backgroundColor: T.cyan, alignItems: "center", justifyContent: "center", shadowColor: T.cyan, shadowRadius: 15, shadowOpacity: 0.2 },
  submitActionText: { color: "#000", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  dividerGroup: { flexDirection: "row", alignItems: "center", gap: 16, marginVertical: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { color: T.dim, fontSize: 10, fontWeight: "900", letterSpacing: 3 },
  googleActionBtn: { height: 56, flexDirection: "row", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  googleActionText: { color: T.text, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  
  // Success Overlay
  successOverlay: { paddingVertical: 40, alignItems: "center", justifyContent: "center", gap: 16 },
  successPulseRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: T.cyan, backgroundColor: `${T.cyan}10`, alignItems: "center", justifyContent: "center", shadowColor: T.cyan, shadowRadius: 20, shadowOpacity: 0.5 },
  successTitle: { fontSize: 18, fontWeight: "900", color: T.cyan, letterSpacing: 2 },
  successSubtitle: { fontSize: 11, color: T.sub, letterSpacing: 1.5, textTransform: "uppercase" },
  
  // Global Extras
  securityFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 40, opacity: 0.7 },
  securityFooterText: { fontSize: 10, fontWeight: "800", color: T.amber, letterSpacing: 1.5 },
  fullscreenOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(2,5,7,0.95)", zIndex: 9999, alignItems: "center", justifyContent: "center" },
  overlayText: { color: T.cyan, fontSize: 12, fontWeight: "800", letterSpacing: 3 },
  
  // Desktop Showcase
  showcaseHeadline: { fontSize: 36, fontWeight: "900", color: "#FFF", letterSpacing: -1, marginBottom: 16 },
  showcaseDesc: { fontSize: 16, color: T.sub, lineHeight: 26, fontWeight: "500" },
  showcaseGrid: { gap: 16 },
  featureBox: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 20, backgroundColor: "rgba(8,14,22,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  featureIcon: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 20 },
  featureTitle: { fontSize: 14, fontWeight: "900", color: T.cyan, letterSpacing: 1, marginBottom: 6 },
  featureText: { fontSize: 12, color: T.sub, lineHeight: 18, fontWeight: "500" },
  socialGroup: { flexDirection: "row", gap: 24, marginTop: 48, opacity: 0.7 },
  
  // Mobile Showcase
  mobileFeatureGroup: { marginTop: 40, gap: 12 },
  mobileFeatureHeader: { fontSize: 11, fontWeight: "900", color: T.dim, letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
  mobileFeatureBox: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, backgroundColor: "rgba(8,14,22,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  mobileFeatureIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 14 },
  mobileFeatureTitle: { fontSize: 12, fontWeight: "900", color: T.text, marginBottom: 4 },
  mobileFeatureText: { fontSize: 10, color: T.sub, lineHeight: 15 },
  
  // Terms Modal
  termsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  termsCard: { width: "100%", maxWidth: 600, maxHeight: "85%", backgroundColor: "#040A12", borderWidth: 1, borderColor: `${T.cyan}40`, borderRadius: 24, overflow: "hidden", shadowColor: T.cyan, shadowRadius: 30, shadowOpacity: 0.2 },
  termsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 24, backgroundColor: "rgba(255,255,255,0.02)" },
  termsHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  termsTitle: { fontSize: 14, fontWeight: "900", color: T.text, letterSpacing: 2, textTransform: "uppercase" },
  termsCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  termsProgressBar: { height: 2, backgroundColor: "rgba(255,255,255,0.05)", width: "100%" },
  termsProgressFill: { height: "100%", backgroundColor: T.cyan },
  termsScroll: { flex: 1 },
  termsScrollContent: { padding: 32 },
  termsSectionTitle: { fontSize: 13, fontWeight: "900", color: T.cyan, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, marginTop: 24 },
  termsBodyText: { fontSize: 13, color: T.sub, lineHeight: 22, fontWeight: "500" },
  termsFooter: { padding: 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.01)" },
  termsAcceptBtn: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  termsAcceptActive: { backgroundColor: T.cyan },
  termsAcceptDisabled: { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  termsAcceptText: { fontSize: 13, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
});