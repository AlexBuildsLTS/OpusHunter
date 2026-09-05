// app/+not-found.tsx
import React from "react";
import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { C } from "../constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "System Error 404" }} />
      <View style={styles.container}>
        <Text style={styles.errorCode}>404</Text>
        <Text style={styles.errorText}>
          Sector trajectory missing in current pipeline.
        </Text>

        <Link href={"/(tabs)" as any} style={styles.linkButton}>
          <Text style={styles.linkText}>Return to Core Deck</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorCode: {
    color: C.red,
    fontSize: 72,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 2,
  },
  errorText: {
    color: C.sub,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 32,
    textAlign: "center",
  },
  linkButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: `${C.cyan}10`,
    borderWidth: 1,
    borderColor: `${C.cyan}30`,
    borderRadius: 16,
  },
  linkText: {
    color: C.cyan,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
  },
});
