/**
 * OpusHunter — Animation Config (Reanimated 4.5.1 + Worklets 0.10.1)
 * Subtle, professional, 120fps native-thread animations. No jank, no distraction.
 * Synced 2026-08-27 with constants/theme.ts + global.css.
 */

import { Easing } from "react-native-reanimated";

/* ── Spring Physics (Buttons, Cards, Swipes) ─────────────────────── */
export const springs = {
  /** Snappy press — 150ms */
  press: {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  },
  /** Card hover — 200ms */
  hover: {
    damping: 18,
    stiffness: 200,
    mass: 0.7,
  },
  /** Modal scale-in — 300ms */
  modal: {
    damping: 22,
    stiffness: 160,
    mass: 0.8,
  },
  /** Swipe deck throw — natural velocity */
  swipe: {
    damping: 15,
    stiffness: 180,
    mass: 0.9,
  },
} as const;

/* ── Timing Functions (Linear / Ease) ────────────────────────────── */
export const easings = {
  /** Smooth fade — 300ms */
  fadeIn: Easing.out(Easing.quad),
  /** Subtle slide-down — 400ms */
  slideDown: Easing.out(Easing.cubic),
  /** Ambient orb drift — 10s */
  ambient: Easing.inOut(Easing.sin),
  /** Radar sweep — 18s */
  radarSweep: Easing.linear,
} as const;

/* ── Durations (Subtle, professional) ────────────────────────────── */
export const durations = {
  /** Press states — fast feedback */
  fast: 150,
  /** Hover / transitions — standard */
  normal: 200,
  /** Modals / slides — slightly slower for polish */
  slow: 300,
  /** Ambient loops — very slow, non-distracting */
  ambientOrb: 10000,
  /** Radar sweep — extremely subtle */
  radarSweep: 18000,
  /** Skeleton shimmer — 1.6s */
  shimmer: 1600,
} as const;

/* ── Ambient Background Orbs ─────────────────────────────────────── */
export const ambientOrbs = {
  /** 3 orbs — subtle, never distracting */
  orbs: [
    {
      size: 400,
      color: "rgba(0, 210, 255, 0.12)", // Cyan
      startX: 0.1,
      startY: 0.1,
      driftX: 30,
      driftY: -20,
      periodMs: 10000,
    },
    {
      size: 350,
      color: "rgba(59, 130, 246, 0.10)", // Blue
      startX: 0.8,
      startY: 0.2,
      driftX: -25,
      driftY: 35,
      periodMs: 12000,
    },
    {
      size: 300,
      color: "rgba(16, 185, 129, 0.06)", // Green (very subtle)
      startX: 0.5,
      startY: 0.8,
      driftX: 20,
      driftY: -30,
      periodMs: 14000,
    },
  ],
  /** Global opacity — low enough to never interfere with content */
  opacity: 0.15,
  /** Max scale during drift — subtle */
  maxScale: 1.05,
} as const;

/* ── Swipe Deck Gesture Config ───────────────────────────────────── */
export const swipeDeck = {
  /** Rotation at max swipe distance */
  maxRotation: 15,
  /** Distance (px) before card flies off */
  throwThreshold: 200,
  /** Velocity (px/s) for natural throw */
  throwVelocity: 1200,
  /** Spring config for next card spring-in */
  nextCardSpring: {
    damping: 18,
    stiffness: 180,
    mass: 0.8,
  },
} as const;

/* ── Kanban Drag-and-Drop ────────────────────────────────────────── */
export const kanban = {
  /** Column drag animation — 250ms */
  dragDuration: 250,
  /** Card drop spring — 200ms */
  dropSpring: {
    damping: 20,
    stiffness: 220,
    mass: 0.6,
  },
} as const;

/* ── Tab Bar / Sidebar Layout Transitions ────────────────────────── */
export const layout = {
  /** Sidebar collapse/expand — 250ms */
  sidebarToggle: 250,
  /** Tab bar fade-in — 200ms */
  tabBarFade: 200,
} as const;

/* ── Skeleton Shimmer ────────────────────────────────────────────── */
export const skeleton = {
  /** Shimmer duration — 1.6s */
  durationMs: 1600,
  /** Gradient colors (light grey highlights) */
  colors: [
    "rgba(255, 255, 255, 0.02)",
    "rgba(255, 255, 255, 0.06)",
    "rgba(255, 255, 255, 0.02)",
  ],
} as const;
