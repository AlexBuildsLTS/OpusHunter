/**
 * components/jobcardsetup/SwipeDeck.tsx
 * OpusHunter — High-Performance Gesture-Driven Job Card Deck
 *
 * Implements physics-based multi-card depth stacking, velocity-aware throws,
 * directional action stamp badges, native haptics, and programmatic trigger buttons.
 * STRICT POLICY: Truthful rendering. Degrades to a sleek native link if description is blocked.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
  TouchableOpacity,
  Linking,
  Text,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  X,
  Heart,
  Zap,
  MapPin,
  DollarSign,
  Building2,
  Info,
} from "lucide-react-native";

import { Typography } from "../ui/Typography";
import { Card } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { colors, radius, shadows } from "../../constants/theme";
import { springs, swipeDeck } from "../../constants/animations";
import { Job } from "../../types/app.types";

const { width: INITIAL_SCREEN_WIDTH } = Dimensions.get("window");

function formatSource(source: string | null | undefined) {
  if (!source) return "Source unavailable";
  const labels: Record<string, string> = {
    adzuna: "Adzuna",
    indeed: "Indeed",
    jobtech: "JobTech",
    linkedin: "LinkedIn",
    custom: "Custom source",
    jsearch: "RapidAPI · JSearch",
    thehub: "The Hub",
  };
  return labels[source.toLowerCase()] || source;
}

interface SwipeDeckProps {
  jobs: Job[];
  onSwipeRight: (job: Job) => void;
  onSwipeLeft: (job: Job) => void;
  onSwipeUp: (job: Job) => void;
  onSelectJob?: (job: Job) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  jobs,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onSelectJob,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  const screenWidth = width || INITIAL_SCREEN_WIDTH;
  const swipeThreshold = Math.min(
    screenWidth * 0.28,
    swipeDeck.throwThreshold,
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isInteracting = useSharedValue(false);

  const currentJob = jobs[currentIndex];
  const nextJob =
    jobs.length > 1 ? jobs[(currentIndex + 1) % jobs.length] : undefined;
  const thirdJob =
    jobs.length > 2 ? jobs[(currentIndex + 2) % jobs.length] : undefined;

  const triggerHaptic = useCallback((type: "light" | "medium" | "success") => {
    if (Platform.OS === "web") return;
    try {
      if (type === "light") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (type === "medium") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Ignore haptic errors on unsupported platforms
    }
  }, []);

  const advanceCard = useCallback(() => {
    if (jobs.length === 0) return;
    translateX.value = 0;
    translateY.value = 0;
    isInteracting.value = false;
    setCurrentIndex((prev) => (prev + 1) % jobs.length);
  }, [jobs.length, translateX, translateY, isInteracting]);

  const executeSwipe = useCallback(
    (direction: "right" | "left" | "up") => {
      if (!currentJob) return;

      if (direction === "right") {
        triggerHaptic("success");
        onSwipeRight(currentJob);
        translateX.value = withSpring(screenWidth * 1.3, springs.swipe, () => {
          runOnJS(advanceCard)();
        });
      } else if (direction === "left") {
        triggerHaptic("medium");
        onSwipeLeft(currentJob);
        translateX.value = withSpring(
          -screenWidth * 1.3,
          springs.swipe,
          () => {
            runOnJS(advanceCard)();
          },
        );
      } else if (direction === "up") {
        triggerHaptic("success");
        onSwipeUp(currentJob);
        translateY.value = withSpring(
          -screenWidth * 1.4,
          springs.swipe,
          () => {
            runOnJS(advanceCard)();
          },
        );
      }
    },
    [
      currentJob,
      onSwipeRight,
      onSwipeLeft,
      onSwipeUp,
      triggerHaptic,
      advanceCard,
      translateX,
      translateY,
      screenWidth,
    ],
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      isInteracting.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const horizontalThrow = Math.abs(event.translationX) > swipeThreshold;
      const verticalThrow = event.translationY < -swipeThreshold;

      if (horizontalThrow) {
        if (event.translationX > 0) {
          runOnJS(executeSwipe)("right");
        } else {
          runOnJS(executeSwipe)("left");
        }
      } else if (verticalThrow) {
        runOnJS(executeSwipe)("up");
      } else {
        translateX.value = withSpring(0, springs.swipe);
        translateY.value = withSpring(0, springs.swipe);
        isInteracting.value = false;
      }
    });

  const topCardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth / 2, 0, screenWidth / 2],
      [-swipeDeck.maxRotation, 0, swipeDeck.maxRotation],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const rightStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [20, swipeThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [20, swipeThreshold],
          [0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const leftStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-swipeThreshold, -20],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-swipeThreshold, -20],
          [1, 0.8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const upStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-swipeThreshold, -20],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateY.value,
          [-swipeThreshold, -20],
          [1, 0.8],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const secondCardAnimatedStyle = useAnimatedStyle(() => {
    const dragDistance = Math.max(
      Math.abs(translateX.value),
      Math.abs(translateY.value),
    );
    const scale = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [0.94, 1],
      Extrapolation.CLAMP,
    );
    const translateYOffset = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [16, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [0.75, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { translateY: translateYOffset }],
    };
  });

  const thirdCardAnimatedStyle = useAnimatedStyle(() => {
    const dragDistance = Math.max(
      Math.abs(translateX.value),
      Math.abs(translateY.value),
    );
    const scale = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [0.88, 0.94],
      Extrapolation.CLAMP,
    );
    const translateYOffset = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [32, 16],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      dragDistance,
      [0, swipeThreshold],
      [0.4, 0.75],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { translateY: translateYOffset }],
    };
  });

  if (!currentJob) return null;

  return (
    <GestureHandlerRootView style={styles.rootWrapper}>
      <View style={styles.deckContainer}>
        {/* ── 3rd Card in Stack ── */}
        {thirdJob && jobs.length > 2 && (
          <Animated.View
            style={[styles.cardAbsolute, thirdCardAnimatedStyle, { zIndex: 1 }]}
          >
            <Card style={styles.cardInner} variant="default">
              <View style={styles.stackPreview} />
            </Card>
          </Animated.View>
        )}

        {/* ── 2nd Card in Stack ── */}
        {nextJob && jobs.length > 1 && (
          <Animated.View
            style={[
              styles.cardAbsolute,
              secondCardAnimatedStyle,
              { zIndex: 2 },
            ]}
          >
            <Card style={styles.cardInner} variant="default">
              <View style={styles.stackPreview} />
            </Card>
          </Animated.View>
        )}

        {/* ── Top Interactive Card ── */}
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[styles.cardAbsolute, topCardAnimatedStyle, { zIndex: 10 }]}
          >
            <Card style={styles.cardInner} variant="elevated">
              {/* Swipe Action Overlay Stamps (pointerEvents none to pass touch) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampRight, rightStampStyle]}
              >
                <Typography
                  variant="h4"
                  weight="bold"
                  style={styles.stampTextGreen}
                >
                  SAVE
                </Typography>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampLeft, leftStampStyle]}
              >
                <Typography
                  variant="h4"
                  weight="bold"
                  style={styles.stampTextRed}
                >
                  PASS
                </Typography>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[styles.stamp, styles.stampUp, upStampStyle]}
              >
                <Typography
                  variant="h4"
                  weight="bold"
                  style={styles.stampTextCyan}
                >
                  REVIEW & APPLY
                </Typography>
              </Animated.View>

              {/* Card Body Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <Typography
                    variant="h3"
                    weight="bold"
                    color="primary"
                    numberOfLines={2}
                    style={styles.flex1}
                  >
                    {currentJob.title}
                  </Typography>
                  {currentJob.match_score && (
                    <Badge
                      variant={currentJob.match_score >= 80 ? "green" : "cyan"}
                      size="sm"
                      label={`${currentJob.match_score}% Match`}
                    />
                  )}
                </View>

                <View style={styles.metaRow}>
                  <Building2 size={14} color={colors.text.secondary} />
                  <Typography variant="body" color="secondary">
                    {currentJob.company}
                  </Typography>
                </View>
              </View>

              {/* Meta Chips */}
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <MapPin size={12} color={colors.accent.cyan} />
                  <Typography variant="caption" color="accent">
                    {currentJob.location || "Remote"}
                  </Typography>
                </View>
                {currentJob.salary && (
                  <View style={styles.badge}>
                    <DollarSign size={12} color={colors.accent.cyan} />
                    <Typography variant="caption" color="accent">
                      {currentJob.salary}
                    </Typography>
                  </View>
                )}
              </View>

              {/* Description Snippet or Tech Stack */}
              {Array.isArray(currentJob.tech_stack) &&
              currentJob.tech_stack.length > 0 ? (
                <View style={styles.stackRow}>
                  {currentJob.tech_stack
                    .slice(0, 5)
                    .map((tech: string, i: number) => (
                      <View key={i} style={styles.techChip}>
                        <Typography variant="caption" color="secondary">
                          {tech}
                        </Typography>
                      </View>
                    ))}
                </View>
              ) : null}

              {/* ─── DESCRIPTION TRUTH ENFORCEMENT BLOCK ─── */}
              {currentJob.description &&
              currentJob.description.trim().length > 0 ? (
                <Text
                  style={{
                    color: "#CBD5E1",
                    fontSize: 13,
                    lineHeight: 20,
                    marginTop: 12,
                  }}
                  numberOfLines={4}
                >
                  {currentJob.description}
                </Text>
              ) : (
                <View style={{ marginTop: 12, alignItems: "flex-start" }}>
                  <Text
                    style={{ color: "#94A3B8", fontSize: 12, marginBottom: 8 }}
                  >
                    The full description is available on the original posting.
                  </Text>
                  {(currentJob.url || currentJob.source_url) && (
                    <TouchableOpacity
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${formatSource(currentJob.source)} job posting`}
                      onPress={() =>
                        Linking.openURL(
                          currentJob.url || currentJob.source_url || "",
                        ).catch(() => {})
                      }
                      style={styles.readPostButton}
                    >
                      <Text style={styles.readPostText}>Read Full Post</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* View Full Specs Trigger */}
              {onSelectJob && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View full job specifications"
                  onPress={() => onSelectJob(currentJob)}
                  style={({ pressed }) => [
                    styles.detailsLink,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Info size={14} color={colors.accent.cyan} />
                  <Typography
                    variant="caption"
                    color="accent"
                    weight="semiBold"
                  >
                    View Full Specifications & Strategy
                  </Typography>
                </Pressable>
              )}
            </Card>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* ── Programmatic Swipe Action Bar ── */}
      <View style={styles.actionBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => executeSwipe("left")}
          style={({ pressed }) => [
            styles.actionButton,
            styles.buttonPass,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Pass job"
        >
          <X size={22} color={colors.accent.red} />
        </Pressable>

        {onSelectJob && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelectJob(currentJob)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.buttonInfo,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel="View details"
          >
            <Info size={20} color={colors.accent.cyan} />
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => executeSwipe("up")}
          style={({ pressed }) => [
            styles.actionButton,
            styles.buttonApply,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Apply to job"
        >
          <Zap size={24} color={colors.accent.cyan} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => executeSwipe("right")}
          style={({ pressed }) => [
            styles.actionButton,
            styles.buttonSave,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Save job"
        >
          <Heart size={22} color={colors.accent.green} />
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  rootWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsLink: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    minHeight: 44,
    marginTop: 8,
    paddingVertical: 6,
  },
  deckContainer: {
    height: 480,
    width: "100%",
    maxWidth: 480,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  cardAbsolute: {
    width: "100%",
    maxWidth: 480,
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    alignSelf: "center",
  },
  cardInner: {
    flex: 1,
    width: "100%",
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  cardHeader: {
    rowGap: 8,
  },
  stackPreview: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.06)",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    columnGap: 12,
  },
  flex1: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
    marginVertical: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 4,
    backgroundColor: `${colors.accent.cyan}1A`,
    borderWidth: 1,
    borderColor: `${colors.accent.cyan}33`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  stackRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 6,
    marginTop: 4,
  },
  readPostButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  readPostText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  techChip: {
    backgroundColor: colors.surface.frost,
    borderWidth: 1,
    borderColor: colors.surface.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  descriptionText: {
    marginTop: 4,
    lineHeight: 18,
  },
  stamp: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 2,
    zIndex: 100,
  },
  stampRight: {
    top: 24,
    left: 24,
    borderColor: colors.accent.green,
    backgroundColor: `${colors.accent.green}20`,
    transform: [{ rotate: "-15deg" }],
  },
  stampLeft: {
    top: 24,
    right: 24,
    borderColor: colors.accent.red,
    backgroundColor: `${colors.accent.red}20`,
    transform: [{ rotate: "15deg" }],
  },
  stampUp: {
    bottom: 24,
    alignSelf: "center",
    borderColor: colors.accent.cyan,
    backgroundColor: `${colors.accent.cyan}20`,
  },
  stampTextGreen: {
    color: colors.accent.green,
    letterSpacing: 1.5,
  },
  stampTextRed: {
    color: colors.accent.red,
    letterSpacing: 1.5,
  },
  stampTextCyan: {
    color: colors.accent.cyan,
    letterSpacing: 1.5,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: 20,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  actionButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: colors.surface.card,
    ...Platform.select({
      web: { boxShadow: shadows.card } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  buttonPass: {
    borderColor: `${colors.accent.red}4D`,
  },
  buttonSave: {
    borderColor: `${colors.accent.green}4D`,
  },
  buttonInfo: {
    borderColor: `${colors.accent.cyan}4D`,
  },
  buttonApply: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: `${colors.accent.cyan}66`,
    backgroundColor: colors.surface.frost,
    ...Platform.select({
      web: { boxShadow: shadows.glowCyan } as any,
      default: {
        shadowColor: colors.accent.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
});
