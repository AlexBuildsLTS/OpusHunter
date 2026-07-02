/**
 * components/ui/AmbientBackground.tsx
 * OpusHunter — Ambient Animated Background
 * 2026-07-02
 *
 * Previously: nothing. Stack's contentStyle was flat `backgroundColor:
 * 'transparent'` with zero background layer mounted anywhere in the tree —
 * that's why there was no motion at all vs. veraxai.vercel.app. This runs
 * three soft orbs drifting on the UI thread (useFrameCallback, no JS bridge
 * traffic, cheap on low-end phones), in OpusHunter's own violet/emerald
 * palette — not VeraxAI's cyan. Mount ONCE in app/_layout.tsx, behind
 * everything, `pointerEvents="none"`.
 */

import React, { useMemo } from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useFrameCallback,
    interpolate,
} from 'react-native-reanimated';
import { C } from '../../lib/theme';

interface OrbConfig {
    size: number;
    color: string;
    startX: number;
    startY: number;
    speed: number;
    phase: number;
    driftX: number;
    driftY: number;
}

function Orb({ cfg }: { cfg: OrbConfig }) {
    const t = useSharedValue(cfg.phase);

    useFrameCallback((frameInfo) => {
        'worklet';
        const dt = (frameInfo.timeSincePreviousFrame ?? 16) / 1000;
        t.value += dt * cfg.speed;
    }, true);

    const style = useAnimatedStyle(() => {
        const x = interpolate(Math.sin(t.value), [-1, 1], [-cfg.driftX, cfg.driftX]);
        const y = interpolate(Math.cos(t.value * 0.8), [-1, 1], [-cfg.driftY, cfg.driftY]);
        return {
            transform: [{ translateX: x }, { translateY: y }],
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    left: cfg.startX,
                    top: cfg.startY,
                    width: cfg.size,
                    height: cfg.size,
                    borderRadius: cfg.size / 2,
                    backgroundColor: cfg.color,
                    opacity: Platform.OS === 'web' ? 0.16 : 0.10,
                },
                Platform.OS === 'web'
                    ? ({ filter: 'blur(90px)' } as any)
                    : { transform: [] }, // native: no filter support, rely on low opacity instead
                style,
            ]}
        />
    );
}

export function AmbientBackground() {
    const { width, height } = useWindowDimensions();

    const orbs = useMemo<OrbConfig[]>(
        () => [
            { size: width * 0.9, color: C.cyan, startX: -width * 0.25, startY: -height * 0.1, speed: 0.06, phase: 0, driftX: 40, driftY: 30 },
            { size: width * 0.7, color: C.purple, startX: width * 0.45, startY: height * 0.35, speed: 0.045, phase: 2.1, driftX: 50, driftY: 40 },
            { size: width * 0.55, color: C.cyan, startX: -width * 0.1, startY: height * 0.65, speed: 0.05, phase: 4.4, driftX: 30, driftY: 50 },
        ],
        [width, height],
    );

    return (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: C.bg }}>
            {orbs.map((cfg, i) => (
                <Orb key={i} cfg={cfg} />
            ))}
            {/* Subtle top vignette so content near the top edge stays readable over orbs */}
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
                    backgroundImage: Platform.OS === 'web' ? `linear-gradient(to bottom, ${C.bg}CC 0%, transparent 100%)` : undefined,
                    backgroundColor: Platform.OS !== 'web' ? 'transparent' : undefined,
                }}
            />
        </View>
    );
}