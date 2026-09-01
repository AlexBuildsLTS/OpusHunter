/**
 * app/(auth)/profile-setup.tsx
 * OpusHunter — 5-Step Profile Setup & Radar Target Generator.
 * Directly wraps ProfileSetupWizard and routes to the active radar target card / rules dashboard on completion.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/shared/SafeAreaWrapper";
import { colors } from "../../constants/theme";
import { ProfileSetupWizard } from "../../components/jobcardsetup/ProfileSetupWizard";

export default function ProfileSetupScreen() {
  const router = useRouter();

  const handleComplete = () => {
    // Navigate straight to the active radar rules card box
    router.replace("/(tabs)/(dashboard)/rules" as any);
  };

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <ProfileSetupWizard isEmbedded={false} onComplete={handleComplete} />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.core,
  },
});
