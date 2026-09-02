/**
 * components/ui/Typography.tsx
 * OpusHunter — Typography Component.
 * Professional, modern text system. Supports display, headings, body, captions, and labels.
 * Uses Inter font family. Provides weight and color controls.
 */

import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../../constants/theme";

interface TypographyProps {
  variant?:
    | "display"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "bodyLg"
    | "body"
    | "bodySm"
    | "caption"
    | "label";
  weight?: "regular" | "medium" | "semiBold" | "bold";
  color?:
    | "primary"
    | "secondary"
    | "dim"
    | "inverse"
    | "accent"
    | "success"
    | "warning"
    | "error";
  textAlign?: "left" | "center" | "right";
  numberOfLines?: number;
  style?: any;
  children: React.ReactNode;
}

const variantStyles: Record<string, { fontSize: number; lineHeight: number }> =
  {
    display: { fontSize: 40, lineHeight: 48 },
    h1: { fontSize: 32, lineHeight: 40 },
    h2: { fontSize: 24, lineHeight: 32 },
    h3: { fontSize: 20, lineHeight: 28 },
    h4: { fontSize: 16, lineHeight: 24 },
    bodyLg: { fontSize: 16, lineHeight: 24 },
    body: { fontSize: 14, lineHeight: 21 },
    bodySm: { fontSize: 13, lineHeight: 19 },
    caption: { fontSize: 12, lineHeight: 16 },
    label: { fontSize: 11, lineHeight: 14 },
  };

const weightValues: Record<string, "400" | "500" | "600" | "700"> = {
  regular: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
};

const colorStyles: Record<string, string> = {
  primary: "#FFFFFF",
  secondary: "#CBD5E1",
  dim: "#94A3B8",
  inverse: "#050811",
  accent: colors.accent.cyan,
  success: colors.accent.green,
  warning: colors.accent.amber,
  error: colors.accent.red,
};

export function Typography({
  variant = "body",
  weight = "regular",
  color = "primary",
  textAlign = "left",
  numberOfLines,
  style,
  children,
}: TypographyProps) {
  const vStyle = variantStyles[variant] || variantStyles.body;
  const fontWeight = weightValues[weight] || "400";
  const textColor = colorStyles[color] || "#FFFFFF";

  return (
    <Text
      style={[
        {
          fontSize: vStyle.fontSize,
          lineHeight: vStyle.lineHeight,
          fontWeight,
          color: textColor,
          textAlign,
        },
        variant === "label" && styles.labelCaps,
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  labelCaps: {
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
});
