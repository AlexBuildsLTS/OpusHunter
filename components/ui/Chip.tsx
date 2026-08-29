/**
 * components/ui/Chip.tsx
 * OpusHunter — Selectable Chip.
 * Toggle pill used for multi-select options (work types, currencies, etc.).
 * Selected state glows cyan; variants tint the pill for semantic color.
 * All colors resolve from constants/theme.ts — no hardcoded hex.
 */

import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius } from "../../constants/theme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: "default" | "cyan" | "green" | "amber" | "red";
  size?: "sm" | "md";
  disabled?: boolean;
  style?: any;
}

export function Chip({
  label,
  selected = false,
  onPress,
  variant = "default",
  size = "md",
  disabled = false,
  style,
}: ChipProps) {
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  // Tint map — each variant pairs the accent color with its translucent wash.
  const variants = {
    default: {
      bg: selected ? `${colors.accent.cyan}1F` : colors.surface.card,
      border: selected ? `${colors.accent.cyan}59` : colors.surface.border,
      text: selected ? colors.text.primary : colors.text.secondary,
    },
    cyan: {
      bg: `${colors.accent.cyan}1F`,
      border: `${colors.accent.cyan}59`,
      text: colors.accent.cyan,
    },
    green: {
      bg: `${colors.accent.green}1F`,
      border: `${colors.accent.green}59`,
      text: colors.accent.green,
    },
    amber: {
      bg: `${colors.accent.amber}1F`,
      border: `${colors.accent.amber}59`,
      text: colors.accent.amber,
    },
    red: {
      bg: `${colors.accent.red}1F`,
      border: `${colors.accent.red}59`,
      text: colors.accent.red,
    },
  };

  const v = variants[variant] || variants.default;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.smText : styles.mdText,
          { color: v.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { paddingHorizontal: 10, paddingVertical: 4 },
  md: { paddingHorizontal: 14, paddingVertical: 7 },
  text: { fontWeight: "700", letterSpacing: 0.4, textTransform: "capitalize" },
  smText: { fontSize: 11 },
  mdText: { fontSize: 13 },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
});
