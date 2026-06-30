import React from 'react';
import { View, Platform, StyleSheet, ViewProps } from 'react-native';
import { C } from '../../lib/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: any;
}

export function GlassCard({ children, style, ...props }: GlassCardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {Platform.OS === 'web' && (
        // @ts-ignore web-only
        <div style={styles.webBlur} />
      )}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderCyan,
    backgroundColor: C.card,
    overflow: 'hidden',
    ...(Platform.OS === 'ios' ? {
      shadowColor: C.cyan,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    } : {}),
  },
  webBlur: {
    position: 'absolute' as any,
    inset: 0,
    backdropFilter: 'blur(24px) saturate(160%) brightness(1.08)' as any,
    WebkitBackdropFilter: 'blur(24px) saturate(160%) brightness(1.08)' as any,
    backgroundColor: 'rgba(0,212,255,0.04)',
  } as any,
  inner: {
    position: 'relative',
    zIndex: 1,
    padding: 20,
  },
});
