// app/index.tsx
// Root "/" route — a pure loading state only.
// All redirect decisions are owned by the route guard in app/_layout.tsx
// (single source of truth for auth/profile routing). AnimatedBackground is
// mounted once at the root layout, so it is not duplicated here.

import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { C } from "../constants/theme";
import React from "react";

export default function RootEntryScreen() {
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={C.cyan} animating={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
