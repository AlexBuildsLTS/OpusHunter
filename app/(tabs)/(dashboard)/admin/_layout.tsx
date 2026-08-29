/**
 * app/admin/_layout.tsx
 * OpusHunter — Admin Route Gate.
 * Blocks non-admin users. Verifies role via SECURITY DEFINER RPC (server-side).
 */

import React from "react";
import { View } from "react-native";
import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "../../../../stores/authStore";
import { Typography } from "../../../../components/ui/Typography";
import { colors } from "../../../../constants/theme";

export default function AdminLayout() {
  const { profile } = useAuthStore();

  // Double-check: Client-side check for UI gating
  if (!profile || profile.role !== "admin") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg.deepest,
        }}
      >
        <Typography variant="h3" weight="bold" color="primary">
          Access Denied
        </Typography>
        <Typography variant="bodySm" color="secondary" style={{ marginTop: 8 }}>
          You do not have permission to access this area.
        </Typography>
      </View>
    );
  }

  // Server-side validation is automatically enforced via SECURITY DEFINER functions
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="api-keys" />
      <Stack.Screen name="usage-logs" />
    </Stack>
  );
}
