import React from 'react';
import { ViewProps, View, StyleSheet } from 'react-native';
import { cn } from '../../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * components/layout/PageContainer.tsx
 * 2026-07-11 — FIXED: default background was a hardcoded `#01011398` wash,
 * independent of lib/theme.ts. Dashboard and Settings had already overridden
 * it to `bg-transparent` (to let the global AmbientBackground show through);
 * Jobs and Configure hadn't, so they rendered visibly darker than every other
 * tab. Default is now transparent, matching the screens that got it right —
 * override with `className` only for a screen that genuinely needs a solid
 * backdrop (e.g. a full-screen modal over other content).
 */
interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  safeAreaTop?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  safeAreaTop = true,
  ...props
}) => {
  return (
    <View
      className={cn('flex-1 bg-transparent', className)}
      style={styles.full}
      {...props}
    >
      <SafeAreaView
        style={styles.full}
        edges={safeAreaTop ? ['top', 'left', 'right'] : ['left', 'right']}
      >
        <View style={styles.full}>{children}</View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
});