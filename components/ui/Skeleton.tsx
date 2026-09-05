/**
 * components/ui/Skeleton.tsx
 * OpusHunter — Refined Skeleton Loading Component.
 * Animated shimmer using Reanimated + expo-linear-gradient.
 * Subtle 1.6s loop. Supports percentages, fixed sizes, and circles.
 */

import { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { radius } from "../../constants/theme";
import React from "react";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius,
  circle = false,
  style,
}: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Subtle 1.6s infinite shimmer loop
    progress.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: progress.value * 400 - 200 }],
    };
  });

  const finalRadius = circle ? 9999 : (borderRadius ?? radius.md);

  return (
    <View
      style={[
        styles.base,
        {
          width: circle ? height : width,
          height,
          borderRadius: finalRadius,
        },
        style,
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      {/* Shimmer gradient overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.06)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    width: 400,
  },
});
