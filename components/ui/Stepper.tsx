/**
 * components/ui/Stepper.tsx
 * OpusHunter — Generic animated multi-step container.
 *
 * Extracted from app/(auth)/onboarding.tsx, which already had this exact swipe/slide
 * logic implemented once, working, and un-reused. This makes it a shared primitive so
 * onboarding AND the Configure flow (app/(tabs)/(dashboard)/configuration/*) stop each
 * maintaining their own separate copy of the same dot-pagination + slide-transition code.
 *
 * No new dependency added — built entirely on react-native-reanimated and PanResponder,
 * both already project dependencies (see onboarding.tsx, package.json).
 *
 * Usage:
 *   <Stepper
 *     stepCount={4}
 *     currentStep={index}
 *     onStepChange={setIndex}
 *   >
 *     <View style={{ width: '100%' }}>...step 1 content...</View>
 *     <View style={{ width: '100%' }}>...step 2 content...</View>
 *     ...
 *   </Stepper>
 *
 * The parent owns `currentStep` state (via useState) and passes `onStepChange` — this
 * component is presentational + gesture-handling only, it does not own navigation state,
 * so it works the same way whether the parent is onboarding, Configure, or a future flow.
 */

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors } from "../../constants/theme";
import { durations } from "../../constants/animations";

export interface StepperProps {
  /** Total number of steps. Must match React.Children.count(children). */
  stepCount: number;
  /** Index of the currently active step (0-based). Owned by the parent. */
  currentStep: number;
  /** Called with the new index whenever the user swipes or the parent calls goNext/goPrev. */
  onStepChange: (nextIndex: number) => void;
  /** One child per step. Each child fills the full slide width — same pattern as onboarding.tsx's SLIDES map. */
  children: React.ReactNode;
  /** Disable swipe gesture (e.g. while a step has its own horizontal scroll/input focus). Defaults to enabled. */
  swipeEnabled?: boolean;
  /** Haptic feedback on step change. Defaults to true, matches onboarding.tsx's existing behavior. */
  haptics?: boolean;
  /** Show the dot pagination row. Defaults to true. */
  showDots?: boolean;
  style?: any;
}

export function Stepper({
  stepCount,
  currentStep,
  onStepChange,
  children,
  swipeEnabled = true,
  haptics = true,
  showDots = true,
  style,
}: StepperProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth || 360);
  const translateX = useSharedValue(-containerWidth * currentStep);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
      translateX.value = -w * currentStep;
    }
  };

  // Keep the shared value in sync if currentStep changes from outside (e.g. a
  // "Continue" button elsewhere in the parent, not just internal swipe/goNext).
  useEffect(() => {
    translateX.value = withTiming(-containerWidth * currentStep, {
      duration: durations.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentStep, containerWidth]);

  const fireHaptic = () => {
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const goNext = () => {
    if (currentStep >= stepCount - 1) return;
    fireHaptic();
    onStepChange(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep <= 0) return;
    fireHaptic();
    onStepChange(currentStep - 1);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        swipeEnabled && Math.abs(gesture.dx) > 20,
      onPanResponderRelease: (_, gesture) => {
        if (!swipeEnabled) return;
        if (gesture.dx < -50) goNext();
        else if (gesture.dx > 50) goPrev();
      },
    }),
  ).current;

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View style={styles.track} {...panResponder.panHandlers}>
        <Animated.View style={[styles.row, animatedRowStyle]}>
          {React.Children.map(children, (child, i) => (
            <View key={i} style={[styles.step, { width: containerWidth }]}>
              {child}
            </View>
          ))}
        </Animated.View>
      </View>

      {showDots && (
        <View style={styles.pagination}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Exposed so parent "Back" / "Continue" buttons can drive the same transition
// without duplicating the withTiming/easing config — call these instead of
// setting index directly if you want the haptic + guard-rail behavior too.
export function useStepperControls(
  currentStep: number,
  stepCount: number,
  onStepChange: (i: number) => void,
  haptics = true,
) {
  const goNext = () => {
    if (currentStep >= stepCount - 1) return;
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onStepChange(currentStep + 1);
  };
  const goPrev = () => {
    if (currentStep <= 0) return;
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onStepChange(currentStep - 1);
  };
  return { goNext, goPrev };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  track: {
    flex: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    height: "100%",
  },
  step: {
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent.cyan,
    shadowColor: colors.accent.cyan,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
