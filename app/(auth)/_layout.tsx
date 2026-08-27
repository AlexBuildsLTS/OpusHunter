/**
 * app/(auth)/_layout.tsx
 * OpusHunter — Auth Stack Layout
 *
 * Simple pass-through stack. Animation is handled at the root
 * _layout.tsx level to avoid double-transition flash.
 *
 * 2026-08-25 — added "onboarding" as a sibling route to "login". Route
 * order here doesn't set the entry point — app/_layout.tsx's navigate()
 * decides which of the two an unauthenticated user lands on.
 */

import { Stack } from "expo-router";
import { C } from "../../lib/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.core },
        animation: "fade",
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
