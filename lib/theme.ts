/**
 * lib/theme.ts
 * OpusHunter — Single Source of Truth for Design Tokens
 * 2026-07-01
 *
 * This is the ONLY place brand colors are allowed to be declared.
 * Every screen/component must import from here instead of declaring a
 * local `const C = { ... }` or `const T = { ... }`:
 *
 *   import { C } from '../../lib/theme';   // adjust path per file depth
 *
 * Source of truth: app/(auth)/login.tsx's design system (the canonical,
 * most recently audited screen). These values are intentionally identical
 * to the CSS variables in global.css and the token keys in tailwind.config.js.
 * One change here propagates everywhere — no more cyan/purple/pink drift,
 * and no more divergent "obsidian" background values between screens.
 */

// ── Brand palette ─────────────────────────────────────────────────────────────
export const C = {
    // Primary neons — OpusHunter brand colors
    cyan: '#00D4FF',     // Primary CTA, active states, links, progress
    purple: '#7B5EA7',   // Member badge, secondary accent, AI indicators
    pink: '#E8436A',     // Admin badge, destructive actions, alerts
    green: '#00C67D',    // Success, "Access Granted", operational status
    amber: '#F59E0B',    // Premium badge, warnings, "BYOK" highlights

    // Backgrounds — deep obsidian stack (one canonical value, no more
    // #0A1419 / #050C12 / #02021a / #020205 variants scattered per-screen)
    obsidian: '#020507',  // Root background
    bg: '#020507',        // Alias of `obsidian` — kept for screens already using C.bg
    core: '#040C14',      // Mid-layer (cards floating over bg)
    mid: '#071220',       // Elevated panels

    // Surface tokens
    card: 'rgba(8,16,24,0.90)',          // Default card background
    sidebar: '#050A0D',                   // Left nav sidebar
    border: 'rgba(255,255,255,0.07)',     // Default border

    // Tinted / semantic borders
    borderCyan: 'rgba(0,212,255,0.14)',
    borderError: 'rgba(232,67,106,0.3)',
    borderSuccess: 'rgba(0,198,125,0.3)',
    borderWarning: 'rgba(245,158,11,0.3)',
    // Short aliases (role-badge tints, kept for back-compat with ROLE_CFG below)
    borderC: 'rgba(0,212,255,0.12)',
    borderP: 'rgba(123,94,167,0.12)',
    borderK: 'rgba(232,67,106,0.12)',

    // Content/text
    text: '#D8E4EC',                   // Primary text
    sub: 'rgba(216,228,236,0.45)',     // Secondary/muted text
    dim: 'rgba(216,228,236,0.22)',     // Placeholder / disabled text

    transparent: 'transparent',
} as const;

// ── Typed role config — one place to update role colors ──────────────────────
export const ROLE_CFG = {
    admin: { color: C.pink, label: 'ADMIN', bg: `${C.pink}12`, border: `${C.pink}40` },
    premium: { color: C.amber, label: 'PREMIUM', bg: `${C.amber}12`, border: `${C.amber}40` },
    member: { color: C.purple, label: 'MEMBER', bg: `${C.purple}12`, border: `${C.purple}40` },
} as const;

export type RoleName = keyof typeof ROLE_CFG;

// ── Hover/press feedback helpers (web CSS only) ───────────────────────────────
// Use these via style prop on web, or via Pressable's onHoverIn/onHoverOut
export const webHover = {
    card: { cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
    scaleUp: 'scale(1.015)',
    scaleDown: 'scale(0.97)',
    glowCyan: `0 0 24px rgba(0,212,255,0.22), 0 8px 32px rgba(0,0,0,0.4)`,
};
