/**
 * components/ui/GlassCard.tsx
 * OpusHunter — Shared Glass / Bento Card Primitive
 * 2026-07-01
 *
 * This is the ONE card surface every screen should use. Previously this
 * component existed but was never imported anywhere — every screen instead
 * declared its own local `StyleSheet` card with slightly different hex
 * values (border colors, radii, padding). That's why the app feels like
 * five different apps stitched together.
 *
 * Usage:
 *   <GlassCard>...</GlassCard>                          // default surface
 *   <GlassCard tint="cyan" glow>...</GlassCard>          // tinted + glow
 *   <GlassCard padding="lg" bento>...</GlassCard>        // bento grid tile
 *
 * All colors/radii/blur come from tailwind.config.js (surface.*, brand.*,
 * boxShadow.glass*) — change a token there and every card updates.
 */

import React from 'react';
import { View, Platform, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

export type GlassTint = 'default' | 'cyan' | 'purple' | 'pink' | 'green' | 'amber';

const TINT_BORDER: Record<GlassTint, string> = {
  default: 'border-surface-border',
  cyan: 'border-brand-cyan/20',
  purple: 'border-brand-purple/20',
  pink: 'border-brand-pink/20',
  green: 'border-brand-green/20',
  amber: 'border-brand-amber/20',
};

const TINT_BG: Record<GlassTint, string> = {
  default: 'bg-surface-card',
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
  className,
  style,
  ...props
}: GlassCardProps) {
  return (
    <View
      className={cn(
        'relative overflow-hidden border',
        bento ? 'rounded-2xl' : 'rounded-3xl',
        TINT_BORDER[tint],
        TINT_BG[tint],
        'backdrop-blur-2xl',
        glow ? TINT_GLOW_SHADOW[tint] : 'shadow-card',
        PADDING[padding],
        className,
      )}
      style={[
        Platform.OS === 'ios'
          ? { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }
          : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * BentoGrid — simple responsive wrapper for laying GlassCards out as a
 * bento board. Wraps on mobile (single column), 2–3 columns on wider
 * viewports via flex-wrap + basis, no extra dependency needed.
 */
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