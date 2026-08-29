/**
 * app/(auth)/onboarding.tsx
 * OpusHunter — Onboarding Flow.
 * 4 animated slides explaining OpusHunter's value.
 * Uses PanResponder for native swipe + buttons for web. Smooth Reanimated slides.
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Radar,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react-native";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { Button } from "../../components/ui/Button";
import { Typography } from "../../components/ui/Typography";
import { colors, radius, shadows } from "../../constants/theme";
import { durations } from "../../constants/animations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [index, setIndex] = useState(0);
  const translateX = useSharedValue(0);
  const currentIndex = useSharedValue(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -50 && index < SLIDES.length - 1) {
          goNext();
        } else if (gesture.dx > 50 && index > 0) {
          goPrev();
        }
      },
    }),
  ).current;

  const goNext = () => {
    if (index >= SLIDES.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextIndex = index + 1;
    translateX.value = withTiming(-SCREEN_WIDTH * nextIndex, {
      duration: durations.slow,
      easing: Easing.out(Easing.cubic),
    });
    currentIndex.value = withTiming(nextIndex, { duration: durations.slow });
    setIndex(nextIndex);
  };

  const goPrev = () => {
    if (index <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const prevIndex = index - 1;
    translateX.value = withTiming(-SCREEN_WIDTH * prevIndex, {
      duration: durations.slow,
      easing: Easing.out(Easing.cubic),
    });
    currentIndex.value = withTiming(prevIndex, { duration: durations.slow });
    setIndex(prevIndex);
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/(auth)/auth");
  };

  return (
    <SafeAreaWrapper edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/(auth)/auth")} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slide Deck */}
      <View style={styles.slidesContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[styles.slidesRow, { transform: [{ translateX }] }]}
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
        </Animated.View>
      </View>

      {/* Pagination & Actions */}
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
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  slidesContainer: {
    flex: 1,
    overflow: "hidden",
  },
  slidesRow: {
    flexDirection: "row",
    height: "100%",
  },
  slide: {
    width: SCREEN_WIDTH,
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
