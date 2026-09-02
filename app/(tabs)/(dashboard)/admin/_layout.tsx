/**
 * app/(tabs)/(dashboard)/admin/_layout.tsx
 * OpusHunter — Admin Route Gate & Sub-Navigation.
 * Enforces admin role clearance on the client and server.
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "../../../../stores/authStore";
import { Typography } from "../../../../components/ui/Typography";
import { Button } from "../../../../components/ui/Button";
import { colors } from "../../../../constants/theme";
import { ShieldAlert } from "lucide-react-native";

export default function AdminLayout() {
  const router = useRouter();
  const { profile, loading } = useAuthStore();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000012",
        }}
      >
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  // Client-side UI clearance guard
  if (!profile || profile.role !== "admin") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000012",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255, 0, 127, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(255, 0, 127, 0.3)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <ShieldAlert size={36} color="#FF007F" />
        </View>
        <Typography
          variant="h3"
          weight="bold"
          color="primary"
          style={{ textAlign: "center" }}
        >
          Clearance Level 5 Required
        </Typography>
        <Typography
          variant="bodySm"
          color="secondary"
          style={{
            marginTop: 8,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: 20,
          }}
        >
          Your account is registered as a standard member. Elevated
          administrator credentials are required to enter the Kernel Command
          Center.
        </Typography>
        <View style={{ marginTop: 24, width: "100%", maxWidth: 200 }}>
          <Button
            title="Return to Dashboard"
            variant="primary"
            onPress={() => router.replace("/(tabs)/(dashboard)")}
          />
        </View>
      </View>
    );
  }

  // Server-side validation is automatically enforced via SECURITY DEFINER functions
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000012" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="api-keys" />
      <Stack.Screen name="keys" />
    </Stack>
  );
}
