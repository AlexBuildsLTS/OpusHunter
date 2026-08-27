/**
 * lib/theme.ts
 * OpusHunter — Single Source of Truth for Design Tokens
 * 2026-07-12 — Professional Design System Refresh
 *
 * CORE PRINCIPLES:
 *   • WCAG AAA contrast (7:1+) on all critical paths
 *   • Semantic color system (status → intent, not just visual)
 *   • Motion: accessible + performance-optimized for mobile/web
 *   • Token precision: all three sync points (theme.ts → tailwind → global.css)
 *     enforced via documentation + future CI check
 *
 * DESIGN SYSTEM LAYERS:
 *   Background (darkest → lightest):  bg → core → card
 *   Text hierarchy (most → least):    text → sub → dim
 *   Accent system (primary → tertiary): cyan → purple → pink → semantic
 *   Opacity scale: deliberate + measured, no arbitrary values
 *
 * ACCESSIBILITY NOTES:
 *   • All accent colors tested against both bg (#0A0714) & core (#120D1E)
 *   • Focus states: cyan border (28% opacity) + ring, WCAG AA compliant
 *   • Motion: 150–300ms for UI transitions, 8s for ambient (non-critical)
 *   • Color contrast ratios: primary accents 8:1+, secondary 4.5:1 minimum
 *
 * SYNC REQUIREMENTS:
 *   tailwind.config.js::extend.colors → MUST mirror PALETTE values
 *   global.css::--neon-* & --bg-* → MUST match hex values exactly
 *   If you change a color here, change ALL THREE in the same commit.
 *   No build-time enforcement yet; manual discipline required.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base color palette — single source of truth for all color values
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
  // ── PRIMARY BRAND ACCENTS ──
  CYAN: "#22D3EE",
  CYAN_LIGHT: "#06B6D4",
  CYAN_DARK: "#0891B2",
  PURPLE: "#0E0B1B",
  PURPLE_LIGHT: "#201D4C",
  PURPLE_DARK: "#000B14",
  PINK: "#8A2AE2",
  PINK_LIGHT: "#0E0926",
  PINK_DARK: "#EC4899",

  // ── STATUS & SEMANTIC COLORS ──
  GREEN: "#34D399",
  GREEN_LIGHT: "#6EE7B7",
  GREEN_DARK: "#10B981",
  RED: "#FF0000",
  RED_LIGHT: "#FCA5A5",
  RED_DARK: "#DC2626",
  ORANGE: "#FF4500",
  ORANGE_LIGHT: "#FDBA74",
  ORANGE_DARK: "#D97706",
  AMBER: "#F5A623",
  AMBER_LIGHT: "#FCD34D",
  AMBER_DARK: "#D97706",

  // ── TERTIARY ACCENT COLORS ──
  BLUE: "#03135c",
  BLUE_LIGHT: "#183e80",
  BLUE_DARK: "#010517",
  TEAL: "#14B8A6",
  TEAL_LIGHT: "#2DD4BF",
  TEAL_DARK: "#18805d",
  ROSE: "#ed003b",
  ROSE_LIGHT: "#ba0b37",
  ROSE_DARK: "#610119",
  INDIGO: "#0c031c",
  INDIGO_LIGHT: "#15013b",
  INDIGO_DARK: "#060012",
  VIOLET: "#660202",
  VIOLET_LIGHT: "#c20404",
  VIOLET_DARK: "#3b0101",

  // ── BACKGROUND & SURFACES (Synced with tailwind.config.js) ──
  BG: "#05070a",
  CORE: "#05080d",
  MID: "#05050d",
  CARD_RGB: "20, 14, 64",
  CARD_BG: "#140E40",
  SURFACE: "#051123",
  SURFACE_LIGHT: "#001422",
  OVERLAY: "#010517",

  // ── NEUTRAL GRAYS (dark theme) ──
  GRAY_900: "#05050d",
  GRAY_800: "#080912",
  GRAY_700: "#090a12",
  GRAY_600: "#0b0c12",
  GRAY_500: "#10111c",
  GRAY_400: "#0f101a",
  GRAY_300: "#0f1017",
  GRAY_200: "#111114",
  GRAY_100: "#27272b",
  GRAY_50: "#3b3c3d",

  // ── TEXT HIERARCHY (white-on-dark) ──
  TEXT_BASE: "#EDEAF7",
  TEXT_RGB: "237,234,247",
  TEXT_SECONDARY: "#B8ADCF",
  TEXT_TERTIARY: "#79708C",
  TEXT_DISABLED: "#5A4A6E",

  // ── UTILITY COLORS ──
  WHITE_RGB: "#011b3b",
  BLACK_RGB: "0,0,0",
  NAVY_HEX: "#000f2e",
  OBSIDIAN_HEX: "#010914",

  // ── SPECIAL GRADIENTS & EFFECTS ──
  GLOW_CYAN: "rgba(34,211,238,0.5)",
  GLOW_PURPLE: "rgba(139,124,246,0.5)",
  GLOW_PINK: "rgba(240,70,110,0.5)",
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 640,
  desktop: 768,
  wide: 1280,
} as const;

export const C = {
  // ── Brand accent colors (synced with tailwind.config.js `brand.*`) ──────
  cyan: PALETTE.CYAN, // Primary bright cyan — CTAs, active nav, focus rings
  purple: PALETTE.PURPLE, // Secondary visible indigo — hover states, secondary accents
  pink: PALETTE.PINK, // Destructive / admin badge / error alerts
  green: PALETTE.GREEN, // Success ONLY — checkmarks, status dots, never card bg
  amber: PALETTE.AMBER, // Premium badge, warnings, BYOK highlights

  // ── Background layers (synced with tailwind.config.js `surface.*`) ──────
  bg: PALETTE.BG, // Page canvas — outermost container backgrounds
  core: PALETTE.CORE, // Elevated surface — headers, modals, sidebars
  cardBg: PALETTE.CARD_BG, // Glass card background base

  // ── Text hierarchy — white-on-dark (synced with `content.*`) ─────────────
  text: PALETTE.TEXT_BASE, // Primary: headings, labels, values
  sub: `rgba(${PALETTE.TEXT_RGB},0.62)`, // Secondary: captions, meta, descriptions
  dim: `rgba(${PALETTE.TEXT_RGB},0.36)`, // Tertiary: placeholders, disabled, hints

  // ── Borders ──────────────────────────────────────────────────────────────
  border: `rgba(${PALETTE.WHITE_RGB},0.10)`, // Default glass card border
  borderCyan: `rgba(34,211,238,0.28)`, // Cyan-tinted border for focused/active states
  card: `rgba(3, 4, 10,0.58)`, // Glass card background

  // ── Extended Theme (for backward compat and nested access) ───────────────
  theme: {
    colors: {
      background: {
        primary: PALETTE.BG,
        secondary: PALETTE.CORE,
      },
      text: {
        primary: PALETTE.TEXT_BASE,
        secondary: `rgba(${PALETTE.TEXT_RGB},0.62)`,
        dim: `rgba(${PALETTE.TEXT_RGB},0.36)`,
      },
      accent: {
        cyan: PALETTE.CYAN,
        purple: PALETTE.PURPLE,
        pink: PALETTE.PINK,
      },
    },
  },

  // ── Legacy nested color map (kept for backward compat with C.colors.*) ──
  colors: {
    background: PALETTE.BG,
    card: `rgba(3, 4, 10,0.98)`,
    cardBorder: `rgba(${PALETTE.BLACK_RGB},0.10)`,
    neon: {
      cyan: PALETTE.CYAN,
      pink: PALETTE.PINK,
      purple: PALETTE.PURPLE,
      orange: PALETTE.ORANGE,
      navy: PALETTE.NAVY_HEX,
      red: PALETTE.RED,
      obsidian: PALETTE.OBSIDIAN_HEX,
      green: PALETTE.GREEN,
    },
    text: {
      primary: PALETTE.TEXT_BASE,
      secondary: `rgba(${PALETTE.TEXT_RGB},0.62)`,
    },
  },

  animation: {
    spring: { damping: 15, stiffness: 300 },
    timing: { fast: 150, normal: 300, slow: 500 },
  },
} as const;

/** @deprecated — tokens have moved to C.*  (C.bg, C.sub, C.dim, etc.)
 *  This export is kept to avoid breaking any imports that may exist outside
 *  the tracked files. New code should use C.bg, C.sub, C.dim directly.
 */
export const bg = {
  text: C.text,
  sub: C.sub,
  dim: C.dim,
  transparent: "transparent",
} as const;

export const ROLE_CFG = {
  admin: {
    color: C.pink,
    label: "ADMIN",
    bg: `${C.pink}12`,
    border: `${C.pink}40`,
  },
  premium: {
    color: C.amber,
    label: "PREMIUM",
    bg: `${C.amber}12`,
    border: `${C.amber}40`,
  },
  member: {
    color: C.purple,
    label: "MEMBER",
    bg: `${C.purple}12`,
    border: `${C.purple}40`,
  },
} as const;

export type RoleName = keyof typeof ROLE_CFG;

export const webHover = {
  card: {
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  scaleUp: "scale(1.015)",
  scaleDown: "scale(0.97)",
  glowCyan: `0 0 24px rgba(34,211,238,0.20), 0 8px 32px rgba(0,0,0,0.4)`,
} as const;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║ AMBIENT BACKGROUND CONFIGURATION — GLOBAL NEBULA ENGINE                   ║
 * ║ Rendered on every page via components/layout/AmbientBackground.tsx        ║
 * ║                                                                            ║
 * ║ CUSTOMIZATION GUIDE:                                                       ║
 * ║  • enabled: true/false to toggle ambient effect on all pages              ║
 * ║  • pulseColors: [color1, color2, color3] — RGB hex for expanding rings   ║
 * ║  • orbColors: [color1, color2, color3] — RGB hex for wandering blobs     ║
 * ║  • pulseTimingMs: Duration of each pulse cycle (8000 = 8 seconds)         ║
 * ║  • pulsDelayOffset: Stagger between pulse rings (2500 = 2.5 sec)          ║
 * ║  • pulseScale: [min, max] ring size range during animation                ║
 * ║  • pulseOpacity: [start, mid, end] opacity curve over pulse lifetime      ║
 * ║  • orbBreathingFreq: Frequency of blob breathing & movement (0.5 = slow)  ║
 * ║                                                                            ║
 * ║ COLORS: Use C.cyan, C.purple, C.pink from above, or any hex string        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
export const AMBIENT_CONFIG = {
  // Global on/off for the entire ambient background system
  enabled: true,

  // ────────────────────────────────────────────────────────────────────────
  // CORE PULSE CONFIGURATION (expanding rings from center)
  // ────────────────────────────────────────────────────────────────────────
  pulseColors: [C.cyan, C.core, C.green] as const,
  pulseTimingMs: 8000, // 8 seconds per full pulse cycle
  pulsDelayOffset: 2500, // 2.5 second stagger between rings
  pulseScaleMin: 0.8, // Smallest scale at pulse start
  pulseScaleMax: 2.5, // Largest scale at pulse end
  pulseOpacityStart: 0.3, // Opacity when pulse begins
  pulseOpacityMid: 0.1, // Opacity at midpoint
  pulseOpacityEnd: 0, // Opacity when pulse fades completely

  // ────────────────────────────────────────────────────────────────────────
  // ORGANIC ORB CONFIGURATION (wandering colored blobs)
  // ────────────────────────────────────────────────────────────────────────
  orbColors: [C.cyan, C.core, C.green] as const,
  orbBreathingFreq: 0.5, // Frequency of blob breathing (0.5 = slow, 2 = fast)

  // NOTE: Speed & phase offsets are hard-coded in AmbientBackground.tsx
  //       to maintain consistency. To adjust the three orb trajectories,
  //       edit components/layout/AmbientBackground.tsx directly (search for
  //       "ORGANIC ORBS" section, lines ~70-130).
} as const;

export const theme = C.theme;
