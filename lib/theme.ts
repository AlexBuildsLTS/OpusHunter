/**
 * lib/theme.ts
 * OpusHunter — Single Source of Truth for Design Tokens
 * 2026-07-02 — Added layout geometry + hover tokens (sidebar/header fit fix)
 *
 * WHAT CHANGED:
 *   All prior values are byte-for-byte unchanged (still numerically
 *   identical to tailwind.config.js and global.css — do not let that drift
 *   happen again). Added: layout geometry constants so the sidebar width /
 *   content offset / header height are computed from ONE place instead of
 *   being hand-typed as `pl-[120px]` in one file and `72px` in another
 *   (that mismatch was the literal cause of the sidebar "not fitting").
 *   Also added a reusable hover glow token for card hover states.
 */

// ── Brand palette ─────────────────────────────────────────────────────────────
export const C = {
    // Primary neons — OpusHunter brand colors
    cyan: '#9B5CFF',     // NOTE: key name is legacy — this is now the primary VIOLET (was electric blue #00D4FF). Primary CTA, active states, links, progress.
    purple: '#12B76A',   // NOTE: key name is legacy — this is now deep EMERALD (was muted violet #7B5EA7). Member badge, secondary accent.
    pink: '#E8436A',     // Admin badge, destructive actions, alerts — unchanged.
    green: '#00D98A',    // Success, "Access Granted", operational status.
    amber: '#F59E0B',    // Premium badge, warnings, "BYOK" highlights — unchanged.

    // Backgrounds — deep obsidian-green stack, ONE canonical value shared
    // byte-for-byte with tailwind.config.js and global.css.
    obsidian: '#060B08',  // Root background
    bg: '#060B08',         // Alias of `obsidian` — kept for screens already using C.bg
    core: '#0A1712',       // Mid-layer (cards floating over bg)
    mid: '#0D1F17',        // Elevated panels

    // Surface tokens
    card: 'rgba(10,20,16,0.90)',          // Default card background
    sidebar: '#070F0A',                    // Left nav sidebar
    border: 'rgba(255,255,255,0.08)',      // Default border

    // Tinted / semantic borders
    borderCyan: 'rgba(155,92,255,0.14)',   // violet
    borderError: 'rgba(232,67,106,0.3)',
    borderSuccess: 'rgba(0,217,138,0.3)',
    borderWarning: 'rgba(245,158,11,0.3)',
    // Short aliases (role-badge tints, kept for back-compat with ROLE_CFG below)
    borderC: 'rgba(155,92,255,0.12)',      // violet
    borderP: 'rgba(18,183,106,0.12)',      // emerald
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

// ── Layout geometry — the single source of truth for sidebar/content fit ─────
// Previously `pl-[120px]` was hand-typed in AdaptiveLayout.tsx while
// global.css's `.tabs-content` independently hand-typed `margin-left: 72px`
// for the SAME gap — a 48px drift that made desktop content clip under the
// sidebar. Every layout file now imports these instead of re-typing numbers.
export const LAYOUT = {
    sidebarW: 72,                                   // sidebar rail width (px)
    sidebarInset: 24,                                // sidebar's left/top/bottom offset from viewport edge
    sidebarGap: 24,                                  // gap between sidebar's right edge and page content
    get sidebarOffset() {                            // total left offset content needs = 24 + 72 + 24
        return this.sidebarInset * 2 + this.sidebarW;
    },
    headerH: 64,                                     // AppHeader reference height (mobile)
} as const;

// ── Hover/press feedback helpers (web CSS only) ───────────────────────────────
export const webHover = {
    card: { cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
    scaleUp: 'scale(1.015)',
    scaleDown: 'scale(0.97)',
    glowCyan: `0 0 24px rgba(155,92,255,0.22), 0 8px 32px rgba(0,0,0,0.4)`,
    /** Stronger bloom for GlassCard's `hoverable` state — frosty-lift effect. */
    cardHoverShadow:
        '0 0 32px rgba(155,92,255,0.28), 0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
};