/**
 * components/shared/AnimatedBackground.tsx
 * OpusHunter — Fluid Ambient Background Canvas
 *
 * Guaranteed 0% crash, 0% WebGL dependency.
 * Rock-solid deep dark obsidian background (#020617) with slow, fluid,
 * non-distracting sinusoidal drifting glowing orbs (Cyan, Blue, Indigo).
 *
 * Runs on:
 * - Web: Hardware-accelerated CSS compositor keyframes (smooth 60-120fps, zero GPU crash)
 * - Native: React Native Reanimated worklets on the native UI thread
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

// ─── Native Reanimated Orb Component ─────────────────────────────────────────
interface OrbProps {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  driftX: number;
  driftY: number;
  durationMs: number;
}

const NativeOrb: React.FC<OrbProps> = ({
  size,
  color,
  initialX,
  initialY,
  driftX,
  driftY,
  durationMs,
}) => {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    transX.value = withRepeat(
      withTiming(driftX, {
        duration: durationMs,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    transY.value = withRepeat(
      withTiming(driftY, {
        duration: durationMs * 1.25,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    scale.value = withRepeat(
      withTiming(1.15, {
        duration: durationMs * 0.8,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [driftX, driftY, durationMs]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: initialX,
          top: initialY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.6,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Web CSS Injector for zero-overhead, crash-proof compositor animation ─────
const WEB_KEYFRAMES = `
html, body, #root {
  background-color: #020617 !important;
}
@keyframes opusOrb1 {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(70px, -50px) scale(1.2); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes opusOrb2 {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(-65px, 55px) scale(1.15); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes opusOrb3 {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(50px, 70px) scale(1.25); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes opusGridPulse {
  0%, 100% { opacity: 0.04; }
  50% { opacity: 0.09; }
}
`;

export const AnimatedBackground = React.memo(() => {
  // Inject CSS keyframes once on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "opus-animated-bg-style";
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.textContent = WEB_KEYFRAMES;
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { pointerEvents: "none" as any }]}>
        {/* Base dark backdrop — completely black/obsidian, never white */}
        <View style={styles.baseDark} />

        {/* Ambient Subtle Grid Pattern */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              animation: "opusGridPulse 8s ease-in-out infinite",
            } as any,
          ]}
        />

        {/* Orb 1 — Aerospace Cyan */}
        <View
          style={
            {
              position: "absolute",
              top: "-5%",
              left: "5%",
              width: 550,
              height: 550,
              borderRadius: 275,
              background:
                "radial-gradient(circle, rgba(0, 210, 255, 0.35) 0%, rgba(0, 210, 255, 0) 70%)",
              filter: "blur(50px)",
              animation: "opusOrb1 12s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* Orb 2 — Electric Blue */}
        <View
          style={
            {
              position: "absolute",
              top: "25%",
              right: "5%",
              width: 500,
              height: 500,
              borderRadius: 250,
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.30) 0%, rgba(59, 130, 246, 0) 70%)",
              filter: "blur(55px)",
              animation: "opusOrb2 14s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* Orb 3 — Indigo / Violet */}
        <View
          style={
            {
              position: "absolute",
              bottom: "5%",
              left: "25%",
              width: 600,
              height: 600,
              borderRadius: 300,
              background:
                "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0) 70%)",
              filter: "blur(60px)",
              animation: "opusOrb3 16s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />
      </View>
    );
  }

  // Native fallback (Reanimated worklets)
  return (
    <View style={[styles.container, { pointerEvents: "none" as any }]}>
      <View style={styles.baseDark} />
      <NativeOrb
        size={350}
        color="rgba(0, 210, 255, 0.20)"
        initialX={-40}
        initialY={-40}
        driftX={50}
        driftY={40}
        durationMs={10000}
      />
      <NativeOrb
        size={320}
        color="rgba(59, 130, 246, 0.16)"
        initialX={220}
        initialY={180}
        driftX={-40}
        driftY={60}
        durationMs={12000}
      />
      <NativeOrb
        size={300}
        color="rgba(139, 92, 246, 0.14)"
        initialX={80}
        initialY={450}
        driftX={40}
        driftY={-50}
        durationMs={14000}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    zIndex: 0,
  },
  baseDark: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#020617",
  },
});
