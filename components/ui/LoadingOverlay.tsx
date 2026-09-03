/**
 * components/ui/LoadingOverlay.tsx
 * OpusHunter — Full-screen Loading Overlay (Performance Optimized).
 * Features: Orbiting cyan/blue radar icon, fade-in/out transitions.
 * Android/Web: Native BlurView removed to eliminate extreme GPU lag.
 * iOS: Maintains hardware-accelerated BlurView.
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withRepeat,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Radar } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors, radius } from "../../constants/theme";
import { durations } from "../../constants/animations";
import { Typography } from "./Typography";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  progress?: number;
}

export function LoadingOverlay({
  visible,
  message = "Processing...",
  subMessage,
  progress,
}: LoadingOverlayProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: durations.slow,
        easing: Easing.out(Easing.quad),
      });
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View
      style={[styles.overlay, animatedStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(5, 8, 17, 0.9)" },
          ]}
        />
      )}

      <View style={styles.content}>
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
    backgroundColor:
      Platform.OS === "ios" ? "rgba(5, 8, 17, 0.5)" : "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
    width: "90%",
    padding: 24,
    backgroundColor: "rgba(10, 15, 29, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.35)",
    borderRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      default: {
        elevation: 10,
      },
    }),
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
    elevation: 4,
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
    elevation: 2,
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
