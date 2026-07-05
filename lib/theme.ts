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

export const C = {
    // ── Brand accent colors (synced with tailwind.config.js `brand.*`) ──────
    cyan: '#22D3EE',    // Primary bright cyan — CTAs, active nav, focus rings
    purple: '#8B7CF6',  // Secondary visible indigo — hover states, secondary accents
    pink: '#F0466E',    // Destructive / admin badge / error alerts
    green: '#34D399',   // Success ONLY — checkmarks, status dots, never card bg
    amber: '#F5A623',   // Premium badge, warnings, BYOK highlights

    // ── Background layers (synced with tailwind.config.js `surface.*`) ──────
    bg: '#0A0714',      // Page canvas — outermost container backgrounds
    core: '#120D1E',    // Elevated surface — headers, modals, sidebars

    // ── Text hierarchy — white-on-dark (synced with `content.*`) ─────────────
    text: '#EDEAF7',                       // Primary: headings, labels, values
    sub: 'rgba(237,234,247,0.62)',         // Secondary: captions, meta, descriptions
    dim: 'rgba(237,234,247,0.36)',         // Tertiary: placeholders, disabled, hints

    // ── Borders ──────────────────────────────────────────────────────────────
    border: 'rgba(255,255,255,0.10)',      // Default glass card border
    borderCyan: 'rgba(34,211,238,0.28)',   // Cyan-tinted border for focused/active states
    card: 'rgba(20,14,32,0.68)',           // Glass card background

    // ── Legacy nested color map (kept for backward compat with C.colors.*) ──
    colors: {
        background: '#0A0714',
        card: 'rgba(20,14,32,0.68)',
        cardBorder: 'rgba(255,255,255,0.10)',
        neon: {
            cyan: '#22D3EE',
            pink: '#F0466E',
            purple: '#8B7CF6',
            orange: '#FF4500',
            navy: '#000f2e',
            red: '#FF0000',
            obsidian: '#010914',
            green: '#34D399',
        },
        text: {
            primary: '#EDEAF7',
            secondary: 'rgba(237,234,247,0.62)',
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