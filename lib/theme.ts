/**
 * lib/theme.ts
 * OpusHunter — Single Source of Truth for Design Tokens
 * 2026-07-02 — Repalette #2: "Frosted Obsidian Violet"
 *
 * WHAT CHANGED FROM LAST PASS:
 *   The previous repalette set `purple` (the secondary accent, used on 1 of
 *   4 dashboard metric cards, nav cards, etc.) to a deep EMERALD GREEN
 *   (#12B76A), on top of `green` already being green — so 2 of the app's 5
 *   accent colors were both green, and MetricCard washes each stat card's
 *   *entire background* in `${color}06`, which is why the dashboard read
 *   as a solid green block. `purple` is now genuinely purple (deep indigo
 *   violet, #6C5CE0), distinct from the primary violet (`cyan` key,
 *   #9B6BFF) and nothing like green. `green` stays reserved for small
 *   success accents (checkmarks, tiny status dots) — per instruction, nDO
 *   NOT use it as a full-card background wash anywhere going forward.
 *
 *   Backgrounds moved from green-black to true deep purple-black
 *   (#0C0D1D), matching the frosted, minimal reference mood — a barely-
 *   there gradient, not a colored surface.
 *
 * Token KEYS are unchanged (cyan/purple/pink/green/amber) so existing
 * `C.cyan`, `bg-brand-cyan` etc. keep working — only values moved.
 */

export const C = {
    // Primary neons — OpusHunter brand colors
    cyan: '#9B6BFF',     // Primary — vivid violet. CTAs, active states, links.
    purple: '#6C5CE0',   // Secondary — true deep indigo/blue-violet. Distinct from primary, NOT green.
    pink: '#F0466E',     // Admin badge, destructive actions, alerts.
    green: '#34D399',    // Success ONLY — small icons/dots/checkmarks. Never a full-card background wash.
    amber: '#F5A623',    // Premium badge, warnings, BYOK highlights.

    // Backgrounds — deep frosted purple-black, ONE canonical value shared
    // byte-for-byte with tailwind.config.js and global.css.
    obsidian: '#0C0D1D',
    bg: '#0C0D1D',
    core: '#14122A',
    mid: '#121127',

    // Surface tokens — true glass: near-transparent, blurred, not colored
    card: 'rgba(20,14,32,0.08)',
    sidebar: '#101024',
    border: 'rgba(255,255,255,0.08)',

    // Tinted / semantic borders
    borderCyan: 'rgba(155,107,255,0.06)',
    borderError: 'rgba(240,70,110,0.3)',
    borderSuccess: 'rgba(52,211,153,0.3)',
    borderWarning: 'rgba(245,166,35,0.3)',
    borderC: 'rgba(155,107,255,0.14)',
    borderP: 'rgba(108,92,224,0.14)',
    borderK: 'rgba(240,70,110,0.14)',

    // Content/text
    text: '#EDEAF7',
    sub: 'rgba(237,234,247,0.46)',
    dim: 'rgba(237,234,247,0.24)',

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
    glowCyan: `0 0 24px rgba(155,107,255,0.15), 0 8px 32px rgba(0,0,0,0.4)`,
};