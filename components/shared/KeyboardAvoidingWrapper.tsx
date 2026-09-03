/**
 * components/shared/KeyboardAvoidingWrapper.tsx
 * OpusHunter — Keyboard Avoiding Wrapper.
 * Handles keyboard offset on iOS/Android. Web: uses scroll to avoid.
 * Avoids nesting issues with screens inside tabs/stack.
 */

import React, { useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  behavior?: "padding" | "height" | "position";
}

export function KeyboardAvoidingWrapper({
  children,
  style,
  scrollEnabled = false,
  behavior,
}: KeyboardAvoidingWrapperProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Default behavior per platform
  const defaultBehavior = Platform.OS === "ios" ? "padding" : "height";

  return (
    <KeyboardAvoidingView
      style={[styles.base, style]}
      behavior={behavior ?? defaultBehavior}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {scrollEnabled ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});
