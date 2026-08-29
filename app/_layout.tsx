// app/_layout.tsx
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useSegments, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../stores/authStore";
import { AnimatedBackground } from "../components/shared/AnimatedBackground";
import { C } from "../lib/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const segments = useSegments();
  const router = useRouter();
  const isRedirectingRef = useRef(false);

  // Initialize Supabase session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Route Guard: Locks users into the correct flow based on auth & profile completion
  useEffect(() => {
    if (!isHydrated) return;
    if (isRedirectingRef.current) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inJobGroup = (segments[0] as string) === "job";
    const inCoverLetterGroup = (segments[0] as string) === "cover-letter";
    const isAdminGroup = segments[0] === "admin";

    let target: string | null = null;

    if (session === null && !inAuthGroup) {
      target = "/(auth)/auth";
    } else if (session !== null && inAuthGroup) {
      target = "/(tabs)";
    } else if (
      session &&
      profile &&
      !profile.profile_complete &&
      !inAuthGroup &&
      (segments[1] as string) !== "profile-setup"
    ) {
      target = "/(auth)/profile-setup";
    } else if (session && profile?.profile_complete && inAuthGroup) {
      target = "/(tabs)";
    } else if (
      session &&
      !inAuthGroup &&
      !inTabsGroup &&
      !inJobGroup &&
      !inCoverLetterGroup &&
      !isAdminGroup &&
      (segments[1] as string) !== "profile-setup"
    ) {
      target = "/(tabs)";
    }

    if (target) {
      isRedirectingRef.current = true;
      router.replace(target as any);
      setTimeout(() => {
        isRedirectingRef.current = false;
      }, 300);
    }
  }, [isHydrated, session, profile, segments, router]);

  // Hydration state prevents layout tearing between server rendering and client
  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedBackground />
        <ActivityIndicator color={C.cyan} size="large" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root}>
        {/* Global Mount: The radar background never unmounts, ensuring 100% fluid transitions */}
        <AnimatedBackground />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
