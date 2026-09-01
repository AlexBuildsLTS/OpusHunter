/**
 * app/(auth)/onboarding.tsx
 * OpusHunter — Onboarding Flow.
 * 4 animated slides explaining OpusHunter's value.
 * Slide/swipe mechanics now live in components/ui/Stepper.tsx (shared with Configure) —
 * this file owns only the content and the skip/finish routing logic.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Radar,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react-native";
import { useAuthStore } from "../../stores/authStore";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { Button } from "../../components/ui/Button";
import { Typography } from "../../components/ui/Typography";
import { Stepper, useStepperControls } from "../../components/ui/Stepper";
import { colors } from "../../constants/theme";

const SLIDES = [
  {
    title: "Your Career, Automated",
    subtitle:
      "OpusHunter finds jobs, writes your cover letters, and applies — while you sleep.",
    icon: Radar,
    color: colors.accent.cyan,
  },
  {
    title: "AI That Knows Your Story",
    subtitle:
      "Upload your CV once. Our AI extracts your full career narrative for every single application.",
    icon: FileText,
    color: colors.accent.blue,
  },
  {
    title: "Three Strategies, One Winner",
    subtitle:
      "Our AI generates three different cover letter strategies per job, scores them for ATS compatibility, and presents the best.",
    icon: Sparkles,
    color: colors.accent.cyan,
  },
  {
    title: "Swipe. Apply. Get Hired.",
    subtitle:
      "Review jobs with a swipe. One tap generates and sends your application. Track everything in your pipeline.",
    icon: ChevronRight,
    color: colors.accent.blue,
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

  // Same routing logic as handleFinish, kept as a separate named handler because
  // "skip" and "finish the last slide" are different user intents that happen to
  // route to the same place today — if that ever diverges (e.g. skip logs an
  // analytics event finish doesn't) they're already separate functions to edit.
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
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>
              {session || user ? "Skip to Dashboard" : "Skip"}
            </Text>
            <ArrowRight size={14} color={colors.accent.cyan} />
          </Pressable>
        </View>

        <Stepper
          stepCount={SLIDES.length}
          currentStep={index}
          onStepChange={setIndex}
          showDots={false}
        >
          {SLIDES.map((slide, i) => {
            const Icon = slide.icon;
            return (
              <View key={i} style={styles.slide}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: `${slide.color}15`,
                      borderColor: `${slide.color}40`,
                    },
                  ]}
                >
                  <Icon size={64} color={slide.color} strokeWidth={1.5} />
                </View>
                <Typography
                  variant="h1"
                  weight="bold"
                  color="primary"
                  textAlign="center"
                  style={styles.slideTitle}
                >
                  {slide.title}
                </Typography>
                <Typography
                  variant="bodyLg"
                  color="secondary"
                  textAlign="center"
                  style={styles.slideSubtitle}
                >
                  {slide.subtitle}
                </Typography>
              </View>
            );
          })}
        </Stepper>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.buttonsRow}>
            {index > 0 && (
              <Button variant="ghost" onPress={goPrev} style={styles.backBtn}>
                Back
              </Button>
            )}
            {index < SLIDES.length - 1 ? (
              <Button onPress={goNext} style={styles.nextBtn} haptic={false}>
                Next <ArrowRight size={18} color={colors.text.inverse} />
              </Button>
            ) : (
              <Button onPress={handleFinish} style={styles.nextBtn}>
                Get Started
              </Button>
            )}
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  slide: {
    width: "100%",
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  slideTitle: {
    marginBottom: 16,
  },
  slideSubtitle: {
    maxWidth: 340,
    lineHeight: 28,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
