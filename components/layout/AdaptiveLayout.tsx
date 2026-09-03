/**
 * components/layout/AdaptiveLayout.tsx
 * OpusHunter — True Floating Shell
 *
 * Fixes scroll-trapping by putting content at the absolute bottom layer.
 * The Header and Tab Bar float in absolute space OVER the content.
 * `pointerEvents="box-none"` guarantees that transparent areas never block touches.
 */

import React from "react";
import {
  View,
  Text,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileDropdown } from "../shared/ProfileDropdown";
import { colors, radius, shadows } from "../../constants/theme";
import {
  SlidersHorizontal,
  Kanban,
  FolderKanban,
  AppWindowMac,
  Radar,
} from "lucide-react-native";

const NAV_ITEMS = [
  {
    id: "discover",
    path: "/(tabs)/(dashboard)",
    title: "DISCOVER",
    Icon: AppWindowMac,
  },
  {
    id: "rules",
    path: "/(tabs)/(dashboard)/rules",
    title: "ENGINE",
    Icon: Radar,
  },
  {
    id: "pipeline",
    path: "/(tabs)/(dashboard)/pipeline",
    title: "PIPELINE",
    Icon: Kanban,
  },
  {
    id: "vault",
    path: "/(tabs)/(dashboard)/settings/vault",
    title: "VAULT",
    Icon: FolderKanban,
  },
];

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Desktop breakpoint
  const isDesktop = width >= 1024;

  const isItemActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.id === "discover") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/(dashboard)" ||
        pathname === "/(tabs)/(dashboard)/index"
      );
    }
    return pathname.includes(item.id);
  };

  return (
    <View style={styles.root}>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarInner}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/(dashboard)" as any)}
              activeOpacity={0.8}
            >
              <View style={styles.brandLogo}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.brandLogoImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>

            <View style={styles.navStack}>
              {NAV_ITEMS.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.path as any)}
                    activeOpacity={0.7}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                  >
                    <item.Icon
                      size={22}
                      color={isActive ? colors.accent.cyan : colors.text.dim}
                    />
                    <Text
                      style={[
                        styles.navItemText,
                        isActive && { color: colors.text.primary },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── MAIN CONTENT AREA ───────────────────────────────────── */}
      <View style={styles.mainContent}>
        {/* 1. BOTTOM LAYER: The Scrollable Content */}
        {/* It takes up the full screen height so it flows under the glass */}
        <View style={styles.contentLayer}>{children}</View>

        {/* 2. TOP LAYER: Absolute Floating Header */}
        <View
          style={[
            styles.floatingHeaderContainer,
            { paddingTop: Math.max(insets.top, 12) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.headerLayout} pointerEvents="box-none">
            {/* Mobile Logo Pill */}
            {!isDesktop ? (
              <BlurView
                intensity={40}
                tint="dark"
                style={styles.mobileBrandGlass}
                pointerEvents="auto"
              >
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/(dashboard)" as any)}
                  style={styles.mobileBrandContent}
                  activeOpacity={0.8}
                >
                  <Image
                    source={require("../../assets/icon.png")}
                    style={styles.mobileBrandImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.mobileBrandText}>
                    
                    <Text style={{ color: colors.accent.cyan }}></Text>
                  </Text>
                </TouchableOpacity>
              </BlurView>
            ) : (
              <View pointerEvents="none" />
            )}

            {/* Profile Dropdown Container */}
            <View pointerEvents="auto">
              <ProfileDropdown />
            </View>
          </View>
        </View>

        {/* 3. TOP LAYER: Absolute Floating Mobile Tab Bar */}
        {!isDesktop && (
          <View
            style={[
              styles.floatingTabBarContainer,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
            pointerEvents="box-none"
          >
            <BlurView
              intensity={Platform.OS === "web" ? 30 : 60}
              tint="dark"
              style={styles.mobileTabBarGlass}
              pointerEvents="auto"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(item.path as any)}
                    activeOpacity={0.7}
                    style={styles.mobileTabItem}
                  >
                    <item.Icon
                      size={24}
                      color={isActive ? colors.accent.cyan : colors.text.dim}
                    />
                    {isActive && <View style={styles.mobileActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </BlurView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.bg.deepest,
  },

  // ── DESKTOP SIDEBAR ──
  sidebar: {
    width: 96,
    height: "100%",
    backgroundColor: "rgba(6, 9, 19, 0.85)",
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    zIndex: 50,
    alignItems: "center",
    paddingVertical: 24,
  },
  sidebarInner: {
    width: "100%",
    alignItems: "center",
    gap: 32,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 20px rgba(0, 242, 254, 0.15)`,
    marginBottom: 16,
  },
  brandLogoImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  navStack: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  navItem: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  navItemActive: {
    backgroundColor: `${colors.accent.cyan}15`,
    borderColor: `${colors.accent.cyan}30`,
  },
  navItemText: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "800",
    color: colors.text.dim,
    letterSpacing: 0.5,
  },

  // ── MAIN CONTENT AREA ──
  mainContent: {
    flex: 1,
    position: "relative",
  },
  contentLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },

  // ── FLOATING HEADER ──
  floatingHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
  },
  headerLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mobileBrandGlass: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(5, 8, 17, 0.6)",
  },
  mobileBrandContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  mobileBrandImage: {
    width: 22,
    height: 22,
  },
  mobileBrandText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // ── FLOATING TAB BAR ──
  floatingTabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  mobileTabBarGlass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(5, 8, 17, 0.8)",
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: shadows.glassLg } as any,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  mobileTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: "relative",
  },
  mobileActiveDot: {
    position: "absolute",
    bottom: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent.cyan,
    boxShadow: `0 0 6px ${colors.accent.cyan}`,
  },
});
