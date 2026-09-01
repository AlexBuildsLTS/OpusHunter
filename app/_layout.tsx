import "../global.css";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { AnimatedBackground } from "../components/shared/AnimatedBackground";
import { colors } from "../constants/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";

export default function AppLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useAuthRedirect();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View style={styles.root}>
          {/* Universal Ambient Engine - Sits at root, never unmounts */}
          <AnimatedBackground />

          {!isHydrated ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.accent.cyan} size="large" />
            </View>
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
                animation: Platform.OS === "ios" ? "fade_from_bottom" : "fade",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          )}
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    zIndex: 999,
  },
});
