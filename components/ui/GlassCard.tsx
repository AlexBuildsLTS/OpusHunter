import React from 'react';
import { View, Platform, StyleSheet, ViewProps } from 'react-native';

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
    borderColor: 'rgba(120,200,240,0.12)',
    backgroundColor: 'rgba(140,210,255,0.05)',
    overflow: 'hidden',
    ...(Platform.OS === 'ios' ? {
      shadowColor: 'rgba(0,212,255,0.1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
    } : {}),
  },
  webBlur: {
    position: 'absolute' as any,
    inset: 0,
    backdropFilter: 'blur(24px) saturate(160%) brightness(1.08)' as any,
    WebkitBackdropFilter: 'blur(24px) saturate(160%) brightness(1.08)' as any,
    backgroundColor: 'rgba(100,180,220,0.06)',
  } as any,
  inner: {
    position: 'relative',
    zIndex: 1,
    padding: 20,
  },
});
