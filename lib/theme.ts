/**
 * lib/theme.ts
 * OpusHunter — Deep Navy Metallic Design System
 * Single Source of Truth for Design Tokens across Web, iOS, and Android.
 */

export const colors = {
  bg: {
    deepest: "#050811",
    core: "#0A0E1A",
    mid: "#121829",
    elevated: "#161F36",
    sidebar: "#060913",
    overlay: "rgba(5, 8, 17, 0.85)",
  },
  accent: {
    cyan: "#00D2FF",
    cyanGlow: "rgba(0, 210, 255, 0.25)",
    blue: "#3A60E5",
    blueLight: "#70A5F9",
    blueGlow: "rgba(58, 96, 229, 0.30)",
    green: "#10B981",
    amber: "#F59E0B",
    red: "#F87171",
  },
  surface: {
    card: "rgba(18, 24, 41, 0.85)",
    frost: "rgba(18, 24, 41, 0.65)",
    glass: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.12)",
    borderCyan: "rgba(0, 210, 255, 0.28)",
    borderBlue: "rgba(58, 96, 229, 0.30)",
    sidebar: "#060913",
  },
  text: {
    primary: "#E2E8F0",
    secondary: "rgba(226, 232, 240, 0.65)",
    dim: "rgba(226, 232, 240, 0.40)",
    inverse: "#050811",
    onAccent: "#FFFFFF",
  },
  role: {
    member: {
      bg: "rgba(58, 96, 229, 0.15)",
      border: "rgba(58, 96, 229, 0.35)",
      text: "#70A5F9",
    },
    premium: {
      bg: "rgba(245, 158, 11, 0.15)",
      border: "rgba(245, 158, 11, 0.35)",
      text: "#FBBF24",
    },
    admin: {
      bg: "rgba(248, 113, 113, 0.15)",
      border: "rgba(248, 113, 113, 0.35)",
      text: "#F87171",
    },
  },
} as const;

export const C = {
  cyan: colors.accent.cyan,
  purple: colors.accent.blue,
  pink: colors.accent.red,
  red: colors.accent.red,
  green: colors.accent.green,
  amber: colors.accent.amber,
  blue: colors.accent.blue,
  bg: colors.bg.deepest,
  core: colors.bg.core,
  cardBg: colors.surface.card,
  text: colors.text.primary,
  sub: colors.text.secondary,
  dim: colors.text.dim,
  border: colors.surface.border,
  borderCyan: colors.surface.borderCyan,
  card: colors.bg.mid,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

export const shadows = {
  metallic:
    "0 4px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
  glowCyan: "0 0 20px rgba(0, 210, 255, 0.25)",
  glowBlue: "0 0 20px rgba(58, 96, 229, 0.25)",
  card: "0 4px 24px rgba(0, 0, 0, 0.35)",
} as const;

export const ROLE_CFG = {
  admin: {
    color: colors.accent.red,
    label: "ADMIN",
    bg: `${colors.accent.red}1A`,
    border: `${colors.accent.red}4D`,
  },
  premium: {
    color: colors.accent.amber,
    label: "PREMIUM",
    bg: `${colors.accent.amber}1A`,
    border: `${colors.accent.amber}4D`,
  },
  member: {
    color: colors.accent.blueLight,
    label: "MEMBER",
    bg: `${colors.accent.blue}1A`,
    border: `${colors.accent.blue}4D`,
  },
} as const;

export type RoleName = keyof typeof ROLE_CFG;
