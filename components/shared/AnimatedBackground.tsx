/**
 * components/shared/AnimatedBackground.tsx
 * OpusHunter — Ambient Telemetry Background.
 *
 * A single global background mounted once at the root layout (app/_layout.tsx),
 * so every screen inherits the exact same subtle motion with zero per-screen work.
 *
 * All motion runs on the native UI thread (Reanimated), so it never blocks the
 * React JS thread. Opacity is kept deliberately low (2–12%) — the animation
 * should "exist" without ever calling attention to itself.
 *
 * Layers (bottom → top):
 *   1. Deep space base    — solid deepest background.
 *   2. Particle field     — faint drifting dots (twinkle + drift).
 *   3. Wave ribbons       — glowing dot-waves flowing through the center.
 *   4. Electric pulses    — thin "data stream" lines gliding across.
 *   5. Grid mesh          — near-invisible 40px grid (web only).
 *   6. Sonar sweep        — one slow radar revolution every 24s.
 */

import React, { memo, useEffect } from "react";
import { View, StyleSheet, Platform, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  useFrameCallback,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "../../constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";

const CYAN = colors.accent.cyan;
const BLUE = colors.accent.blue;

// ─── 1. ORGANIC AMBIENT ORBS ────────────────────────────────────────────────
// Two large blurred blobs drifting on independent sine/cosine loops.
// A Lissajous path (sine on X, cosine on Y at different frequencies) never
// visibly repeats, so the motion feels organic rather than mechanical.

interface OrbProps {
  size: number;
  initialX: number;
  initialY: number;
  color: string;
  speedX: number;
  speedY: number;
  phaseOffset: number;
  opacityBase: number;
}

const OrganicOrb = memo(
  ({
    size,
    initialX,
    initialY,
    color,
    speedX,
    speedY,
    phaseOffset,
    opacityBase,
  }: OrbProps) => {
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame == null) return;
      time.value += frameInfo.timeSincePreviousFrame / 1000;
    });

    const animatedStyle = useAnimatedStyle(() => {
      const xOffset =
        Math.sin(time.value * speedX + phaseOffset) * (SCREEN_WIDTH * 0.2);
      const yOffset =
        Math.cos(time.value * speedY + phaseOffset) * (SCREEN_HEIGHT * 0.15);
      const breathe = 1 + Math.sin(time.value * 0.4) * 0.05;

      return {
        transform: [
          { translateX: initialX + xOffset },
          { translateY: initialY + yOffset },
          { scale: breathe },
        ],
        opacity: opacityBase + Math.sin(time.value * 0.5) * 0.01,
      };
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbBase,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          IS_WEB ? ({ filter: "blur(80px)" } as any) : {},
          animatedStyle,
        ]}
      />
    );
  },
);
OrganicOrb.displayName = "OrganicOrb";

// ─── 2. PARTICLE FIELD ──────────────────────────────────────────────────────
// Small dots that drift gently while twinkling in and out. Each dot owns one
// native withRepeat loop — cheap and UI-thread only.

interface ParticleProps {
  size: number;
  left: number;
  top: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
}

const Particle = memo(
  ({ size, left, top, color, delay, duration, drift }: ParticleProps) => {
    const progress = useSharedValue(0);

    useEffect(() => {
      progress.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          -1,
          false,
        ),
      );
    }, [delay, duration, progress]);

    const animatedStyle = useAnimatedStyle(() => {
      const phase = progress.value * Math.PI * 2;
      const opacity = 0.02 + 0.05 * (0.5 + 0.5 * Math.sin(phase));
      return {
        opacity,
        transform: [{ translateY: Math.sin(phase) * drift }],
      };
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.particle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            left,
            top,
          },
          animatedStyle,
        ]}
      />
    );
  },
);
Particle.displayName = "Particle";

// ─── 3. WAVE RIBBON ─────────────────────────────────────────────────────────
// A glowing wave built from small dots laid out horizontally. One shared time
// value drives every dot's sine displacement, so the ribbon flows as a single
// coherent wave — the "luminescent ribbon" from the reference artwork.
//
// Wave formula: y = baseY + sin((x / waveLength)·2π + time·speed) · amplitude

interface WaveDotProps {
  time: SharedValue<number>;
  x: number;
  baseY: number;
  amplitude: number;
  waveLength: number;
  speed: number;
  color: string;
  size: number;
  glow: boolean;
}

const WaveDot = memo(
  ({
    time,
    x,
    baseY,
    amplitude,
    waveLength,
    speed,
    color,
    size,
    glow,
  }: WaveDotProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const phase = (x / waveLength) * Math.PI * 2 + time.value * speed;
      const y = baseY + Math.sin(phase) * amplitude;
      return {
        transform: [{ translateX: x }, { translateY: y }],
      };
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            ...(glow && IS_WEB
              ? ({ boxShadow: `0 0 ${size * 4}px ${color}` } as any)
              : {}),
          },
          animatedStyle,
        ]}
      />
    );
  },
);
WaveDot.displayName = "WaveDot";

interface WaveRibbonProps {
  baseY: number;
  amplitude: number;
  waveLength: number;
  speed: number;
  dotSize: number;
  segments: number;
  color: string;
  opacity: number;
  glow?: boolean;
}

const WaveRibbon = memo(
  ({
    baseY,
    amplitude,
    waveLength,
    speed,
    dotSize,
    segments,
    color,
    opacity,
    glow = false,
  }: WaveRibbonProps) => {
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame == null) return;
      time.value += frameInfo.timeSincePreviousFrame / 1000;
    });

    const spacing = SCREEN_WIDTH / (segments - 1);

    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        {Array.from({ length: segments }).map((_, i) => (
          <WaveDot
            key={i}
            time={time}
            x={i * spacing}
            baseY={baseY}
            amplitude={amplitude}
            waveLength={waveLength}
            speed={speed}
            color={color}
            size={dotSize}
            glow={glow}
          />
        ))}
      </View>
    );
  },
);
WaveRibbon.displayName = "WaveRibbon";

// ─── 4. ELECTRIC SCRAPER PULSES (DATA STREAMS) ─────────────────────────────
// Thin 1px lines that glide across the full width/height and fade via a
// parabolic opacity curve (4·p·(1−p)), peaking mid-travel and vanishing at
// both ends — the "scraper signal" accent.

interface ElectricPulseProps {
  delay: number;
  top: number;
  isVertical: boolean;
}

const ElectricPulse = memo(({ delay, top, isVertical }: ElectricPulseProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      ),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = 4 * progress.value * (1 - progress.value) * 0.15;
    const translation =
      progress.value * (isVertical ? SCREEN_HEIGHT : SCREEN_WIDTH);

    return {
      opacity,
      transform: [
        isVertical ? { translateY: translation } : { translateX: translation },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseBase,
        isVertical
          ? { width: 1, height: 100, top: -100, left: top }
          : { width: 100, height: 1, left: -100, top: top },
        animatedStyle,
      ]}
    />
  );
});
ElectricPulse.displayName = "ElectricPulse";

// ─── 5. SONAR SWEEP ─────────────────────────────────────────────────────────
// One slow radar revolution every 24 seconds. Cross-platform via a rotating
// Reanimated view — no CSS keyframes, so it behaves identically on web/native.

const SonarSweep = memo(() => {
  const rotateZ = useSharedValue(0);

  useEffect(() => {
    rotateZ.value = withRepeat(
      withTiming(360, { duration: 24000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotateZ]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotateZ.value}deg` }],
  }));

  const radarSize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.5;

  return (
    <View style={styles.radarContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.radarSweep,
          sweepStyle,
          { width: radarSize, height: radarSize, borderRadius: radarSize / 2 },
        ]}
      />
    </View>
  );
});
SonarSweep.displayName = "SonarSweep";

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

export const AnimatedBackground = memo(() => {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Deep space base */}
      <View style={styles.spaceBg} />

      {/* Organic orbs — barely-visible depth */}
      <OrganicOrb
        size={600}
        color={CYAN}
        initialX={SCREEN_WIDTH * 0.1}
        initialY={SCREEN_HEIGHT * 0.2}
        speedX={0.08}
        speedY={0.06}
        phaseOffset={0}
        opacityBase={0.03}
      />
      <OrganicOrb
        size={500}
        color={BLUE}
        initialX={SCREEN_WIDTH * 0.8}
        initialY={SCREEN_HEIGHT * 0.7}
        speedX={0.05}
        speedY={0.07}
        phaseOffset={2}
        opacityBase={0.02}
      />

      {/* Particle field — faint drifting dots */}
      {Array.from({ length: 14 }).map((_, i) => (
        <Particle
          key={`p-${i}`}
          size={1.5 + (i % 3) * 0.75}
          left={(i * 73.7) % SCREEN_WIDTH}
          top={(i * 47.3) % SCREEN_HEIGHT}
          color={i % 3 === 0 ? BLUE : CYAN}
          delay={i * 450}
          duration={6000 + (i % 5) * 1200}
          drift={8 + (i % 4) * 4}
        />
      ))}

      {/* Wave ribbons — the flowing luminescent wave (center, subtle) */}
      <WaveRibbon
        baseY={SCREEN_HEIGHT * 0.55}
        amplitude={SCREEN_HEIGHT * 0.04}
        waveLength={SCREEN_WIDTH * 0.9}
        speed={0.5}
        dotSize={3}
        segments={26}
        color={CYAN}
        opacity={0.08}
        glow
      />
      <WaveRibbon
        baseY={SCREEN_HEIGHT * 0.35}
        amplitude={SCREEN_HEIGHT * 0.025}
        waveLength={SCREEN_WIDTH * 1.2}
        speed={0.32}
        dotSize={2}
        segments={22}
        color={BLUE}
        opacity={0.05}
      />

      {/* Electric pulses + grid mesh */}
      <View style={styles.gridOverlay} />
      {[20, 40, 60, 80].map((percent, i) => (
        <ElectricPulse
          key={`h-${i}`}
          delay={i * 1200}
          top={(SCREEN_HEIGHT * percent) / 100}
          isVertical={false}
        />
      ))}
      {[25, 50, 75].map((percent, i) => (
        <ElectricPulse
          key={`v-${i}`}
          delay={i * 1800 + 500}
          top={(SCREEN_WIDTH * percent) / 100}
          isVertical={true}
        />
      ))}

      {/* Slow radar sweep */}
      <SonarSweep />
    </View>
  );
});
AnimatedBackground.displayName = "AnimatedBackground";

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
    overflow: "hidden",
  },
  spaceBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.deepest,
  },
  orbBase: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  particle: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  waveDot: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  pulseBase: {
    position: "absolute",
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowRadius: 10,
    shadowOpacity: 1,
  },
  radarContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  radarSweep: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 255, 0.03)",
    borderRightColor: "rgba(0, 210, 255, 0.1)",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04,
    // Web-only grid mesh; native intentionally skips it (undefined = no-op).
    backgroundImage: IS_WEB
      ? "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)"
      : undefined,
    backgroundSize: IS_WEB ? "40px 40px" : undefined,
  },
});
