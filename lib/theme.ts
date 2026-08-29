/**
 * lib/theme.ts
 * OpusHunter — Theme re-export shim.
 *
 * SINGLE SOURCE OF TRUTH: constants/theme.ts (design tokens).
 * This file only re-exports those tokens and adds the `C` shorthand for
 * quick single-value access in root screens. New code should import tokens
 * from `constants/theme` directly; use `C` only where a short alias reads
 * better.
 */

export {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  gradients,
  breakpoints,
  ambient,
  durations,
} from "../constants/theme";

import { colors } from "../constants/theme";

/**
 * `C` — semantic color shorthand, mapped 1:1 to the tokens in constants/theme.
 * Keys are named by role (cyan/blue/red/...), never by legacy palette names.
 */
export const C = {
  // Brand accents
  cyan: colors.accent.cyan,
  blue: colors.accent.blue,
  green: colors.accent.green,
  amber: colors.accent.amber,
  red: colors.accent.red,

  // Background layers
  bg: colors.bg.deepest,
  core: colors.bg.core,
  mid: colors.bg.mid,

  // Surfaces
  card: colors.surface.card,
  border: colors.surface.border,
  borderCyan: colors.surface.borderCyan,
  borderBlue: colors.surface.borderBlue,

  // Text hierarchy
  text: colors.text.primary,
  sub: colors.text.secondary,
  dim: colors.text.dim,
  inverse: colors.text.inverse,
} as const;
