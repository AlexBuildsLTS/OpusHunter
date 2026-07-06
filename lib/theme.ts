/**
 * lib/theme.ts
 * OpusHunter — Single Source of Truth for Design Tokens
 * 2026-07-06 — FIXED: C.cyan and C.purple were dark violet hexes
 * (#1D132C / #1F0D3F) — within a few RGB points of the page background
 * (#0A0714 / #120D1E). Every screen that used C.cyan/C.purple for active
 * nav icons, focus borders, the RUN button, or tab indicators was
 * effectively invisible against its own background. login.tsx looked fine
 * only because it hardcodes its own rgba(0,212,255,...) values instead of
 * using these tokens — every other screen inherited the broken colors.
 *
 * This pass makes the token NAMES match the token VALUES: C.cyan is an
 * actual bright cyan again, C.purple an actual visible indigo. Contrast
 * against both C.bg (#0A0714) and C.core (#120D1E) was checked by eye and
 * by contrast ratio (both now exceed 4.5:1 against both background shades
 * at normal text sizes — verify again if you change bg/core).
 *
 * DESIGN SYSTEM:
 *   Background layers (darkest → lightest):  bg → core → card
 *   Text hierarchy (most → least visible):   text → sub → dim
 *   Accent hierarchy (primary → secondary):  cyan → purple → pink
 *
 * IMPORTANT: tailwind.config.js's `brand.*` colors and global.css's
 * `--neon-*` variables MUST stay numerically identical to the values below.
 * If you change a color here, change it in both other files in the same
 * commit — this three-way drift is exactly what caused the invisible-UI
 * bug in the first place. There is no build-time check enforcing this;
 * it's a manual discipline until someone wires up a token-generation step.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base color palette — single source of truth for all color values
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
    // ── PRIMARY BRAND ACCENTS ──
    CYAN: '#22D3EE',
    CYAN_LIGHT: '#06B6D4',
    CYAN_DARK: '#0891B2',
    PURPLE: '#8B7CF6',
    PURPLE_LIGHT: '#A78BFA',
    PURPLE_DARK: '#6366F1',
    PINK: '#F0466E',
    PINK_LIGHT: '#FB7185',
    PINK_DARK: '#EC4899',
    
    // ── STATUS & SEMANTIC COLORS ──
    GREEN: '#34D399',
    GREEN_LIGHT: '#6EE7B7',
    GREEN_DARK: '#10B981',
    RED: '#FF0000',
    RED_LIGHT: '#FCA5A5',
    RED_DARK: '#DC2626',
    ORANGE: '#FF4500',
    ORANGE_LIGHT: '#FDBA74',
    ORANGE_DARK: '#D97706',
    AMBER: '#F5A623',
    AMBER_LIGHT: '#FCD34D',
    AMBER_DARK: '#D97706',
    
    // ── TERTIARY ACCENT COLORS ──
    BLUE: '#3B82F6',
    BLUE_LIGHT: '#60A5FA',
    BLUE_DARK: '#1D4ED8',
    TEAL: '#14B8A6',
    TEAL_LIGHT: '#2DD4BF',
    TEAL_DARK: '#0D9488',
    ROSE: '#F43F5E',
    ROSE_LIGHT: '#FB7185',
    ROSE_DARK: '#E11D48',
    INDIGO: '#6366F1',
    INDIGO_LIGHT: '#818CF8',
    INDIGO_DARK: '#4F46E5',
    VIOLET: '#A78BFA',
    VIOLET_LIGHT: '#C4B5FD',
    VIOLET_DARK: '#7C3AED',
    
    // ── BACKGROUND & SURFACES ──
    BG: '#0A0714',
    CORE: '#120D1E',
    CARD_BG: '#0D0914',
    SURFACE: '#1A1625',
    SURFACE_LIGHT: '#261E38',
    OVERLAY: '#0F0A18',
    
    // ── NEUTRAL GRAYS (dark theme) ──
    GRAY_900: '#0F0A18',
    GRAY_800: '#1A1625',
    GRAY_700: '#2B1E3A',
    GRAY_600: '#3D2E4A',
    GRAY_500: '#5A4A6E',
    GRAY_400: '#79708C',
    GRAY_300: '#9B8FB0',
    GRAY_200: '#B8ADCF',
    GRAY_100: '#D5CCE0',
    GRAY_50: '#EFE9F7',
    
    // ── TEXT HIERARCHY (white-on-dark) ──
    TEXT_BASE: '#EDEAF7',
    TEXT_RGB: '237,234,247',
    TEXT_SECONDARY: '#B8ADCF',
    TEXT_TERTIARY: '#79708C',
    TEXT_DISABLED: '#5A4A6E',
    
    // ── UTILITY COLORS ──
    WHITE_RGB: '255,255,255',
    BLACK_RGB: '0,0,0',
    NAVY_HEX: '#000f2e',
    OBSIDIAN_HEX: '#010914',
    
    // ── SPECIAL GRADIENTS & EFFECTS ──
    GLOW_CYAN: 'rgba(34,211,238,0.5)',
    GLOW_PURPLE: 'rgba(139,124,246,0.5)',
    GLOW_PINK: 'rgba(240,70,110,0.5)',
} as const;

export const C = {
    // ── Brand accent colors (synced with tailwind.config.js `brand.*`) ──────
    cyan: PALETTE.CYAN,      // Primary bright cyan — CTAs, active nav, focus rings
    purple: PALETTE.PURPLE,  // Secondary visible indigo — hover states, secondary accents
    pink: PALETTE.PINK,      // Destructive / admin badge / error alerts
    green: PALETTE.GREEN,    // Success ONLY — checkmarks, status dots, never card bg
    amber: PALETTE.AMBER,    // Premium badge, warnings, BYOK highlights

    // ── Background layers (synced with tailwind.config.js `surface.*`) ──────
    bg: PALETTE.BG,          // Page canvas — outermost container backgrounds
    core: PALETTE.CORE,      // Elevated surface — headers, modals, sidebars
    cardBg: PALETTE.CARD_BG, // Glass card background base

    // ── Text hierarchy — white-on-dark (synced with `content.*`) ─────────────
    text: PALETTE.TEXT_BASE,                           // Primary: headings, labels, values
    sub: `rgba(${PALETTE.TEXT_RGB},0.62)`,             // Secondary: captions, meta, descriptions
    dim: `rgba(${PALETTE.TEXT_RGB},0.36)`,             // Tertiary: placeholders, disabled, hints

    // ── Borders ──────────────────────────────────────────────────────────────
    border: `rgba(${PALETTE.WHITE_RGB},0.10)`,         // Default glass card border
    borderCyan: `rgba(34,211,238,0.28)`,               // Cyan-tinted border for focused/active states
    card: `rgba(20,14,32,0.68)`,                       // Glass card background

    // ── Legacy nested color map (kept for backward compat with C.colors.*) ──
    colors: {
        background: PALETTE.BG,
        card: `rgba(20,14,32,0.68)`,
        cardBorder: `rgba(${PALETTE.WHITE_RGB},0.10)`,
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
    transparent: 'transparent',
} as const;

export const ROLE_CFG = {
    admin: { color: C.pink, label: 'ADMIN', bg: `${C.pink}12`, border: `${C.pink}40` },
    premium: { color: C.amber, label: 'PREMIUM', bg: `${C.amber}12`, border: `${C.amber}40` },
    member: { color: C.purple, label: 'MEMBER', bg: `${C.purple}12`, border: `${C.purple}40` },
} as const;

export type RoleName = keyof typeof ROLE_CFG;

export const webHover = {
    card: { cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
    scaleUp: 'scale(1.015)',
    scaleDown: 'scale(0.97)',
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
    pulseColors: [C.cyan, C.purple, C.pink] as const,
    pulseTimingMs: 8000,          // 8 seconds per full pulse cycle
    pulsDelayOffset: 2500,        // 2.5 second stagger between rings
    pulseScaleMin: 0.8,           // Smallest scale at pulse start
    pulseScaleMax: 2.5,           // Largest scale at pulse end
    pulseOpacityStart: 0.3,       // Opacity when pulse begins
    pulseOpacityMid: 0.1,         // Opacity at midpoint
    pulseOpacityEnd: 0,           // Opacity when pulse fades completely

    // ────────────────────────────────────────────────────────────────────────
    // ORGANIC ORB CONFIGURATION (wandering colored blobs)
    // ────────────────────────────────────────────────────────────────────────
    orbColors: [C.cyan, C.purple, C.pink] as const,
    orbBreathingFreq: 0.5,        // Frequency of blob breathing (0.5 = slow, 2 = fast)

    // NOTE: Speed & phase offsets are hard-coded in AmbientBackground.tsx
    //       to maintain consistency. To adjust the three orb trajectories,
    //       edit components/layout/AmbientBackground.tsx directly (search for
    //       "ORGANIC ORBS" section, lines ~70-130).
} as const;