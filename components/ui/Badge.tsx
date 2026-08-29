/**
 * components/ui/Badge.tsx
 * OpusHunter — Badge Component.
 * Semantic pill badge. Role variants (member/premium/admin) and pipeline
 * status variants derive from constants/theme.ts role/status tokens, so they
 * can never drift from the rest of the design system. Optional glow dot.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "../../constants/theme";

type BadgeVariant =
  | "default"
  | "cyan"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "roleMember"
  | "rolePremium"
  | "roleAdmin"
  | "statusDiscovered"
  | "statusSaved"
  | "statusApplied"
  | "statusInterview"
  | "statusOffer"
  | "statusRejected"
  | "statusWithdrawn";

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  size?: "sm" | "md";
  dot?: boolean;
  style?: any;
}

/** Derives translucent bg/border tints from a solid hex accent color. */
function tint(hex: string): { bg: string; border: string } {
  return { bg: `${hex}26`, border: `${hex}4D` };
}

// Map every variant to a solid accent color; bg/border are derived from it.
const variantColors: Record<BadgeVariant, string> = {
  default: "#F1F5F9",
  cyan: colors.accent.cyan,
  blue: colors.accent.blue,
  green: colors.accent.green,
  amber: colors.accent.amber,
  red: colors.accent.red,
  roleMember: colors.role.member.text,
  rolePremium: colors.role.premium.text,
  roleAdmin: colors.role.admin.text,
  statusDiscovered: colors.status.discovered,
  statusSaved: colors.status.saved,
  statusApplied: colors.status.applied,
  statusInterview: colors.status.interview,
  statusOffer: colors.status.offer,
  statusRejected: colors.status.rejected,
  statusWithdrawn: colors.status.withdrawn,
};

export function Badge({
  variant = "default",
  label,
  size = "sm",
  dot = false,
  style,
}: BadgeProps) {
  const text = variantColors[variant] || variantColors.default;
  const { bg, border } = tint(text);

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, borderColor: border },
        size === "md" && styles.md,
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text
        style={[styles.text, { color: text }, size === "md" && styles.textMd]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textMd: {
    fontSize: 12,
  },
});
