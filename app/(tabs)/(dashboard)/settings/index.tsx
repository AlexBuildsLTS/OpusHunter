/**
 * app/(tabs)/(dashboard)/settings/index.tsx
 * OpusHunter — Master Command & Settings Menu Hub
 *
 * Cyberpunk/Obsidian aerospace aesthetics with dynamic ambient physics,
 * custom animated SVG reactive header glyph, and GlassCard navigation modules.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui/Input";
import { Button } from "../../../../components/ui/Button";
import { useAuthStore } from "../../../../stores/authStore";
import { supabase } from "../../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, shadows } from "../../../../constants/theme";
import { isSecure } from "../../../../lib/secureStorage";
import {
  User,
  Shield,
  FileText,
  Mail,
  KeyRound,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  Terminal,
  Cpu,
  Activity,
  CheckCircle2,
  Sparkles,
  Zap,
  Info,
  Server,
  Lock,
  Globe,
  Radio,
  ExternalLink,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Svg, {
  Circle,
  G,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

// ─── AMBIENT HEADER GLYPH (Reactive Cybernetic SVG) ─────────────────────────
function AnimatedSettingsIcon({ size = 84 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="coreGlowGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#00F0FF" stopOpacity="0.9" />
            <Stop offset="45%" stopColor="#06B6D4" stopOpacity="0.5" />
            <Stop offset="85%" stopColor="#8A2BE2" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#010710" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00F0FF" />
            <Stop offset="50%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#8A2BE2" />
          </LinearGradient>
          <LinearGradient id="circuitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        {/* Ambient Outer Halo */}
        <Circle
          cx="50"
          cy="50"
          r="48"
          stroke="rgba(0, 240, 255, 0.12)"
          strokeWidth="1"
          strokeDasharray="3, 4"
        />
        <Circle
          cx="50"
          cy="50"
          r="44"
          stroke="rgba(138, 43, 226, 0.18)"
          strokeWidth="0.8"
        />

        {/* Outer Rotating Cyber Gear */}
        <G>
          <Circle
            cx="50"
            cy="50"
            r="36"
            stroke="url(#gearGrad)"
            strokeWidth="2.2"
            strokeDasharray="14, 6"
          />
          {/* 8 Satellite Nodes */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => {
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 36 * Math.cos(rad);
            const y = 50 + 36 * Math.sin(rad);
            return (
              <Circle
                key={`node-${idx}`}
                cx={x}
                cy={y}
                r={idx % 2 === 0 ? "2.5" : "1.8"}
                fill={idx % 2 === 0 ? "#00F0FF" : "#8A2BE2"}
              />
            );
          })}
        </G>

        {/* Inner Counter-Rotating Reticle & Crosshairs */}
        <G>
          <Circle
            cx="50"
            cy="50"
            r="26"
            stroke="rgba(0, 240, 255, 0.45)"
            strokeWidth="1.2"
            strokeDasharray="6, 4"
          />
          <Line
            x1="50"
            y1="20"
            x2="50"
            y2="28"
            stroke="#00F0FF"
            strokeWidth="1.5"
          />
          <Line
            x1="50"
            y1="72"
            x2="50"
            y2="80"
            stroke="#00F0FF"
            strokeWidth="1.5"
          />
          <Line
            x1="20"
            y1="50"
            x2="28"
            y2="50"
            stroke="#00F0FF"
            strokeWidth="1.5"
          />
          <Line
            x1="72"
            y1="50"
            x2="80"
            y2="50"
            stroke="#00F0FF"
            strokeWidth="1.5"
          />
        </G>

        {/* Pulsing Central Reactor Core */}
        <G>
          <Circle cx="50" cy="50" r="19" fill="url(#coreGlowGrad)" />
          <Circle cx="50" cy="50" r="9" fill="#00F0FF" opacity={0.85} />
          <Circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
        </G>
      </Svg>
    </View>
  );
}

// ─── AMBIENT BACKGROUND PARTICLES ───────────────────────────────────────────
function AmbientParticle({
  delay,
  startX,
  startY,
  driftX,
  driftY,
  color,
}: {
  delay: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  color: string;
}) {
  const posX = useSharedValue(startX);
  const posY = useSharedValue(startY);
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    posX.value = withRepeat(
      withSequence(
        withTiming(startX + driftX, {
          duration: 6000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(startX, {
          duration: 6000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
    posY.value = withRepeat(
      withSequence(
        withTiming(startY + driftY, {
          duration: 5000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(startY, {
          duration: 5000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, {
          duration: 3000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.15, {
          duration: 3000 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [delay, startX, startY, driftX, driftY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }, { translateY: posY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ─── SETTINGS HUB MODULE CARD ───────────────────────────────────────────────
interface NavModuleProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeVariant?: "default" | "cyan" | "green" | "amber" | "roleAdmin";
  accentColor: string;
  onPress: () => void;
}

function NavModuleCard({
  icon: Icon,
  title,
  subtitle,
  badgeLabel,
  badgeVariant = "default",
  accentColor,
  onPress,
}: NavModuleProps) {
  const [hovered, setHovered] = useState(false);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.navCardWrap,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <Card
        variant="interactive"
        style={[
          styles.navCard,
          hovered && {
            borderColor: `${accentColor}80`,
            backgroundColor: "rgba(10, 22, 40, 0.85)",
          },
        ]}
      >
        <View
          style={[
            styles.navIconContainer,
            {
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
            },
          ]}
        >
          <Icon size={22} color={accentColor} />
        </View>

        <View style={styles.navTextContainer}>
          <View style={styles.navTitleRow}>
            <Typography variant="body" weight="bold" color="primary">
              {title}
            </Typography>
            {badgeLabel && (
              <Badge label={badgeLabel} variant={badgeVariant} size="sm" />
            )}
          </View>
          <Typography
            variant="caption"
            color="secondary"
            style={{ marginTop: 2, lineHeight: 17 }}
          >
            {subtitle}
          </Typography>
        </View>

        <View
          style={[
            styles.chevronContainer,
            hovered && {
              backgroundColor: `${accentColor}25`,
              borderColor: `${accentColor}50`,
            },
          ]}
        >
          <ChevronRight
            size={18}
            color={hovered ? accentColor : colors.text.dim}
          />
        </View>
      </Card>
    </Pressable>
  );
}

// ─── MASTER SETTINGS SCREEN COMPONENT ───────────────────────────────────────
export default function SettingsScreen() {
  const { profile, signOut, user } = useAuthStore();
  const router = useRouter();

  // Modals
  const [activeModal, setActiveModal] = useState<
    null | "gmail" | "diagnostics"
  >(null);

  // Fetch Connected Emails
  const { data: emails = [] } = useQuery({
    queryKey: ["connected_emails", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("connected_email_accounts")
        .select("*")
        .eq("user_id", profile.id);
      if (error) {
        console.warn("Could not load email accounts", error);
        return [];
      }
      return data || [];
    },
  });

  // The actual OAuth flow lives in the dedicated account-linking screen.
  // Keep this hub action truthful instead of implying a connection succeeded.
  const handleGmailLink = () => {
    setActiveModal(null);
    router.push("/(tabs)/(dashboard)/settings/email-linking" as any);
  };

  const handleSignOut = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await signOut();
    router.replace("/(auth)/auth");
  };

  const isAdmin = profile?.role === "admin";
  const userSeniority = profile?.seniority_level
    ? profile.seniority_level.toUpperCase().replace("_", " ")
    : "CONFIGURED";

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Symmetrical Centered Content Wrapper */}
        <View style={styles.centeredContainer}>
          {/* ── HEADER WITH ANIMATED GLYPH & TELEMETRY BADGES ── */}
          <View style={styles.heroHeader}>
            {/* Ambient Background Particles */}
            <View style={styles.particleCanvas} pointerEvents="none">
              <AmbientParticle
                delay={0}
                startX={10}
                startY={20}
                driftX={40}
                driftY={-15}
                color="#00F0FF"
              />
              <AmbientParticle
                delay={1200}
                startX={180}
                startY={60}
                driftX={-30}
                driftY={25}
                color="#8A2BE2"
              />
              <AmbientParticle
                delay={2400}
                startX={320}
                startY={10}
                driftX={25}
                driftY={30}
                color="#10B981"
              />
              <AmbientParticle
                delay={800}
                startX={250}
                startY={70}
                driftX={-20}
                driftY={-20}
                color="#00F0FF"
              />
            </View>

            <View style={styles.heroHeaderTop}>
              <AnimatedSettingsIcon size={88} />

              <View style={styles.heroHeaderText}>
                <View style={styles.systemStatusRow}>
                  <View style={styles.pulseDot} />
                  <Typography
                    variant="caption"
                    weight="bold"
                    style={styles.systemStatusText}
                  >
                    SYSTEM ARCHITECTURE v2.4 · ONLINE
                  </Typography>
                </View>

                <Typography
                  variant="h2"
                  weight="bold"
                  color="primary"
                  style={styles.heroTitle}
                >
                  Command & Settings Hub
                </Typography>
                <Typography
                  variant="caption"
                  color="secondary"
                  style={styles.heroSubtitle}
                >
                  Configure autonomous hunting parameters, hardware security
                  credentials, and AI inference profile.
                </Typography>
              </View>
            </View>

            {/* Realtime Status Chips Bar */}
            <View style={styles.statusChipsRow}>
              <View style={styles.statusChip}>
                <Radio size={12} color={colors.accent.green} />
                <Typography
                  variant="caption"
                  weight="bold"
                  style={{ color: colors.accent.green, fontSize: 11 }}
                >
                  SUPABASE CLOUD: SYNCED
                </Typography>
              </View>

              <View style={styles.statusChip}>
                <Cpu size={12} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  style={{ color: colors.accent.cyan, fontSize: 11 }}
                >
                  {isSecure()
                    ? "HARDWARE ENCLAVE: ACTIVE"
                    : "SECURE STORAGE: ACTIVE"}
                </Typography>
              </View>

              <Pressable
                onPress={() => setActiveModal("diagnostics")}
                style={[styles.statusChip, styles.statusChipInteractive]}
              >
                <Activity size={12} color={colors.accent.amber} />
                <Typography
                  variant="caption"
                  weight="bold"
                  style={{ color: colors.accent.amber, fontSize: 11 }}
                >
                  DIAGNOSTICS & TELEMETRY
                </Typography>
              </Pressable>
            </View>
          </View>

          {/* ── SECTION 1: CORE IDENTITY & ENCLAVE ── */}
          <View style={styles.sectionHeader}>
            <Typography
              variant="caption"
              weight="bold"
              color="secondary"
              style={styles.sectionTag}
            >
              CORE IDENTITY & SECURITY ENCLAVE
            </Typography>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.modulesGrid}>
            <NavModuleCard
              icon={User}
              title="Profile & Seniority Core"
              subtitle="Target job titles, multi-level seniority levels, AI bio narrative tone, and location context."
              badgeLabel={userSeniority}
              badgeVariant="cyan"
              accentColor={colors.accent.cyan}
              onPress={() =>
                router.navigate("/(tabs)/(dashboard)/settings/profile" as any)
              }
            />

            <NavModuleCard
              icon={Shield}
              title="Security & Enclave Vault"
              subtitle="Hardware Vault PIN, Biometric unlock, Argon2/Bcrypt password re-encryption, and zero-knowledge BYOK API keys."
              badgeLabel={isSecure() ? "ENCLAVE ACTIVE" : "KEYCHAIN READY"}
              badgeVariant="green"
              accentColor="#10B981"
              onPress={() =>
                router.navigate("/(tabs)/(dashboard)/settings/vault" as any)
              }
            />
          </View>

          {/* ── SECTION 2: INTELLIGENCE & AUTOMATION ── */}
          <View style={styles.sectionHeader}>
            <Typography
              variant="caption"
              weight="bold"
              color="secondary"
              style={styles.sectionTag}
            >
              INTELLIGENCE & AUTOMATION
            </Typography>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.modulesGrid}>
            <NavModuleCard
              icon={FileText}
              title="Document Intelligence Hub"
              subtitle="CVs, resumes, professional cloud certifications, and AI semantic vector extraction."
              badgeLabel="AI EXTRACTED"
              badgeVariant="amber"
              accentColor={colors.accent.amber}
              onPress={() =>
                router.navigate("/(tabs)/(dashboard)/settings/documents" as any)
              }
            />

            <NavModuleCard
              icon={SlidersHorizontal}
              title="Autonomous Pipeline Rules"
              subtitle="Minimum match score thresholds, minimum salary filter, blacklisted keywords, and auto-dispatch rules."
              badgeLabel="RULES ACTIVE"
              badgeVariant="default"
              accentColor="#A855F7"
              onPress={() => router.navigate("/(tabs)/(dashboard)/rules" as any)}
            />
          </View>

          {/* ── SECTION 3: SYSTEM INTEGRATIONS & ADMIN ── */}
          <View style={styles.sectionHeader}>
            <Typography
              variant="caption"
              weight="bold"
              color="secondary"
              style={styles.sectionTag}
            >
              INTEGRATIONS & SYSTEM CONTROLS
            </Typography>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.modulesGrid}>
            {/* Gmail OAuth Card */}
            <NavModuleCard
              icon={Mail}
              title="Gmail Communication Sync"
              subtitle={
                emails.length > 0
                  ? `Connected: ${emails[0].email} (Auto-syncing company replies & invites)`
                  : "Link your Google account to automatically ingest interview offers and HR messages."
              }
              badgeLabel={emails.length > 0 ? "LINKED ✓" : "UNLINKED"}
              badgeVariant={emails.length > 0 ? "green" : "default"}
              accentColor={emails.length > 0 ? "#10B981" : colors.accent.cyan}
              onPress={() => setActiveModal("gmail")}
            />

            {/* Email Account Linking */}
            <NavModuleCard
              icon={Mail}
              title="Email Accounts & Auto-Apply"
              subtitle="Link Gmail and Outlook accounts for sending job applications. Set primary sender account."
              badgeLabel="SETUP"
              badgeVariant="cyan"
              accentColor={colors.accent.cyan}
              onPress={() => router.push("/(tabs)/(dashboard)/settings/email-linking" as any)}
            />

            {/* Conditional Admin Hub */}
            {isAdmin && (
              <NavModuleCard
                icon={Terminal}
                title="System Telemetry & Admin Console"
                subtitle="Manage registered users, master system API keys, and edge function execution telemetry."
                badgeLabel="ROOT LEVEL"
                badgeVariant="roleAdmin"
                accentColor="#EF4444"
                onPress={() => router.push("/(tabs)/admin" as any)}
              />
            )}
          </View>

          {/* ── FOOTER: USER TIER & SIGN OUT ── */}
          <Card variant="elevated" style={styles.tierFooterCard}>
            <View style={styles.tierInfoRow}>
              <View style={styles.tierLeft}>
                <View style={styles.tierAvatar}>
                  <Typography
                    variant="body"
                    weight="bold"
                    style={{ color: colors.accent.cyan }}
                  >
                    {(
                      profile?.first_name?.[0] ||
                      user?.email?.[0] ||
                      "H"
                    ).toUpperCase()}
                  </Typography>
                </View>
                <View>
                  <Typography variant="body" weight="bold" color="primary">
                    {profile?.first_name
                      ? `${profile.first_name} ${profile.last_name || ""}`
                      : user?.email || "OpusHunter Member"}
                  </Typography>
                  <Typography variant="caption" color="dim">
                    {user?.email || "Authenticated Operator"}
                  </Typography>
                </View>
              </View>

              <View style={styles.tierRight}>
                <Badge
                  variant={
                    profile?.role === "admin"
                      ? "roleAdmin"
                      : profile?.role === "premium"
                        ? "rolePremium"
                        : "roleMember"
                  }
                  label={profile?.role?.toUpperCase() || "MEMBER"}
                  dot
                />
              </View>
            </View>

            <View style={styles.footerActionDivider} />

            <View style={styles.footerActionsRow}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setActiveModal("diagnostics")}
                style={{ flexDirection: "row", gap: 6 }}
              >
                <Server size={14} color={colors.text.secondary} />
                <Typography variant="caption" color="secondary">
                  System Diagnostics
                </Typography>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onPress={handleSignOut}
                style={{ flexDirection: "row", gap: 6 }}
              >
                <LogOut size={14} color={colors.accent.red} />
                <Typography
                  variant="caption"
                  weight="bold"
                  style={{ color: colors.accent.red }}
                >
                  Sign Out Session
                </Typography>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* ── GMAIL INTEGRATION MODAL ── */}
      <Modal
        visible={activeModal === "gmail"}
        onClose={() => setActiveModal(null)}
        title="Connected Email & Interview Scanner"
      >
        <View style={styles.modalBody}>
          <Typography
            variant="bodySm"
            color="secondary"
            style={{ lineHeight: 20 }}
          >
            Connect your Gmail inbox via OAuth to enable autonomous detection of
            interview requests, assessment invites, and recruitment feedback.
          </Typography>

          {emails && emails.length > 0 ? (
            <Card style={styles.connectedEmailBadge}>
              <CheckCircle2 size={18} color={colors.accent.green} />
              <View style={{ flex: 1 }}>
                <Typography variant="bodySm" weight="bold" color="primary">
                  {emails[0].email}
                </Typography>
                <Typography variant="caption" color="dim">
                  Status: Active polling and invite detection enabled
                </Typography>
              </View>
            </Card>
          ) : (
            <View style={styles.gmailBenefitBox}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Zap size={16} color={colors.accent.cyan} />
                <Typography variant="caption" weight="bold" color="primary">
                  Real-Time Pipeline Status Auto-Transition
                </Typography>
              </View>
              <Typography
                variant="caption"
                color="dim"
                style={{ marginTop: 4 }}
              >
                When an employer replies to an auto-applied job, OpusHunter will
                automatically move the job from "Applied" to "Interview" in your
                Pipeline.
              </Typography>
            </View>
          )}

          <Button
            variant={emails.length > 0 ? "secondary" : "primary"}
            size="md"
            onPress={handleGmailLink}
            style={{ width: "100%", marginTop: 8 }}
          >
            {emails.length > 0
              ? "Manage Gmail connection"
              : "Open Gmail authorization"}
          </Button>
        </View>
      </Modal>

      {/* ── TELEMETRY & SYSTEM DIAGNOSTICS MODAL ── */}
      <Modal
        visible={activeModal === "diagnostics"}
        onClose={() => setActiveModal(null)}
        title="OpusHunter Telemetry & Engine Status"
      >
        <View style={styles.modalBody}>
          <View style={styles.diagGrid}>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                CLIENT ENGINE
              </Typography>
              <Typography variant="bodySm" weight="bold" color="primary">
                OpusHunter v2.4.0
              </Typography>
            </View>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                RUNTIME HOST
              </Typography>
              <Typography variant="bodySm" weight="bold" color="primary">
                {Platform.OS.toUpperCase()} (Expo 57)
              </Typography>
            </View>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                DATABASE
              </Typography>
              <Typography
                variant="bodySm"
                weight="bold"
                style={{ color: colors.accent.green }}
              >
                Supabase pg16 (Connected)
              </Typography>
            </View>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                SECURITY ENCLAVE
              </Typography>
              <Typography
                variant="bodySm"
                weight="bold"
                style={{ color: colors.accent.cyan }}
              >
                {isSecure()
                  ? "Hardware Keystore / Keychain"
                  : "Web Local Secure Vault"}
              </Typography>
            </View>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                AI INFERENCE PROVIDER
              </Typography>
              <Typography variant="bodySm" weight="bold" color="primary">
                Gemini 3.1 Flash Lite / Anthropic
              </Typography>
            </View>
            <View style={styles.diagItem}>
              <Typography variant="caption" color="dim">
                OPERATOR ID
              </Typography>
              <Typography
                variant="caption"
                weight="bold"
                color="secondary"
                numberOfLines={1}
              >
                {user?.id || "N/A"}
              </Typography>
            </View>
          </View>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => setActiveModal(null)}
            style={{ alignSelf: "flex-end", marginTop: 12 }}
          >
            Close Diagnostics
          </Button>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 130,
    alignItems: "center",
  },
  centeredContainer: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },

  // ── HERO HEADER ──
  heroHeader: {
    padding: 24,
    borderRadius: radius.xl,
    backgroundColor: "rgba(6, 15, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.22)",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  particleCanvas: {
    ...StyleSheet.absoluteFill,
  },
  heroHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  heroHeaderText: {
    flex: 1,
    minWidth: 260,
  },
  systemStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent.green,
  },
  systemStatusText: {
    color: colors.accent.cyan,
    letterSpacing: 1.2,
    fontSize: 11,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 6,
    lineHeight: 18,
  },
  statusChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statusChipInteractive: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },

  // ── SECTION DIVIDERS ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTag: {
    letterSpacing: 1.1,
    fontSize: 11,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // ── MODULES GRID ──
  modulesGrid: {
    gap: 12,
    marginBottom: 16,
  },
  navCardWrap: {
    width: "100%",
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: "rgba(6, 15, 30, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    gap: 16,
  },
  navIconContainer: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navTextContainer: {
    flex: 1,
  },
  navTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── TIER FOOTER CARD ──
  tierFooterCard: {
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: "rgba(6, 15, 30, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 12,
  },
  tierInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  tierLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  tierRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerActionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 16,
  },
  footerActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },

  // ── MODAL STYLING ──
  modalBody: {
    gap: 16,
    paddingTop: 8,
  },
  connectedEmailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  gmailBenefitBox: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 240, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.18)",
  },
  diagGrid: {
    gap: 12,
  },
  diagItem: {
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
});
