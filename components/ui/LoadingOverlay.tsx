/**
 * components/ui/LoadingOverlay.tsx
 * OpusHunter — Full-screen Loading Overlay.
 * Used for AI generation, scraping, and background tasks.
 * Features: Backdrop blur, orbiting cyan/blue radar icon, fade-in/out transitions.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Radar, Loader2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, shadows } from "../../constants/theme";
import { durations } from "../../constants/animations";
import { Typography } from "./Typography";
import { LinearGradient } from "expo-linear-gradient";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  progress?: number; // 0 to 1
}

export function LoadingOverlay({
  visible,
  message = "Processing...",
  subMessage,
  progress,
}: LoadingOverlayProps) {
  const opacity = useSharedValue(0);

  // Fade in/out + haptic on visibility change
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: durations.slow,
        easing: Easing.out(Easing.quad),
      });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else {
      opacity.value = withTiming(0, {
        duration: durations.fast,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Rotating radar animation
  const rotate = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      rotate.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [visible]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedStyle]} pointerEvents="auto">
      {/* Native blur backdrop (iOS/Android) */}
      {Platform.OS !== "web" && (
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      {/* Web overlay */}
      {Platform.OS === "web" && <View style={StyleSheet.absoluteFill} />}

      <View style={styles.content}>
        {/* Orbiting Radar Icon */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.radarWrap, rotateStyle]}>
            <Radar size={48} color={colors.accent.cyan} strokeWidth={1.5} />
          </Animated.View>
          <View style={styles.innerDot} />
        </View>

        <Typography
          variant="h4"
          weight="semiBold"
          color="primary"
          textAlign="center"
          style={styles.message}
        >
          {message}
        </Typography>

        {subMessage && (
          <Typography
            variant="bodySm"
            color="secondary"
            textAlign="center"
            style={styles.subMessage}
          >
            {subMessage}
          </Typography>
        )}

        {typeof progress === "number" ? (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        ) : (
          <View style={styles.dotContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: colors.bg.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    padding: 24,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.xl,
    boxShadow: shadows.glassLg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  radarWrap: {
    position: "absolute",
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  innerDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  message: {
    marginTop: 8,
  },
  subMessage: {
    marginTop: 8,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 2,
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  dotContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.blue,
  },
});
