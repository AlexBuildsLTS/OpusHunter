import React, { useMemo } from 'react';
import { ViewProps, View, StyleSheet, Platform } from 'react-native';
import { cn } from '../../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * components/layout/PageContainer.tsx
 * 2026-07-12 — OPTIMIZATION PASS: Modernized for flawless cross-platform support
 *
 * PURPOSE: Universal page shell for all content pages. Provides:
 *   • Transparent background by default (lets AmbientBackground show through)
 *   • Safe area insets on native (respects notches, dynamic island, home indicator)
 *   • Safe area + sidebar offset on desktop (via className override)
 *   • Flexible backdrop support (override className for opaque/custom backgrounds)
 *
 * PREVIOUS FIX (2026-07-11): default background was hardcoded #01011398,
 * independent of lib/theme.ts. Dashboard/Settings overrode it to bg-transparent
 * (correct); Jobs/Configure didn't, rendering darker than intended. Changed
 * default to transparent with optional override via className.
 *
 * ACCESSIBILITY:
 *   • Semantic structure: View root → SafeAreaView → content container
 *   • Safe area edges configurable per screen (top nav vs. tab bar contexts)
 *   • No hard-coded sizes; all responsive via flex + className composition
 *   • Platform-aware: native safe areas vs. web padding (if needed)
 *
 * PERFORMANCE:
 *   • Memoized style to prevent re-creation on every render
 *   • Minimal re-renders via useMemo (no dependency churn)
 *   • StyleSheet.create for RN optimization
 */
interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = React.memo(
  ({
    children,
    className,
    safeAreaTop = true,
    safeAreaBottom = false,
    ...props
  }) => {
    // Memoize safe area edges to prevent unnecessary SafeAreaView re-renders
    const safeAreaEdges = useMemo(
      () => {
        const edges: Array<'top' | 'bottom' | 'left' | 'right'> = ['left', 'right'];
        if (safeAreaTop) edges.unshift('top');
        if (safeAreaBottom) edges.push('bottom');
        return edges;
      },
      [safeAreaTop, safeAreaBottom],
    );

    return (
      <View
        className={cn('flex-1 bg-transparent', className)}
        style={styles.root}
        {...props}
      >
        <SafeAreaView
          style={styles.safeArea}
          edges={safeAreaEdges}
          pointerEvents="box-none"
        >
          <View style={styles.full}>{children}</View>
        </SafeAreaView>
      </View>
    );
  },
);

PageContainer.displayName = 'PageContainer';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...Platform.select({
      web: {},
      default: {},
    }),
  },
  safeArea: {
    flex: 1,
  },
  full: {
    flex: 1,
  },
});