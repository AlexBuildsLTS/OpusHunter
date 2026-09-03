/**
 * components/shared/SafeAreaWrapper.tsx
 * OpusHunter — Safe Area Wrapper.
 * Ensures content respects notch, status bar, and bottom tab bar.
 * Cross-platform: iOS (safe area insets), Android (status bar), Web (no-op).
 */

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function SafeAreaWrapper({
  children,
  edges = ["top", "bottom", "left", "right"],
  style,
  backgroundColor = "transparent",
}: SafeAreaWrapperProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes("top") ? insets.top : 0;
  const paddingBottom = edges.includes("bottom") ? insets.bottom : 0;
  const paddingLeft = edges.includes("left") ? insets.left : 0;
  const paddingRight = edges.includes("right") ? insets.right : 0;

  return (
    <View
      style={[
        styles.base,
        {
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
          backgroundColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
