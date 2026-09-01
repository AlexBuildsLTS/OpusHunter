/**
 * dashboard/pipeline
 * OpusHunter — Visual Onboarding & Strategy Guide.
 * Smooth swipeable glass cards delivering high-impact feature previews,
 * ATS strategies, and actionable pro tips for new users.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Radar,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Target,
  Briefcase,
  TrendingUp,
  Lightbulb,
  ShieldCheck,
  Send,
  Sliders,
} from "lucide-react-native";
import { useAuthStore } from "../../../stores/authStore";
import { SafeAreaWrapper } from "../../../components/shared/SafeAreaWrapper";
import { AnimatedBackground } from "../../../components/shared/AnimatedBackground";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";
import { Card } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { Stepper, useStepperControls } from "../../../components/ui/Stepper";
import { colors, radius } from "../../../constants/theme";

interface SlideData {
  stepBadge: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  mockup: {
    badge: string;
    header: string;
    subtext: string;
    items: { label: string; highlight?: boolean }[];
    metricBadge?: string;
  };
  tip: {
    tag: string;
    headline: string;
    description: string;
  };
}

const SLIDES: SlideData[] = [
  {
    stepBadge: "STEP 01 • DISCOVERY",
    title: "Autonomous Job Radar",
    subtitle:
      "OpusHunter continuously scours verified boards and company portals, matching roles to your precise seniority and compensation targets.",
    icon: Radar,
    color: colors.accent.cyan,
    mockup: {
      badge: "LIVE RADAR ACTIVE",
      header: "Staff / Senior React Native Architect",
      subtext: "Stripe • San Francisco, CA (Remote) • $190k - $240k",
      items: [
        { label: "Matches 98% of your core stack", highlight: true },
        { label: "Posted 12m ago • Verified Greenhouse API" },
        { label: "Zero recruiter spam filter applied" },
      ],
      metricBadge: "98% MATCH",
    },
    tip: {
      tag: "RADAR PRO TIP",
      headline: "Tune Your Targeting Parameters",
      description:
        "Head to Job Configuration to lock your salary floor and target titles. Setting specific seniority filters prevents lower-tier spam matches.",
    },
  },
  {
    stepBadge: "STEP 02 • CONTEXT ENGINE",
    title: "Deep Career Narrative",
    subtitle:
      "Upload your CV once. Our context parser extracts your genuine engineering achievements, quantifiable metrics, and leadership voice.",
    icon: FileText,
    color: colors.accent.blue,
    mockup: {
      badge: "PARSED FINGERPRINT",
      header: "Extracted Career Metrics & Proof Points",
      subtext: "Analyzed 6 key achievements & 18 technical proficiencies",
      items: [
        {
          label: "Scaled micro-frontends to 12M DAU (99.99% uptime)",
          highlight: true,
        },
        { label: "Reduced CI/CD build latency by 45% via TurboRepo" },
        { label: "Mentored 8 senior engineers across 3 distributed squads" },
      ],
      metricBadge: "HIGH IMPACT",
    },
    tip: {
      tag: "RESUME PRO TIP",
      headline: "Quantify Your Accomplishments",
      description:
        "Ensure your resume contains clear numbers ($ saved, % latency cut, user growth). OpusHunter’s AI weaves these metrics directly into recruiter pitches.",
    },
  },
  {
    stepBadge: "STEP 03 • AI TAILORING",
    title: "Triple-Strategy ATS Engine",
    subtitle:
      "For every job found, OpusHunter generates three distinct strategic angles, computes ATS keyword density, and surfaces the winning variant.",
    icon: Sparkles,
    color: colors.accent.cyan,
    mockup: {
      badge: "STRATEGY COMPARISON",
      header: "3 Tailored Cover Letter Variants",
      subtext: "Scored against recruiter ATS keyword models",
      items: [
        {
          label: "A: Direct Impact & Metrics (Score: 98% ATS)",
          highlight: true,
        },
        { label: "B: Technical Architecture Deep-Dive (Score: 95%)" },
        { label: "C: Vision & Cultural Leadership (Score: 92%)" },
      ],
      metricBadge: "98% ATS SCORE",
    },
    tip: {
      tag: "STRATEGY PRO TIP",
      headline: "Match Strategy to Company Stage",
      description:
        "Select 'Direct Impact' for high-growth tech startups. Choose 'Narrative & Leadership' for Principal, Staff, or Director level openings.",
    },
  },
  {
    stepBadge: "STEP 04 • APPLICATION & TRACKING",
    title: "Swipe, Dispatch & Win",
    subtitle:
      "Triage roles with an intuitive card deck. Dispatch personalized applications via connected Gmail and track interviews in real-time.",
    icon: Briefcase,
    color: colors.accent.blue,
    mockup: {
      badge: "PIPELINE PIPELINE",
      header: "Automated Kanban & Follow-up Tracker",
      subtext: "Live status across your active applications",
      items: [
        {
          label: "Discovered (14) ➔ Applied (6) ➔ Interviewing (3)",
          highlight: true,
        },
        { label: "OAuth 2.0 Secure Gmail one-tap dispatch" },
        { label: "Automated 5-day polite follow-up reminders" },
      ],
      metricBadge: "3 INTERVIEWS",
    },
    tip: {
      tag: "SPEED PRO TIP",
      headline: "Apply Within The Golden Hour",
      description:
        "Applications sent within 2 hours of a role posting receive a 3.8x higher interview rate. Use Swipe Deck daily to stay at the top of the recruiter pile.",
    },
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, user } = useAuthStore();
  const [index, setIndex] = useState(0);
  const { goNext, goPrev } = useStepperControls(index, SLIDES.length, setIndex);

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (session || user) {
      router.replace("/(tabs)/(dashboard)" as any);
    } else {
      router.push("/(auth)/auth");
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (session || user) {
      router.replace("/(tabs)/(dashboard)" as any);
    } else {
      router.push("/(auth)/auth");
    }
  };

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <AnimatedBackground />
      <View style={styles.contentWrapper}>
        {/* Top Navigation Bar */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>OPUSHUNTER</Text>
          </View>

          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
          >
            <Text style={styles.skipText}>
              {session || user ? "Skip to Dashboard" : "Skip"}
            </Text>
            <ArrowRight size={13} color={colors.accent.cyan} />
          </Pressable>
        </View>

        {/* Stepper Slide Deck */}
        <View style={styles.stepperContainer}>
          <Stepper
            stepCount={SLIDES.length}
            currentStep={index}
            onStepChange={setIndex}
            showDots={false}
            style={styles.stepper}
          >
            {SLIDES.map((slide, i) => {
              const Icon = slide.icon;
              return (
                <ScrollView
                  key={i}
                  style={styles.slideScroll}
                  contentContainerStyle={styles.slideScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Card variant="elevated" style={styles.mainCard} padding="lg">
                    {/* Card Header & Badge */}
                    <View style={styles.cardTopRow}>
                      <Badge
                        variant={
                          slide.color === colors.accent.cyan ? "cyan" : "blue"
                        }
                        label={slide.stepBadge}
                        size="sm"
                      />
                      <View
                        style={[
                          styles.cardIconBox,
                          {
                            backgroundColor: `${slide.color}15`,
                            borderColor: `${slide.color}40`,
                          },
                        ]}
                      >
                        <Icon size={20} color={slide.color} strokeWidth={2} />
                      </View>
                    </View>

                    {/* Slide Titles */}
                    <Typography
                      variant="h2"
                      weight="bold"
                      color="primary"
                      style={styles.slideTitle}
                    >
                      {slide.title}
                    </Typography>

                    <Typography
                      variant="body"
                      color="secondary"
                      style={styles.slideSubtitle}
                    >
                      {slide.subtitle}
                    </Typography>

                    {/* Interactive Visual Feature Preview */}
                    <View style={styles.previewContainer}>
                      <View style={styles.previewHeaderRow}>
                        <View style={styles.previewLiveDotWrapper}>
                          <View
                            style={[
                              styles.previewLiveDot,
                              { backgroundColor: slide.color },
                            ]}
                          />
                          <Text style={styles.previewBadgeText}>
                            {slide.mockup.badge}
                          </Text>
                        </View>
                        {slide.mockup.metricBadge && (
                          <View
                            style={[
                              styles.metricPill,
                              { borderColor: `${slide.color}50` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.metricPillText,
                                { color: slide.color },
                              ]}
                            >
                              {slide.mockup.metricBadge}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.previewTitle} numberOfLines={1}>
                        {slide.mockup.header}
                      </Text>
                      <Text style={styles.previewSubtext} numberOfLines={1}>
                        {slide.mockup.subtext}
                      </Text>

                      <View style={styles.previewItemsList}>
                        {slide.mockup.items.map((item, itemIdx) => (
                          <View key={itemIdx} style={styles.previewItemRow}>
                            <CheckCircle2
                              size={14}
                              color={
                                item.highlight
                                  ? slide.color
                                  : colors.text.secondary
                              }
                              strokeWidth={item.highlight ? 2.5 : 1.5}
                            />
                            <Text
                              style={[
                                styles.previewItemText,
                                item.highlight &&
                                  styles.previewItemTextHighlight,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Pro Tip Box for New Users */}
                    <View style={styles.tipBox}>
                      <View style={styles.tipHeaderRow}>
                        <Lightbulb size={15} color={colors.accent.amber} />
                        <Text style={styles.tipTagText}>{slide.tip.tag}</Text>
                      </View>
                      <Text style={styles.tipHeadline}>
                        {slide.tip.headline}
                      </Text>
                      <Text style={styles.tipDescription}>
                        {slide.tip.description}
                      </Text>
                    </View>
                  </Card>
                </ScrollView>
              );
            })}
          </Stepper>
        </View>

        {/* Footer with Step Progress & Action Controls */}
        <View style={styles.footer}>
          {/* Custom Modern Progress Indicators */}
          <View style={styles.paginationRow}>
            {SLIDES.map((_, i) => {
              const isActive = i === index;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light,
                    ).catch(() => {});
                    setIndex(i);
                  }}
                  hitSlop={8}
                  style={[
                    styles.paginationPill,
                    isActive && styles.paginationPillActive,
                  ]}
                />
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsRow}>
            {index > 0 ? (
              <Button
                variant="secondary"
                size="lg"
                onPress={goPrev}
                style={styles.backBtn}
              >
                <ArrowLeft size={16} color={colors.accent.cyan} /> Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="lg"
                onPress={handleSkip}
                style={styles.backBtn}
              >
                Skip Tour
              </Button>
            )}

            {index < SLIDES.length - 1 ? (
              <Button
                variant="primary"
                size="lg"
                onPress={goNext}
                style={styles.nextBtn}
              >
                Next Tip <ArrowRight size={18} color={colors.text.inverse} />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onPress={handleFinish}
                style={styles.nextBtn}
              >
                Launch Hunter <Zap size={18} color={colors.text.inverse} />
              </Button>
            )}
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.deepest,
  },
  contentWrapper: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 16 : 8,
    paddingBottom: 8,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  brandText: {
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 210, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.2)",
  },
  skipButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  skipText: {
    color: colors.accent.cyan,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  stepperContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  stepper: {
    flex: 1,
  },
  slideScroll: {
    flex: 1,
    width: "100%",
  },
  slideScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mainCard: {
    width: "100%",
    backgroundColor: "rgba(13, 20, 38, 0.82)",
    borderColor: colors.surface.borderCyan,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 24,
    shadowColor: colors.bg.deepest,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideTitle: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  slideSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    color: colors.text.secondary,
  },
  previewContainer: {
    backgroundColor: "rgba(5, 8, 17, 0.6)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    marginBottom: 16,
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewLiveDotWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text.dim,
    letterSpacing: 0.8,
  },
  metricPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  metricPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 2,
  },
  previewSubtext: {
    fontSize: 12,
    color: colors.text.dim,
    marginBottom: 12,
  },
  previewItemsList: {
    gap: 8,
  },
  previewItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewItemText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
  previewItemTextHighlight: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  tipBox: {
    backgroundColor: "rgba(245, 158, 11, 0.07)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: 14,
  },
  tipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tipTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent.amber,
    letterSpacing: 0.5,
  },
  tipHeadline: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(241, 245, 249, 0.8)",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "web" ? 24 : 16,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  paginationPill: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surface.border,
  },
  paginationPillActive: {
    width: 32,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  backBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  nextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
