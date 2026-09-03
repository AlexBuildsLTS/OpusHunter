/**
 * components/shared/AnimatedBackground.tsx
 * OpusHunter — 3D Cybernetic Neural Pipeline.
 *
 * FIXES APPLIED:
 * - Removed blinking green dots entirely.
 * - Removed the persistent "white shadow" static tracks.
 * - Slowed down the data pulses to a smooth, elegant, organic speed.
 * - Added a very subtle deep-cyan tint to the base background.
 */

import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Defs, Pattern, Path, Rect, G } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../constants/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A glowing beam of data traveling smoothly along an organic, curved SVG path.
 */
const DataNerve = ({ d, color, delay, duration, length, size }: any) => {
  const progress = useSharedValue(length);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(-length, {
          duration,
          // Easing.sin provides a beautiful, natural glide
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        false,
      ),
    );
  }, [delay, duration, length]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  // The pulse is 30% of the path length, the rest is empty space
  const dashArray = `${length * 0.3} ${length * 1.5}`;

  return (
    <G>
      {/* Faint persistent track - reduced to 2% opacity so there is NO white shadow */}
      <Path
        d={d}
        stroke={color}
        strokeWidth={size * 0.2}
        opacity={0.02}
        fill="none"
      />

      {/* Outer Glow (Thick & very soft) */}
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={size * 3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        animatedProps={animatedProps}
        opacity={0.15}
      />

      {/* Medium Glow */}
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={size * 1.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        animatedProps={animatedProps}
        opacity={0.4}
      />

      {/* Hot Core (Uses the accent color, NO pure white, to avoid harsh glare) */}
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={size * 0.5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        animatedProps={animatedProps}
        opacity={0.8}
      />
    </G>
  );
};

export function AnimatedBackground() {
  const gridScroll = useSharedValue(0);

  useEffect(() => {
    // Infinitely scrolls the faint grid forward smoothly
    gridScroll.value = withRepeat(
      withTiming(80, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const gridAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: gridScroll.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base Background: A very deep, subtle cyan-navy instead of pure black */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#060A13" }]} />
      <LinearGradient
        colors={["rgba(0, 210, 255, 0.03)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      {/* The 3D Perspective Plane */}
      <View style={styles.perspectivePlane}>
        {/* Scrolling Network Grid (NO GREEN DOTS) */}
        <Animated.View style={[StyleSheet.absoluteFill, gridAnimatedStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="gridMesh"
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                <Path
                  d="M 80 0 L 0 0 0 80"
                  fill="none"
                  stroke={colors.accent.cyan}
                  strokeWidth="0.5"
                  opacity="0.15"
                />
                {/* Circle removed entirely */}
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#gridMesh)" />
          </Svg>
        </Animated.View>

        {/* Dynamic Curved Pipelines (Organic Bezier Curves) */}
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          {/* Cyan: Smooth, slow sweeping S-curve */}
          <DataNerve
            d="M -200,800 C 300,900 600,100 1200,200"
            color={colors.accent.cyan}
            delay={0}
            duration={25000}
            size={5}
            length={1800}
          />

          {/* Deep Blue: Meandering left-to-right curve */}
          <DataNerve
            d="M -200,200 C 400,100 600,800 1200,900"
            color={colors.accent.blue}
            delay={4000}
            duration={32000}
            size={6}
            length={1900}
          />

          {/* Cyan Glow: Soft secondary crossing curve */}
          <DataNerve
            d="M 1200,700 C 700,800 300,200 -200,300"
            color={colors.accent.cyan}
            delay={2000}
            duration={28000}
            size={4}
            length={1700}
          />
        </Svg>
      </View>

      {/* Vignette Overlay (Ensures UI cards sit cleanly on top) */}
      <View style={styles.container} pointerEvents="none">
        <LinearGradient
          colors={[
            "rgba(6, 10, 19, 0.9)",
            "transparent",
            "rgba(6, 10, 19, 0.9)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
    overflow: "hidden",
  },
  perspectivePlane: {
    position: "absolute",
    width: "200%",
    height: "200%",
    left: "-50%",
    top: "-20%",
    transform: [
      { perspective: 800 },
      { rotateX: "72deg" },
      { translateY: -100 },
    ],
  },
});
