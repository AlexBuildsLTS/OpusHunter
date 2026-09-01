/**
 * components/shared/AnimatedBackground.tsx
 * OpusHunter — Unified Symmetrical Cybernetic Ambient Background
 *
 * Symmetrical, centered, aerospace-grade dark obsidian background (#050811).
 * Balanced dual-hemisphere ambient radiant glow mesh with centered orbital harmony.
 *
 * Runs on:
 * - Web: Hardware-accelerated CSS compositor keyframes (smooth 60-120fps, zero GPU crash)
 * - Native: React Native Reanimated worklets on the native UI thread
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

// ─── Native Reanimated Symmetric Orb Component ───────────────────────────────
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
        duration: durationMs * 1.15,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    scale.value = withRepeat(
      withTiming(1.1, {
        duration: durationMs * 0.9,
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
          opacity: 0.5,
        },
        animStyle,
      ]}
    />
  );
};

// ─── Web CSS Injector: Symmetrical, Balanced, Centered Harmonic Flow ─────────
const WEB_KEYFRAMES = `
html, body, #root {
  background-color: #050811 !important;
  margin: 0;
  padding: 0;
}
@keyframes opusOrbLeft {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(35px, -30px) scale(1.12); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes opusOrbRight {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(-35px, 30px) scale(1.12); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes opusCorePulse {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.18; }
  50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.32; }
  100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.18; }
}
@keyframes opusGridPulse {
  0%, 100% { opacity: 0.035; }
  50% { opacity: 0.07; }
}
`;

export const AnimatedBackground = React.memo(() => {
  const { width, height } = useWindowDimensions();

  // Inject CSS keyframes once on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "opus-animated-bg-style";
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = WEB_KEYFRAMES;
    }
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { pointerEvents: "none" as any }]}>
        {/* Base dark backdrop — #050811 deep obsidian */}
        <View style={styles.baseDark} />

        {/* Ambient Symmetrical Centered Grid */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              backgroundPosition: "center center",
              animation: "opusGridPulse 8s ease-in-out infinite",
            } as any,
          ]}
        />

        {/* Centered Symmetrical Deep Core Pulse (Deep Blue / Violet) */}
        <View
          style={
            {
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 750,
              height: 750,
              borderRadius: 375,
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(139, 92, 246, 0.12) 40%, rgba(5, 8, 17, 0) 70%)",
              filter: "blur(60px)",
              animation: "opusCorePulse 12s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* Left Symmetrical Radiant Wing — Cyan Accent */}
        <View
          style={
            {
              position: "absolute",
              top: "10%",
              left: "-100px",
              width: 500,
              height: 500,
              borderRadius: 250,
              background:
                "radial-gradient(circle, rgba(0, 210, 255, 0.20) 0%, rgba(0, 210, 255, 0) 70%)",
              filter: "blur(50px)",
              animation: "opusOrbLeft 14s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* Right Symmetrical Radiant Wing — Cyan Accent */}
        <View
          style={
            {
              position: "absolute",
              top: "10%",
              right: "-100px",
              width: 500,
              height: 500,
              borderRadius: 250,
              background:
                "radial-gradient(circle, rgba(0, 210, 255, 0.20) 0%, rgba(0, 210, 255, 0) 70%)",
              filter: "blur(50px)",
              animation: "opusOrbRight 14s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* Centered Bottom Ambient Horizon Light */}
        <View
          style={
            {
              position: "absolute",
              bottom: "-150px",
              left: "50%",
              transform: [{ translateX: -350 }],
              width: 700,
              height: 400,
              borderRadius: 200,
              background:
                "radial-gradient(ellipse, rgba(0, 210, 255, 0.15) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(5, 8, 17, 0) 80%)",
              filter: "blur(60px)",
              pointerEvents: "none",
            } as any
          }
        />
      </View>
    );
  }

  // Native Symmetrical Fallback
  return (
    <View style={[styles.container, { pointerEvents: "none" as any }]}>
      <View style={styles.baseDark} />
      <NativeOrb
        size={360}
        color="rgba(0, 210, 255, 0.18)"
        initialX={-60}
        initialY={80}
        driftX={35}
        driftY={25}
        durationMs={12000}
      />
      <NativeOrb
        size={360}
        color="rgba(0, 210, 255, 0.18)"
        initialX={width - 300}
        initialY={80}
        driftX={-35}
        driftY={25}
        durationMs={12000}
      />
      <NativeOrb
        size={400}
        color="rgba(59, 130, 246, 0.14)"
        initialX={width / 2 - 200}
        initialY={height / 2 - 200}
        driftX={0}
        driftY={30}
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
    backgroundColor: "#050811",
  },
});
