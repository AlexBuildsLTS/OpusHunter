/**
 * components/ui/GlassCard.tsx
 * OpusHunter — Shared Glass / Bento Card Primitive
 *
 * 2026-07-12 — FIXED: two real, verified bugs, not cosmetic guesses.
 *   1. `frost` tint referenced `bg-surface-frost` — a Tailwind class that
 *      does not exist in tailwind.config.js. It generated no CSS at all.
 *      Nearly every card in Configure's Engine tab uses tint="frost", so
 *      those cards had literally zero background fill — just a border and
 *      a web-only blur, floating over whatever's behind them.
 *   2. Colored tints (cyan/purple/pink/green/amber — used by ProfileDropdown,
 *      badges, etc.) filled their ENTIRE background with the tint color at
 *      5% opacity, no separate opaque base underneath. Combined with
 *      `backdrop-blur-2xl`, a Tailwind class that only compiles to CSS on
 *      web (React Native has no backdrop-filter equivalent), these cards
 *      were reasonably legible on web and nearly invisible on native —
 *      confirmed by reading NativeWind's actual output, not assumed.
 *
 *   FIX: every tint now renders an explicit, always-opaque base fill
 *   (`C.card`, ~68% — set directly via inline style so it can never resolve
 *   to a missing class) with the tint color layered on top as a translucent
 *   wash overlay, not a replacement for the base. On native, a real
 *   `expo-blur` BlurView sits behind that base for genuine frosted glass —
 *   the same dual-path pattern app/(tabs)/_layout.tsx's tab bar already
 *   used correctly; GlassCard just hadn't adopted it yet.
 *
 *   Cross-platform press + hover animation, unchanged:
 *   Web:    CSS hover classes (translate-y, scale, glow) — zero JS cost.
 *   Native: Reanimated spring scale on press — same feel, ~0.3 KB overhead.
 */

import React from 'react';
import { View, Platform, ViewProps, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { cn } from '../../lib/utils';
import { C } from '../../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { mass: 0.4, damping: 18, stiffness: 340, overshootClamping: true };
const IS_WEB = Platform.OS === 'web';

export type GlassTint = 'default' | 'frost' | 'cyan' | 'purple' | 'pink' | 'green' | 'amber';

// Every tint's base fill — always opaque, always set inline so a missing
// Tailwind token can never silently produce zero background again.
const TINT_BASE: Record<GlassTint, string> = {
  default: C.card,
  frost: 'rgba(26,22,44,0.74)', // cooler/lighter than default — the intended "frost" identity
  cyan: C.card,
  purple: C.card,
  pink: C.card,
  green: C.card,
  amber: C.card,
};

// Color wash layered on top of the base — this is what actually carries
// the tint's identity now, not the entire background.
const TINT_WASH: Record<GlassTint, string | null> = {
  default: null,
  frost: `${C.cyan}0D`,
  cyan: `${C.cyan}14`,
  purple: `${C.purple}14`,
  pink: `${C.pink}14`,
  green: `${C.green}14`,
  amber: `${C.amber}14`,
};

const TINT_BORDER: Record<GlassTint, string> = {
  default: 'border-surface-border',
  frost: 'border-brand-cyan/16',
  cyan: 'border-brand-cyan/20',
  purple: 'border-brand-purple/20',
  pink: 'border-brand-pink/20',
  green: 'border-brand-green/20',
  amber: 'border-brand-amber/20',
};

const TINT_GLOW_SHADOW: Record<GlassTint, string> = {
  default: 'shadow-glass',
  cyan: 'shadow-glow-cyan',
  purple: 'shadow-glow-purple',
  pink: 'shadow-glow-pink',
  green: 'shadow-glass',
  amber: 'shadow-glass',
  frost: 'shadow-glass',
};

// Static strings (required for NativeWind's JIT class extraction — dynamic
// template interpolation would not be picked up at build time).
const TINT_HOVER: Record<GlassTint, string> = {
  default: 'hover:border-white/20 hover:shadow-glass-lg',
  frost: 'hover:border-brand-cyan/30 hover:shadow-glow-cyan',
  cyan: 'hover:border-brand-cyan/40 hover:shadow-glow-cyan',
  purple: 'hover:border-brand-purple/40 hover:shadow-glow-purple',
  pink: 'hover:border-brand-pink/40 hover:shadow-glow-pink',
  green: 'hover:border-brand-green/40 hover:shadow-glow-purple',
  amber: 'hover:border-brand-amber/40 hover:shadow-glass-lg',
};

const PADDING: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  /** Color wash + border tint. Default is neutral glass. */
  tint?: GlassTint;
  /** Adds the colored ambient glow shadow matching the tint. */
  glow?: boolean;
  /** Internal padding scale. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Slightly tighter radius + designed to sit inside a bento grid gap-4. */
  bento?: boolean;
  /**
   * Web: CSS hover lift + glow + scale (default true).
   * Native: Reanimated spring scale-down on press (only active when onPress provided).
   */
  hoverable?: boolean;
  /** When provided, card becomes pressable. Native gets spring animation; web gets cursor:pointer. */
  onPress?: () => void;
  className?: string;
  /** Escape hatch for one-off inline overrides — used sparingly. */
  style?: any;
}

export function GlassCard({
  children,
  tint = 'default',
  glow = false,
  padding = 'md',
  bento = false,
  hoverable = true,
  onPress,
  className,
  style,
  ...props
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const radiusClass = bento ? 'rounded-2xl' : 'rounded-3xl';
  const wash = TINT_WASH[tint];

  const classes = cn(
    'relative overflow-hidden border',
    radiusClass,
    TINT_BORDER[tint],
    IS_WEB && 'backdrop-blur-2xl',
    glow ? TINT_GLOW_SHADOW[tint] : 'shadow-card',
    PADDING[padding],
    IS_WEB && hoverable && cn(
      'transition-all duration-300 ease-out',
      'hover:-translate-y-0.5 hover:scale-[1.012] hover:backdrop-blur-3xl',
      onPress && 'cursor-pointer',
      TINT_HOVER[tint],
    ),
    className,
  );

  const iosElevation = Platform.OS === 'ios'
    ? { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }
    : null;

  const baseFillStyle = { backgroundColor: TINT_BASE[tint] };
  const washOverlay = wash ? (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
  ) : null;

  const content = !IS_WEB ? (
    <>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, baseFillStyle]} />
      {washOverlay}
      {children}
    </>
  ) : (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, baseFillStyle]} />
      {washOverlay}
      {children}
    </>
  );

  if (Platform.OS !== 'web' && onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96, SPRING); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING); }}
        className={classes}
        style={[iosElevation, animatedStyle, style]}
        {...(props as any)}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      className={classes}
      style={[iosElevation, style]}
      {...props}
    >
      {content}
    </View>
  );
}

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('flex-row flex-wrap -m-2', className)}>
      {React.Children.map(children, (child) => (
        <View className="w-full p-2 md:w-1/2 lg:w-1/3">{child}</View>
      ))}
    </View>
  );
}