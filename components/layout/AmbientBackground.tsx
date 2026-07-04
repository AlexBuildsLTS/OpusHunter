/**
 * components/layout/AmbientBackground.tsx
 * OpusHunter — Global Nebula Ambient Engine
 * 2026-07-04 — Renders on EVERY page, powered by theme.ts config
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║ CUSTOMIZATION: Edit lib/theme.ts → AMBIENT_CONFIG to change colors,      ║
 * ║ speeds, sizes, opacity, and timing. Everything is centralized there.      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect } from 'react';
import { View, Dimensions, Platform, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
    useFrameCallback,
} from 'react-native-reanimated';
import { AMBIENT_CONFIG } from '../../lib/theme';

const IS_WEB = Platform.OS === 'web';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CORE PULSE — Expanding rings of color that grow & fade from center
 * ════════════════════════════════════════════════════════════════════════════
 * Config: delay, color, size, timing, opacity curve — all from AMBIENT_CONFIG
 */
const CorePulse = React.memo(
    ({ delay, color, size, centerX, centerY }: any) => {
        const pulse = useSharedValue(0);

        useEffect(() => {
            pulse.value = withDelay(
                delay,
                withRepeat(
                    withTiming(1, {
                        duration: AMBIENT_CONFIG.pulseTimingMs,
                        easing: Easing.out(Easing.cubic),
                    }),
                    -1,
                    false,
                ),
            );
        }, [delay, pulse]);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [
                {
                    scale: interpolate(
                        pulse.value,
                        [0, 1],
                        [
                            AMBIENT_CONFIG.pulseScaleMin,
                            AMBIENT_CONFIG.pulseScaleMax,
                        ],
                    ),
                },
            ],
            opacity: interpolate(
                pulse.value,
                [0, 0.4, 1],
                [
                    AMBIENT_CONFIG.pulseOpacityStart,
                    AMBIENT_CONFIG.pulseOpacityMid,
                    AMBIENT_CONFIG.pulseOpacityEnd,
                ],
            ),
        }));

        return (
            <Animated.View
                pointerEvents="none"
                style={[
                    animatedStyle,
                    {
                        position: 'absolute',
                        left: centerX - size / 2,
                        top: centerY - size / 2,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        ...(IS_WEB ? ({ filter: 'blur(20px)' } as any) : {}),
                    },
                ]}
            />
        );
    },
);
CorePulse.displayName = 'CorePulse';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ORGANIC ORB — Wandering, breathing blobs that create depth
 * ════════════════════════════════════════════════════════════════════════════
 * Config: speed, breathing, opacity — all from AMBIENT_CONFIG
 */
const OrganicOrb = React.memo(
    ({
        color,
        size,
        initialX,
        initialY,
        speedX,
        speedY,
        phaseOffsetX,
        phaseOffsetY,
        opacityBase,
    }: any) => {
        const { width, height } = Dimensions.get('window');
        const time = useSharedValue(0);

        useFrameCallback((frameInfo) => {
            if (frameInfo.timeSincePreviousFrame === null) return;
            time.value += frameInfo.timeSincePreviousFrame / 1000;
        });

        const animatedStyle = useAnimatedStyle(() => {
            const xOffset =
                Math.sin(time.value * speedX + phaseOffsetX) * (width * 0.3);
            const yOffset =
                Math.cos(time.value * speedY + phaseOffsetY) * (height * 0.2);
            const breathe =
                1 + Math.sin(time.value * AMBIENT_CONFIG.orbBreathingFreq) * 0.15;

            return {
                transform: [
                    { translateX: initialX + xOffset },
                    { translateY: initialY + yOffset },
                    { scale: breathe },
                ],
                opacity:
                    opacityBase +
                    Math.sin(time.value * AMBIENT_CONFIG.orbBreathingFreq) *
                    0.02,
            };
        });

        return (
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: -size / 2,
                        left: -size / 2,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        ...(IS_WEB ? ({ filter: 'blur(60px)' } as any) : {}),
                    },
                    animatedStyle,
                ]}
            />
        );
    },
);
OrganicOrb.displayName = 'OrganicOrb';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * AMBIENT ARCHITECTURE — Master component, rendered on every page
 * ════════════════════════════════════════════════════════════════════════════
 * Composes CorePulse rings + OrganicOrb wanderers. Positions scale by
 * breakpoint (desktop vs mobile). Returns early if disabled via AMBIENT_CONFIG.
 */
export const AmbientBackground = React.memo(() => {
    // Early exit if disabled globally
    if (!AMBIENT_CONFIG.enabled) {
        return null;
    }

    const { width, height } = Dimensions.get('window');
    const isDesktop = width >= 1024;

    const coreX = width / 2;
    const coreY = isDesktop ? 160 : 120;
    const basePulseSize = isDesktop ? 300 : 200;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* ─── CORE PULSES: Three concentric rings, staggered ─── */}
            <CorePulse
                delay={0}
                color={AMBIENT_CONFIG.pulseColors[0]}
                size={basePulseSize}
                centerX={coreX}
                centerY={coreY}
            />
            <CorePulse
                delay={AMBIENT_CONFIG.pulsDelayOffset}
                color={AMBIENT_CONFIG.pulseColors[1]}
                size={basePulseSize}
                centerX={coreX}
                centerY={coreY}
            />
            <CorePulse
                delay={AMBIENT_CONFIG.pulsDelayOffset * 2}
                color={AMBIENT_CONFIG.pulseColors[2]}
                size={basePulseSize}
                centerX={coreX}
                centerY={coreY}
            />

            {/* ─── ORGANIC ORBS: Three wandering colored shapes ─── */}
            <OrganicOrb
                color={AMBIENT_CONFIG.orbColors[0]}
                size={width * 0.5}
                initialX={width * 0.2}
                initialY={height * 0.3}
                speedX={0.2}
                speedY={0.15}
                phaseOffsetX={0}
                phaseOffsetY={Math.PI / 2}
                opacityBase={0.06}
            />
            <OrganicOrb
                color={AMBIENT_CONFIG.orbColors[1]}
                size={width * 0.6}
                initialX={width * 0.8}
                initialY={height * 0.6}
                speedX={0.15}
                speedY={0.25}
                phaseOffsetX={Math.PI}
                phaseOffsetY={0}
                opacityBase={0.08}
            />
            <OrganicOrb
                color={AMBIENT_CONFIG.orbColors[2]}
                size={width * 0.4}
                initialX={width * 0.5}
                initialY={height * 0.8}
                speedX={0.25}
                speedY={0.1}
                phaseOffsetX={Math.PI / 4}
                phaseOffsetY={Math.PI}
                opacityBase={0.05}
            />
        </View>
    );
});

AmbientBackground.displayName = 'AmbientBackground';

export default AmbientBackground;
