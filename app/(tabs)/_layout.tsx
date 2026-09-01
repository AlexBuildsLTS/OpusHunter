/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Authenticated Tab Routing
 */
import React from "react";
import { Slot } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AdaptiveLayout } from "../../components/layout/AdaptiveLayout";

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      {/* 
        NOTE: AnimatedBackground is mounted in root app/_layout.tsx 
        to maintain context across all routes.
      */}
      <AdaptiveLayout>
        <Slot />
      </AdaptiveLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
