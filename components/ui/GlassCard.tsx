/**
 * components/ui/GlassCard.tsx
 * OpusHunter — Shared Glass / Bento Card Primitive
 * 2026-07-04 — Cross-platform press + hover animation.
 *   Web:    CSS hover classes (translate-y, scale, glow) — zero JS cost.
 *   Native: Reanimated spring scale on press — same feel, ~0.3 KB overhead.
 *   When `onPress` is undefined the card renders as a plain View (no touch
 *   target, no extra bridge calls) — so existing non-interactive cards are
 *   completely unaffected and incur no performance penalty on old devices.
 */

import React from 'react';
import { View, Platform, ViewProps, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { cn } from '../../lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { mass: 0.4, damping: 18, stiffness: 340, overshootClamping: true };

export type GlassTint = 'default' | 'frost' | 'cyan' | 'purple' | 'pink' | 'green' | 'amber';

const TINT_BORDER: Record<GlassTint, string> = {
  default: 'border-surface-border',
  frost: 'border-brand-cyan/16',
  cyan: 'border-brand-cyan/20',
  purple: 'border-brand-purple/20',
  pink: 'border-brand-pink/20',
  green: 'border-brand-green/20',
  amber: 'border-brand-amber/20',
};

const TINT_BG: Record<GlassTint, string> = {
  default: 'bg-surface-card',
  frost: 'bg-surface-frost',
  cyan: 'bg-brand-cyan/5',
  purple: 'bg-brand-purple/5',
  pink: 'bg-brand-pink/5',
  green: 'bg-brand-green/5',
  amber: 'bg-brand-amber/5',
};

const TINT_GLOW_SHADOW: Record<GlassTint, string> = {
  default: 'shadow-glass',
  cyan: 'shadow-glow-cyan',
  purple: 'shadow-glow-purple',
  pink: 'shadow-glow-pink',
  green: 'shadow-glass',
  amber: 'shadow-glass',
  frost: ''
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
  // Native press spring — only runs on native; zero cost when onPress is undefined.
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const classes = cn(
    'relative overflow-hidden border',
    bento ? 'rounded-2xl' : 'rounded-3xl',
    TINT_BORDER[tint],
    TINT_BG[tint],
    'backdrop-blur-2xl',
    glow ? TINT_GLOW_SHADOW[tint] : 'shadow-card',
    PADDING[padding],
    Platform.OS === 'web' && hoverable && cn(
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

  // Native: wrap in Animated.Pressable for spring press feedback.
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
        {children}
      </AnimatedPressable>
    );
  }

  // Web or non-interactive native: plain View (no JS animation overhead).
  return (
    <View
      className={classes}
      style={[iosElevation, style]}
      {...props}
    >
      {children}
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