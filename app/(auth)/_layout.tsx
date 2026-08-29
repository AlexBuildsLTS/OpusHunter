// app/(auth)/_layout.tsx
// Auth stack layout. AnimatedBackground is mounted once at the root
// (app/_layout.tsx) and persists across every route, so it is not re-mounted here.
import { Stack } from "expo-router";
import { View } from "react-native";
import { colors } from "../../constants/theme";

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.deepest }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </View>
  );
}
