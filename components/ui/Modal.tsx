/**
 * components/ui/Modal.tsx
 * OpusHunter — Cross-platform Modal Component (Performance Optimized).
 * Native: Bottom-sheet style with pan gesture. Web: Centered glass dialog.
 * Uses Reanimated for smooth 300ms fade/scale transitions.
 * Android/Web: Native BlurView removed to eliminate extreme GPU lag.
 */

import React, { useEffect } from "react";
import {
  Modal as RNModal,
  View,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { Typography } from "./Typography";
import { colors, radius, shadows } from "../../constants/theme";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 520,
}: ModalProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.quad),
      });
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.quad),
      });
      scale.value = withTiming(0.95, {
        duration: 200,
        easing: Easing.in(Easing.quad),
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={styles.overlay}
        accessibilityViewIsModal
        accessibilityLabel={title || "Dialog"}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackBackdrop]} />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.container,
            { maxWidth },
            Platform.OS === "web" && { width: "90%", maxWidth: maxWidth },
            animatedStyle,
          ]}
        >
          {title && (
            <View style={styles.header}>
              <Typography variant="h4" weight="semiBold" color="primary">
                {title}
              </Typography>
              <Pressable
                onPress={onClose}
                hitSlop={4}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === "ios" ? "rgba(5, 8, 17, 0.4)" : "transparent",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
    padding: Platform.OS === "web" ? 16 : 0,
  },
  fallbackBackdrop: {
    backgroundColor: "rgba(5, 8, 17, 0.85)", 
  },
  container: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: Platform.OS === "ios" ? colors.surface.card : "rgba(13, 20, 38, 0.98)",
    borderColor: colors.surface.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    borderBottomLeftRadius: Platform.OS === "web" ? radius.xl : 0,
    borderBottomRightRadius: Platform.OS === "web" ? radius.xl : 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      web: {
        boxShadow: shadows.glassLg,
      } as any,
      default: {
        elevation: 24,
      }
    }),
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  body: {
    padding: 20,
  },
});