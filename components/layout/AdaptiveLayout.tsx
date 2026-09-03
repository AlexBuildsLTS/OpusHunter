/**
 * components/layout/AdaptiveLayout.tsx
 * OpusHunter — Universal Navigation Shell
 *
 * Enforces strict Top-Right ProfileDropdown placement across all device widths.
 * Handles the Desktop Sidebar (≥1024px) and the Mobile Floating Tab Bar (<1024px).
 * Safely pads scrollable content so it is never trapped behind floating elements.
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
import { ProfileDropdown } from "../shared/ProfileDropdown";
import { C } from "../../constants/theme";
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
    path: "/(tabs)/index",
    title: "DISCOVER",
    Icon: AppWindowMac,
  },
  {
    id: "rules",
    path: "/(tabs)/rules",
    title: "ENGINE",
    Icon: Radar,
  },
  {
    id: "pipeline",
    path: "/(tabs)/pipeline",
    title: "PIPELINE",
    Icon: Kanban,
  },
  {
    id: "vault",
    path: "/(tabs)/settings/vault",
    title: "VAULT",
    Icon: FolderKanban,
  },
];

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();

  const isDesktop = Platform.OS !== "web" ? width >= 1024 : width >= 768;

  const isItemActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.id === "discover") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/index" ||
        pathname === "/(tabs)/(dashboard)" ||
        pathname === "/(tabs)/(dashboard)/index"
      );
    }
    return pathname.includes(item.id) || pathname.startsWith(item.path);
  };

  return (
    <View
      style={[
        styles.root,
        Platform.OS === "web" && { height: "100dvh" as any },
      ]}
    >
      {Platform.OS === "web" && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { 
            -ms-overflow-style: none !important; 
            scrollbar-width: none !important; 
            box-sizing: border-box !important;
          }
          *::-webkit-scrollbar { display: none !important; }
          html, body, #root { 
            overflow: hidden !important; 
            height: 100vh !important; 
            height: 100dvh !important; 
            min-height: 100vh !important;
            min-height: 100dvh !important;
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background-color: transparent !important; 
          }
        `,
          }}
        />
      )}

      {/* ── DESKTOP & TABLET SIDEBAR (≥768px) ────────────────────── */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarInner}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/index" as any)}
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
                    <item.Icon size={22} color={isActive ? C.cyan : C.sub} />
                    <Text
                      style={[
                        styles.navItemText,
                        isActive && { color: C.text },
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

      {/* ── MAIN CONTENT CONTAINER ──────────────────────────────── */}
      <View style={styles.mainContent}>
        {/* ── UNIFIED HEADER (Profile ALWAYS Top-Right) ──────────── */}
        <View style={styles.topHeader}>
          {!isDesktop ? (
            <View style={styles.mobileBrandBadge}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.mobileBrandImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View /> /* Empty spacer for desktop */
          )}

          <ProfileDropdown />
        </View>

        {/* ── CHILDREN BODY ───────────────────────────────────────── */}
        <View
          style={[styles.contentBody, { paddingBottom: isDesktop ? 20 : 90 }]}
        >
          {children}
        </View>

        {/* ── MOBILE BOTTOM FLOATING TAB BAR (<768px) ─────────────── */}
        {!isDesktop && (
          <View style={styles.mobileTabBarContainer} pointerEvents="box-none">
            <BlurView
              intensity={Platform.OS === "web" ? 30 : 60}
              tint="dark"
              style={styles.mobileTabBar}
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
                    <item.Icon size={22} color={isActive ? C.cyan : C.sub} />
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
    backgroundColor: "transparent",
    height: "100%",
    minHeight: 0,
  },
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
    backgroundColor: `${C.cyan}15`,
    borderColor: `${C.cyan}30`,
  },
  navItemText: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "800",
    color: C.sub,
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 1,
    position: "relative",
    zIndex: 10,
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  contentBody: {
    flex: 1,
    minHeight: 0,
    height: "100%",
  },
  topHeader: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    backgroundColor: "transparent",
    zIndex: 60,
  },
  mobileBrandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: `${C.cyan}12`,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mobileBrandImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  mobileTabBarContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    height: 68,
    zIndex: 50,
  },
  mobileTabBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(5, 8, 17, 0.8)",
    overflow: "hidden",
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
    backgroundColor: C.cyan,
    boxShadow: `0 0 6px ${C.cyan}`,
  },
});
