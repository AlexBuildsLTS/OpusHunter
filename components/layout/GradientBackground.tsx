/**
 * components/layout/GradientBackground.tsx
 * OpusHunter — Cross-platform Gradient Background
 * 2026-07-02 — Fixed mobile gradient rendering
 *
 * React Native View.backgroundImage is CSS-only and unsupported on native.
 * This wrapper uses:
 * - expo-linear-gradient on native (iOS, Android)
 *   - CSS backgroundImage on web
 */

import React from 'react';
import { View, Platform, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../lib/theme';

interface GradientBackgroundProps extends ViewProps {
    children: React.ReactNode;
    /** Gradient colors (for native gradient stack). Must have at least two colors. */
    colors?: [string, string, ...string[]];
    /** Start point for gradient (0-1 scale) */
    start?: { x: number; y: number };
    /** End point for gradient (0-1 scale) */
    end?: { x: number; y: number };
}

export function GradientBackground({
    children,
    colors = [
        `${C.cyan}0D`,  // Cyan with 5% opacity
        'transparent'
    ],
    start = { x: 0.5, y: 0 },
    end = { x: 0.5, y: 0.4 },
    style,
    ...props
}: GradientBackgroundProps) {
    // On web, use CSS backgroundImage (GPU-accelerated, performant)
    if (Platform.OS === 'web') {
        return (
            <View
                style={[
                    { backgroundColor: C.bg },
                    style,
                ]}
                {...props}
                // @ts-ignore web-only style
                onLayout={(e: any) => {
                    // Store dimensions for CSS-based gradient if needed
                    const el = e.target as any;
                    if (el) {
                        el.style.backgroundImage = `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 40%)`;
                        el.style.backgroundAttachment = 'fixed';
                    }
                }}
            >
                {children}
            </View>
        );
    }

    // On native (iOS, Android), use expo-linear-gradient
    // For a radial-like effect, stack two LinearGradients
    return (
        <View style={[s.container, style]} {...props}>
            {/* Base solid background */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />

            {/* Gradient overlay */}
            <LinearGradient
                colors={colors}
                start={start}
                end={end}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* Content */}
            <View style={s.content}>
                {children}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
    },
});
