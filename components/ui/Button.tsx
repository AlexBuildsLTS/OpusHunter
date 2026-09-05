/**
 * components/ui/Button.tsx
 * OpusHunter — Button Component.
 * Variants: primary, secondary, ghost, destructive. Sizes: sm, md, lg.
 * Renders children directly so callers can compose icon + label freely.
 * Physics-based spring press (Reanimated), web hover lift, haptic feedback, loading spinner.
 * All colors resolve from constants/theme.ts.
 */

import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, radius, shadows } from "../../constants/theme";
import { springs } from "../../constants/animations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  /** Visual variant — determines background, border, and text color. */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /** Height/padding tier. */
  size?: "sm" | "md" | "lg";
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  accessibilityLabel?: string;
  /** Enable native haptic feedback on press. Defaults true. */
  haptic?: boolean;
}

/** Text color + spinner color per variant, keyed by variant name. */
const FOREGROUND: Record<
  "primary" | "secondary" | "ghost" | "destructive",
  { text: string; spinner: string }
> = {
  primary: { text: colors.text.inverse, spinner: colors.text.inverse },
  secondary: { text: colors.accent.cyan, spinner: colors.accent.cyan },
  ghost: { text: colors.text.secondary, spinner: colors.accent.cyan },
  destructive: { text: colors.accent.red, spinner: colors.accent.red },
};

export function Button({
  variant = "primary",
  size = "md",
  onPress,
  children,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  haptic = true,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, springs.press);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springs.press);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  }, [disabled, loading, haptic, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const foreground = FOREGROUND[variant];

  // Wrap string/number children in a Text so text styling applies; leave node
  // children (icons, rows) untouched so flex layout handles them.
  const content = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return (
        <Text
          style={[
            styles.text,
            styles[`${size}Text`],
            { color: foreground.text },
          ]}
        >
          {String(child)}
        </Text>
      );
    }
    return child;
  });

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        loading && styles.loading,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground.spinner} size="small" />
      ) : (
        content
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  // ── Variants ──────────────────────────────────────────────
  primary: {
    backgroundColor: colors.accent.cyan,
    ...Platform.select({
      web: { boxShadow: shadows.btnCyan } as any,
      default: {
        shadowColor: colors.accent.cyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  secondary: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  destructive: {
    backgroundColor: colors.role.admin.bg,
    borderWidth: 1,
    borderColor: colors.role.admin.border,
  },

  // ── Sizes ─────────────────────────────────────────────────
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  md: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  lg: {
    paddingHorizontal: 28,
    paddingVertical: 18,
  },

  // ── Text ──────────────────────────────────────────────────
  text: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  smText: { fontSize: 12 },
  mdText: { fontSize: 14 },
  lgText: { fontSize: 16 },

  // ── States ────────────────────────────────────────────────
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  loading: {
    opacity: 0.7,
  },
});
