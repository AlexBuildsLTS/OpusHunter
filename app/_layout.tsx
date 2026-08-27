/**
 * app/_layout.tsx
 * OpusHunter — Root Layout
 * 2026-08-23 — FIX (regression from the above): removing index.tsx's own
 * redirect exposed a gap that file had been silently covering — navigate()
 * only ever fired router.replace() when `inAuth` was true (kicking a logged-
 * in user off the login screen) or when there was no session (kicking a
 * logged-out user TO login). It never handled "session exists, user is
 * sitting at bare `/`" — segments[0] there is neither "(auth)" nor anything
 * else, so the function just returned and did nothing, hanging forever on
 * index.tsx's spinner. Added an explicit `atRoot` check so a valid session
 * at `/` is redirected to the dashboard same as it would be from login.
 */

import "../global.css";

import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import { C } from "../lib/theme";
import { PageContainer } from "../components/layout/PageContainer";
import AmbientBackground from "../components/layout/AmbientBackground";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const mounted = useRef(false);
  const lastSessionId = useRef<string | null | undefined>(undefined);

  const navigate = useCallback(
    async (session: any) => {
      if (!mounted.current) return;

      // Skip redundant work if onAuthStateChange fires with the same
      // session getSession() already resolved on cold start.
      const sessionId = session?.user?.id ?? null;
      if (sessionId === lastSessionId.current) return;
      lastSessionId.current = sessionId;

      const inAuth = segments[0] === "(auth)";
      const atRoot = (segments as string[]).length === 0; // bare "/" — the RootEntryScreen spinner

      if (!session) {
        if (!inAuth) router.replace("/(auth)/login");
        return;
      }

      // Session exists: get the user off the login screen OR off the bare
      // root spinner. Both need the same destination, so one check covers
      // both — this is the line that was missing before.
      if (!inAuth && !atRoot) return; // already somewhere valid (tabs/admin) — leave it alone

      try {
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        router.replace("/(tabs)/dashboard");
      } catch {
        router.replace("/(tabs)/dashboard");
      }
    },
    [segments],
  );

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session);
      SplashScreen.hideAsync().catch(() => {});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      navigate(session);

      // Web OAuth redirect completes here (not in login.tsx's native
      // branch). If Google returned offline-access tokens, hand them
      // to the edge function so auto-apply can send from this address
      // later. Native/mobile links inside login.tsx's handleGoogle
      // instead, since that flow never round-trips through this event
      // with the tokens attached in the same shape.
      if (event === "SIGNED_IN" && Platform.OS === "web") {
        const s = session as any;
        if (s?.provider_refresh_token) {
          supabase.functions
            .invoke("link-gmail-account", {
              body: {
                provider_token: s.provider_token ?? null,
                provider_refresh_token: s.provider_refresh_token,
              },
            })
            .catch(() => {
              /* non-fatal — Settings can retry the link */
            });
        }
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <View
            style={{
              flex: 1,
              position: "relative",
              backgroundColor: "#0A0714",
            }}
          >
            <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
              <AmbientBackground />
            </View>
            <View style={{ flex: 1, zIndex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                  animation: Platform.OS === "web" ? "fade" : "fade",
                }}
              >
                <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
                <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
                <Stack.Screen name="admin" options={{ animation: "fade" }} />
                <Stack.Screen name="+not-found" />
              </Stack>
            </View>
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
