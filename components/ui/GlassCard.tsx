/**
 * components/ui/GlassCard.tsx
 * OpusHunter — Professional Glass-Morphism Card.
 * Variants: default, elevated, interactive.
 * Web hover: subtle lift + cyan glow. Native: press scale.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform, ViewProps } from "react-native";
import { colors, shadows, radius } from "../../constants/theme";
import { cn } from "../../lib/utils";

export interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "pink" | "lime" | "red" | "green";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glowColor = "cyan",
  style,
  ...props
}) => {
  const glowStyles = {
    cyan: "border-[#00F0FF]/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]",
    purple: "border-[#8A2BE2]/20 shadow-[0_0_30px_rgba(138,43,226,0.05)]",
    pink: "border-[#FF007F]/20 shadow-[0_0_30px_rgba(255,0,127,0.05)]",
    lime: "border-[#32FF00]/20 shadow-[0_0_30px_rgba(50,255,0,0.05)]",
    red: "border-[#ff4d6d]/20 shadow-[0_0_30px_rgba(255,77,109,0.05)]",
    green: "border-[#4ade80]/20 shadow-[0_0_30px_rgba(74,222,128,0.05)]",
  };

  return (
    <View
      className={cn(
        "rounded-[32px] border bg-[#0f172a]/40",
        glowStyles[glowColor],
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
};

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
  elevated: {
    backgroundColor: colors.surface.frost,
    borderColor: colors.surface.borderCyan,
    ...Platform.select({
      web: { boxShadow: shadows.glassLg } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  interactive: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.border,
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
