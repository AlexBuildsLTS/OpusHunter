export const colors = {
  /* ── Backgrounds (Deep Aerospace Obsidian) ─────────────────────── */
  bg: {
    primary: "#050811", // Root / primary background
    deepest: "#050811", // Root background — darkest
    core: "#0A0F1D", // Main app surface
    mid: "#111A30", // Elevated surfaces
    elevated: "#0D1426", // Cards / modals
    sidebar: "#060913", // Sidebar / nav rail
    overlay: "rgba(5, 8, 17, 0.85)", // Modal overlays
  },

  /* ── Accents (Cyan primary, Blue secondary, Green/Amber/Red) ───── */
  accent: {
    cyan: "#00D2FF", // Primary accent (buttons, active states)
    cyanGlow: "rgba(0, 210, 255, 0.25)", // Glow shadows
    blue: "#3B82F6", // Secondary (links, secondary buttons)
    blueGlow: "rgba(59, 130, 246, 0.3)",
    green: "#10B981", // Success / member badge
    amber: "#F59E0B", // Warning / premium badge
    red: "#F87171", // Error / admin badge
  },

  /* ── Surfaces (Glass morphism) ──────────────────────────────────── */
  surface: {
    card: "rgba(13, 20, 38, 0.75)", // Glass card
    frost: "rgba(26, 29, 46, 0.8)", // Frosted overlay
    glass: "rgba(255, 255, 255, 0.04)", // Subtle glass fill
    border: "rgba(30, 45, 75, 0.6)", // Standard border
    borderCyan: "rgba(0, 210, 255, 0.2)", // Cyan-tinted border
    borderBlue: "rgba(59, 130, 246, 0.3)", // Blue-tinted border
    sidebar: "#060913", // Sidebar background
  },

  /* ── Text Hierarchy ─────────────────────────────────────────────── */
  text: {
    primary: "#F1F5F9", // White — main text
    secondary: "rgba(241, 245, 249, 0.65)", // Grey — subtext
    dim: "rgba(241, 245, 249, 0.4)", // Muted — labels
    inverse: "#050811", // Dark text on light buttons
    onAccent: "#FFFFFF", // White text on accent bg
  },

  /* ── Role Badges (Member=Green, Premium=Gold, Admin=Red) ───────── */
  role: {
    member: {
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.35)",
      text: "#34D399",
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

  /* ── Application Status (Kanban) ────────────────────────────────── */
  status: {
    discovered: "#3B82F6", // Blue
    saved: "#8B5CF6", // Violet (saved, not primary accent)
    applied: "#F59E0B", // Amber
    interview: "#06B6D4", // Cyan
    offer: "#10B981", // Green
    rejected: "#EF4444", // Red
    withdrawn: "#64748B", // Slate
  },
} as const;

/* ── Typography Scale (Inter) ─────────────────────────────────────── */
export const typography = {
  fontFamily: {
    regular: "Inter-Regular",
    medium: "Inter-Medium",
    semiBold: "Inter-SemiBold",
    bold: "Inter-Bold",
  },
  size: {
    display: 40,
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 16,
    bodyLg: 16,
    body: 14,
    bodySm: 13,
    caption: 12,
    label: 11,
  },
  lineHeight: {
    display: 48,
    h1: 40,
    h2: 32,
    h3: 28,
    h4: 24,
    bodyLg: 24,
    body: 21,
    bodySm: 19,
    caption: 16,
    label: 14,
  },
  weight: {
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
  },
  tracking: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.05em",
  },
} as const;

/* ── Spacing Scale (4px base) ─────────────────────────────────────── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

/* ── Border Radius ────────────────────────────────────────────────── */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  full: 9999,
} as const;

/* ── Shadows (Glass & Glow) ───────────────────────────────────────── */
export const shadows = {
  glass:
    "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  glassLg:
    "0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07)",
  glowCyan: "0 0 24px rgba(0, 210, 255, 0.25), 0 0 48px rgba(0, 210, 255, 0.1)",
  glowBlue:
    "0 0 24px rgba(59, 130, 246, 0.3), 0 0 48px rgba(59, 130, 246, 0.1)",
  glowGreen: "0 0 24px rgba(16, 185, 129, 0.25)",
  glowAmber: "0 0 24px rgba(245, 158, 11, 0.25)",
  glowRed: "0 0 24px rgba(248, 113, 113, 0.25)",
  btnCyan: "0 0 20px rgba(0, 210, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)",
  card: "0 4px 24px rgba(0, 0, 0, 0.35)",
} as const;

/* ── Gradients ────────────────────────────────────────────────────── */
export const gradients = {
  primary: ["#1B1430", "#0A0714"] as const, // Dark aerospace base
  accent: ["#00D2FF", "#3B82F6"] as const, // Cyan → Blue
  success: ["#10B981", "#06B6D4"] as const,
  warning: ["#F59E0B", "#F87171"] as const,
  danger: ["#F87171", "#EF4444"] as const,
  ambientCyan: ["rgba(0, 210, 255, 0.07)", "transparent"] as const,
  ambientBlue: ["rgba(59, 130, 246, 0.06)", "transparent"] as const,
} as const;

/* ── Breakpoints (Web responsive) ─────────────────────────────────── */
export const breakpoints = {
  mobile: 767, // < 768px — floating tab bar
  tablet: 1023, // 768–1023px — collapsible sidebar
  desktop: 1024, // ≥ 1024px — fixed sidebar
} as const;

/* ── Ambient Background Animations (Subtle) ───────────────────────── */
export const ambient = {
  orbCount: 3,
  orbOpacity: 0.15, // Very subtle
  orbPeriodMs: 10000, // 10s loop
  radarSweepMs: 18000, // 18s radar sweep
  driftScale: 1.05, // Max scale during drift
} as const;

/* ── Animation Durations (Subtle, professional) ───────────────────── */
export const durations = {
  fast: 150, // Press states
  normal: 200, // Hover / transitions
  slow: 300, // Modals / slides
  ambient: 8000, // Ambient loops
} as const;

/* ── Shorthand Color Accessor (C) ─────────────────────────────────── */
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

/* ── Role Configuration Badges ───────────────────────────────────── */
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
    color: colors.accent.blue,
    label: "MEMBER",
    bg: `${colors.accent.blue}1A`,
    border: `${colors.accent.blue}4D`,
  },
} as const;

export type RoleName = keyof typeof ROLE_CFG;
