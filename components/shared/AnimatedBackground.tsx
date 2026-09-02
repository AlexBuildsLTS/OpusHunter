/**
 * components/shared/AnimatedBackground.tsx
 * OpusHunter — Unified Cybernetic 3D Matrix & Dynamic Wave Pipeline Engine
 *
 * Symmetrical, centered, Aerospace metallic dark navy (#050811 / #020609).
 * Features:
 * - 3D Perspective Cybernetic Grid Matrix with perspective depth & pulsing intersection nodes
 * - 3 Dynamic Glowing Pipeline Waves (Electric Cyan & Deep Cobalt) undulating in real-time
 * - Traveling Photon Energy Pulses gliding across pipeline paths
 * - Ambient Symmetrical Central Core & Horizon Radiant Glows
 *
 * Runs on:
 * - Web: Hardware-accelerated CSS compositor keyframes and SVGs (smooth 60-120fps, zero GPU crash)
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

// ─── Native Reanimated Ambient Fallbacks ──────────────────────────────────────
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

// ─── Web CSS Injector: 3D Grid + Undulating Waves + Traveling Pulses ───────────
const WEB_KEYFRAMES = `
html, body, #root {
  background-color: #050811 !important;
  margin: 0;
  padding: 0;
}

@keyframes opusPerspectiveGrid {
  0% { transform: perspective(500px) rotateX(60deg) translateY(0px) translateZ(0px); }
  100% { transform: perspective(500px) rotateX(60deg) translateY(60px) translateZ(0px); }
}

@keyframes opusCorePulse {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.18; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.32; }
  100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.18; }
}

@keyframes opusWavePrimary {
  0% { transform: translateY(0px) scaleY(1); opacity: 0.85; }
  50% { transform: translateY(-24px) scaleY(1.08); opacity: 1; }
  100% { transform: translateY(0px) scaleY(1); opacity: 0.85; }
}

@keyframes opusWaveSecondary {
  0% { transform: translateY(0px) scaleY(1.05); opacity: 0.7; }
  50% { transform: translateY(28px) scaleY(0.92); opacity: 0.95; }
  100% { transform: translateY(0px) scaleY(1.05); opacity: 0.7; }
}

@keyframes opusWaveTertiary {
  0% { transform: translateY(0px) scaleY(0.95); opacity: 0.5; }
  50% { transform: translateY(-16px) scaleY(1.12); opacity: 0.8; }
  100% { transform: translateY(0px) scaleY(0.95); opacity: 0.5; }
}

@keyframes opusDashTravel {
  0% { stroke-dashoffset: 2000; }
  100% { stroke-dashoffset: 0; }
}

@keyframes opusDashTravelRev {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 2000; }
}

@keyframes opusDotGlow {
  0%, 100% { opacity: 0.3; transform: scale(0.85); }
  50% { opacity: 0.95; transform: scale(1.25); filter: drop-shadow(0 0 6px #00F0FF); }
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
        {/* Base dark aerospace navy/obsidian backdrop */}
        <View style={styles.baseDark} />

        {/* 3D Perspective Ground Grid Matrix with Subtle Depth */}
        <View
          style={
            {
              position: "absolute",
              bottom: "-30%",
              left: "-20%",
              right: "-20%",
              height: "90%",
              backgroundImage: `
              linear-gradient(rgba(0, 240, 255, 0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 240, 255, 0.07) 1px, transparent 1px)
            `,
              backgroundSize: "60px 60px",
              maskImage:
                "radial-gradient(ellipse at center bottom, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center bottom, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 80%)",
              animation: "opusPerspectiveGrid 18s linear infinite",
              pointerEvents: "none",
              transformOrigin: "50% 100%",
            } as any
          }
        />

        {/* Top/Ambient Flat Tech Grid */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              backgroundPosition: "center center",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)",
              pointerEvents: "none",
            } as any,
          ]}
        />

        {/* Central Symmetrical Core Nebula Pulse */}
        <View
          style={
            {
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 800,
              height: 800,
              borderRadius: 400,
              background:
                "radial-gradient(circle, rgba(0, 240, 255, 0.16) 0%, rgba(59, 130, 246, 0.10) 35%, rgba(5, 8, 17, 0) 70%)",
              filter: "blur(70px)",
              animation: "opusCorePulse 14s ease-in-out infinite",
              pointerEvents: "none",
            } as any
          }
        />

        {/* ─── 3 Dynamic Glowing Pipeline Waves (SVG) ─── */}
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          style={
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible",
            } as any
          }
        >
          <defs>
            {/* Cyan Pipeline Gradient */}
            <linearGradient
              id="cyanPipelineGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.0" />
              <stop offset="20%" stopColor="#00F0FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95" />
              <stop offset="80%" stopColor="#00F0FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
            </linearGradient>

            {/* Cobalt / Indigo Pipeline Gradient */}
            <linearGradient
              id="cobaltPipelineGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.0" />
              <stop offset="30%" stopColor="#60A5FA" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#818CF8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>

            {/* Radiant Wave Glow Filter */}
            <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Wave 1: Primary Radiant Cyan High-Energy Pipeline */}
          <g
            style={{
              animation: "opusWavePrimary 9s ease-in-out infinite",
              transformOrigin: "center",
            }}
          >
            {/* Broad Atmospheric Glow */}
            <path
              d="M -100,520 C 300,420 520,680 900,500 C 1180,380 1350,560 1600,480"
              fill="none"
              stroke="rgba(0, 240, 255, 0.22)"
              strokeWidth="14"
              filter="url(#waveGlow)"
            />
            {/* Crisp Core Stroke */}
            <path
              d="M -100,520 C 300,420 520,680 900,500 C 1180,380 1350,560 1600,480"
              fill="none"
              stroke="url(#cyanPipelineGrad)"
              strokeWidth="2.5"
              filter="url(#softGlow)"
            />
            {/* Moving Fast Photon Pulses */}
            <path
              d="M -100,520 C 300,420 520,680 900,500 C 1180,380 1350,560 1600,480"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeDasharray="40 320"
              style={{
                animation: "opusDashTravel 10s linear infinite",
                filter: "drop-shadow(0 0 8px #00F0FF)",
              }}
            />
            {/* Discrete 3D Grid / Pipeline Intersection Nodes */}
            <circle
              cx="300"
              cy="465"
              r="3.5"
              fill="#FFFFFF"
              style={{ animation: "opusDotGlow 3s ease-in-out infinite" }}
            />
            <circle
              cx="700"
              cy="595"
              r="3.5"
              fill="#FFFFFF"
              style={{
                animation: "opusDotGlow 3.5s ease-in-out infinite 0.8s",
              }}
            />
            <circle
              cx="1100"
              cy="425"
              r="3.5"
              fill="#FFFFFF"
              style={{ animation: "opusDotGlow 4s ease-in-out infinite 1.5s" }}
            />
          </g>

          {/* Wave 2: Secondary Harmonic Cobalt / Deep Sky Pipeline */}
          <g
            style={{
              animation: "opusWaveSecondary 12s ease-in-out infinite",
              transformOrigin: "center",
            }}
          >
            {/* Secondary Glow */}
            <path
              d="M -100,380 C 260,540 640,320 1020,490 C 1280,600 1420,440 1600,390"
              fill="none"
              stroke="rgba(59, 130, 246, 0.20)"
              strokeWidth="10"
              filter="url(#waveGlow)"
            />
            {/* Secondary Core */}
            <path
              d="M -100,380 C 260,540 640,320 1020,490 C 1280,600 1420,440 1600,390"
              fill="none"
              stroke="url(#cobaltPipelineGrad)"
              strokeWidth="2"
              filter="url(#softGlow)"
            />
            {/* Reverse Flowing Photon Stream */}
            <path
              d="M -100,380 C 260,540 640,320 1020,490 C 1280,600 1420,440 1600,390"
              fill="none"
              stroke="#E0F2FE"
              strokeWidth="2.5"
              strokeDasharray="30 280"
              style={{
                animation: "opusDashTravelRev 14s linear infinite",
                filter: "drop-shadow(0 0 6px #38BDF8)",
              }}
            />
            {/* Secondary Intersection Nodes */}
            <circle
              cx="480"
              cy="410"
              r="3"
              fill="#BAE6FD"
              style={{
                animation: "opusDotGlow 3.2s ease-in-out infinite 0.4s",
              }}
            />
            <circle
              cx="950"
              cy="460"
              r="3"
              fill="#BAE6FD"
              style={{
                animation: "opusDotGlow 3.8s ease-in-out infinite 1.2s",
              }}
            />
          </g>

          {/* Wave 3: Subtle High-Altitude Symmetrical Wave */}
          <g
            style={{
              animation: "opusWaveTertiary 16s ease-in-out infinite",
              transformOrigin: "center",
            }}
          >
            <path
              d="M -100,240 C 400,340 750,190 1150,280 C 1360,330 1500,260 1600,220"
              fill="none"
              stroke="rgba(0, 240, 255, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="8 12"
              filter="url(#softGlow)"
            />
            <path
              d="M -100,240 C 400,340 750,190 1150,280 C 1360,330 1500,260 1600,220"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeDasharray="20 400"
              style={{
                animation: "opusDashTravel 18s linear infinite",
                filter: "drop-shadow(0 0 5px #00F0FF)",
              }}
            />
          </g>
        </svg>

        {/* Lateral Ambient Horizon Wings */}
        <View
          style={
            {
              position: "absolute",
              top: "15%",
              left: "-120px",
              width: 450,
              height: 450,
              borderRadius: 225,
              background:
                "radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(0, 240, 255, 0) 70%)",
              filter: "blur(60px)",
              pointerEvents: "none",
            } as any
          }
        />
        <View
          style={
            {
              position: "absolute",
              top: "15%",
              right: "-120px",
              width: 450,
              height: 450,
              borderRadius: 225,
              background:
                "radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(0, 240, 255, 0) 70%)",
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
        color="rgba(0, 240, 255, 0.18)"
        initialX={-60}
        initialY={80}
        driftX={35}
        driftY={25}
        durationMs={12000}
      />
      <NativeOrb
        size={360}
        color="rgba(0, 240, 255, 0.18)"
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
