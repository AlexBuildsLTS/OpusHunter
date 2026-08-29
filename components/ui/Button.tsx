/**
 * components/ui/Button.tsx
 * OpusHunter — Button Component.
 * Variants: primary, secondary, ghost, destructive. Sizes: sm, md, lg.
 * Renders children directly so callers can compose icon + label freely.
 * Press scale (native), hover lift (web), haptic feedback, loading spinner.
 * All colors resolve from constants/theme.ts — no hardcoded hex.
 */

import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, shadows } from "../../constants/theme";

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
  haptic = true,
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const foreground = FOREGROUND[variant];

  // Wrap string children in a Text so text styling applies; leave node
  // children (icons, rows) untouched so flex layout handles them.
  const content =
    typeof children === "string" ? (
      <Text
        style={[styles.text, styles[`${size}Text`], { color: foreground.text }]}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        loading && styles.loading,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground.spinner} size="small" />
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  // ── Variants ──────────────────────────────────────────────
  primary: {
    backgroundColor: colors.accent.cyan,
    ...(shadows.btnCyan as unknown as object),
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
