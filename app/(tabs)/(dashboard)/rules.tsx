/**
 * app/(tabs)/(dashboard)/rules.tsx
 * OpusHunter — Autonomous Job Hunter Rules & Active Radar Control Center.
 * Integrates:
 * 1. Active Pipeline Target Card with 1-tap Live Scrape trigger & Member vs Admin limits
 * 2. Visual Rules Targeting Configuration Editor (5-Step / Tabbed setup)
 * 3. Responsive, Aerospace Cyan Glassmorphism UI adapting seamlessly to Mobile & Desktop.
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../../components/shared/SafeAreaWrapper";
import { colors, radius } from "../../../constants/theme";
import { C } from "../../../constants/theme";
import {
  Radar,
  Sliders,
  Layers,
  ShieldCheck,
  Crown,
  ChevronRight,
} from "lucide-react-native";
import { useAuthStore } from "../../../stores/authStore";
import { ActiveTargetCard } from "../../../components/jobcardsetup/ActiveTargetCard";
import { ProfileSetupWizard } from "../../../components/jobcardsetup/ProfileSetupWizard";
import { useAdaptiveLayout } from "../../../hooks/useAdaptiveLayout";
import { Badge } from "../../../components/ui/Badge";

export default function HunterRulesScreen() {
  const router = useRouter();
  const { isDesktop, isMobile } = useAdaptiveLayout();
  const { user, profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"card" | "wizard">("card");

  const isAdmin =
    (user as any)?.role === "admin" || (profile as any)?.role === "admin";

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Top Header Banner */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.radarIconBox}>
              <Radar size={22} color={colors.accent.cyan} />
            </View>
            <View>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Hunter Targeting & Rules</Text>
                <Text style={styles.subtitle} numberOfLines={isMobile ? 2 : 1}>
                Define your radar parameters to generate your active job search
                card box.
                </Text>
              </View>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "card" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("card")}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityLabel="Show active target card"
              accessibilityState={{ selected: activeTab === "card" }}
            >
              <Layers
                size={14}
                color={activeTab === "card" ? C.cyan : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "card" && { color: C.cyan, fontWeight: "800" },
                ]}
              >
                {isMobile ? "Active target" : "Active Target Card"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "wizard" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("wizard")}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityLabel="Open targeting setup wizard"
              accessibilityState={{ selected: activeTab === "wizard" }}
            >
              <Sliders
                size={14}
                color={activeTab === "wizard" ? C.cyan : "#94A3B8"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "wizard" && {
                    color: C.cyan,
                    fontWeight: "800",
                  },
                ]}
              >
                {isMobile ? "Setup" : "Targeting Setup Wizard"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1 }}>
          {activeTab === "card" ? (
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isDesktop && {
                  maxWidth: 860,
                  alignSelf: "center",
                  width: "100%",
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Active Pipeline Card */}
              <ActiveTargetCard
                isAdmin={isAdmin}
                onEditRules={() => setActiveTab("wizard")}
                onViewPipeline={() =>
                  router.push("/(tabs)/(dashboard)/pipeline" as any)
                }
              />

              {/* Quota & Architecture Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  {isAdmin ? (
                    <Crown size={18} color="#FBBF24" />
                  ) : (
                    <ShieldCheck size={18} color={colors.accent.cyan} />
                  )}
                  <Badge
                    variant={isAdmin ? "roleAdmin" : "roleMember"}
                    label={isAdmin ? "Admin" : "Member"}
                    size="sm"
                  />
                  <Text style={styles.infoCardTitle}>
                    {isAdmin ? "Multi-target radar access" : "Focused radar access"}
                  </Text>
                </View>
                <Text style={styles.infoCardDesc}>
                  {isAdmin
                    ? "As an administrator, you have unrestricted execution rights across live scraping endpoints, custom scrapers, and automated multi-profile sweeps."
                    : "Member accounts maintain one active high-focus target card box. When you update your parameters in the setup wizard, your active radar automatically syncs and adapts all future scrape queries."}
                </Text>

                <TouchableOpacity
                  style={styles.tuneWizardLink}
                  onPress={() => setActiveTab("wizard")}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Update radar parameters in setup wizard"
                >
                  <Text style={styles.tuneWizardLinkText}>
                    Update radar parameters in setup wizard
                  </Text>
                  <ChevronRight size={14} color={colors.accent.cyan} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ProfileSetupWizard
              isEmbedded={true}
              onComplete={() => setActiveTab("card")}
            />
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  radarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 18,
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
  },
  tabButtonActive: {
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
  },
  tabButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#94A3B8",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  infoCard: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    marginTop: 12,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  infoCardDesc: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 12,
  },
  tuneWizardLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tuneWizardLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent.cyan,
  },
});
