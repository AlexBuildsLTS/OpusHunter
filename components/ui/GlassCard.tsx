/**
 * components/ui/GlassCard.tsx
 * OpusHunter — Professional Glass-Morphism Card.
 * Variants: default, elevated, interactive.
 * Web hover: subtle lift + cyan glow. Native: press scale.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { colors, shadows, radius } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "interactive";
  onPress?: () => void;
  style?: any;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  variant = "default",
  onPress,
  style,
  padding = "md",
}: CardProps) {
  const [hovered, setHovered] = React.useState(false);

  const containerStyles = [
    styles.base,
    styles[variant],
    styles[
      `padding${padding.charAt(0).toUpperCase() + padding.slice(1)}` as keyof typeof styles
    ],
    onPress && styles.pressable,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...containerStyles,
          pressed && styles.pressed,
          Platform.OS === "web" && hovered && styles.hovered,
        ]}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: colors.surface.card,
  },

  // Variants
  default: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.border,
    ...(shadows.card as any),
  },
  elevated: {
    backgroundColor: colors.surface.frost,
    borderColor: colors.surface.borderCyan,
    ...(shadows.glassLg as any),
  },
  interactive: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.border,
    ...(shadows.card as any),
  },

  // Padding
  paddingNone: { padding: 0 },
  paddingSm: { padding: 12 },
  paddingMd: { padding: 16 },
  paddingLg: { padding: 24 },

  // States
  pressable: {
    // @ts-ignore
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  hovered: {
    transform: [{ translateY: -4 }, { scale: 1.01 }],
    borderColor: colors.surface.borderCyan,
    ...(Platform.OS === "web" ? ({ boxShadow: shadows.glowCyan } as any) : {}),
  },
});
