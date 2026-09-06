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
  TouchableOpacity,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileDropdown } from "../shared/ProfileDropdown";
import { C } from "../../constants/theme";
import { NAV_ITEMS, SIDEBAR_WIDTH, TAB_BAR_HEIGHT } from "../../lib/navConfig";
import { useAdaptiveLayout } from "../../hooks/useAdaptiveLayout";

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktop } = useAdaptiveLayout();

  const isItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.key === "discover") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/(dashboard)" ||
        pathname === "/(tabs)/(dashboard)/index"
      );
    }
    return pathname.includes(item.key) || pathname.startsWith(item.route);
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

      {/* ── DESKTOP & TABLET SIDEBAR ────────────────────────────── */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarInner}>
            <TouchableOpacity
              onPress={() => router.push(NAV_ITEMS[0].route as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Discover"
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
                    key={item.key}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.label}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <item.icon size={22} color={isActive ? C.cyan : C.sub} />
                    <Text
                      style={[
                        styles.navItemText,
                        isActive && { color: C.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── MAIN CONTENT CONTAINER ──────────────────────────────── */}
      <View style={styles.mainContent} pointerEvents="box-none">
        {/* Keep the routed screen in a full-screen layer. Individual screens own
            their ScrollView, so the shell must not become a second scroll trap. */}
        <View style={styles.contentLayer}>{children}</View>

        {/* 2. ABSOLUTE FLOATING HEADER (Top Layer) */}
        <View
          style={[
            styles.floatingHeader,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.headerLayout} pointerEvents="box-none">
            {!isDesktop ? (
              <View style={styles.mobileBrandBadge} pointerEvents="auto">
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.mobileBrandImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View pointerEvents="none" style={{ flex: 1 }} />
            )}

            <View pointerEvents="auto">
              <ProfileDropdown />
            </View>
          </View>
        </View>

        {/* 3. ABSOLUTE FLOATING TAB BAR (Top Layer, Mobile Only) */}
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
              style={styles.mobileTabBar}
              pointerEvents="auto"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                    style={styles.mobileTabItem}
                    accessibilityRole="tab"
                    accessibilityLabel={`Open ${item.label}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <item.icon size={22} color={isActive ? C.cyan : C.sub} />
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
    width: SIDEBAR_WIDTH,
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
    backgroundColor: "transparent",
  },
  contentBody: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  contentLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    paddingHorizontal: 24,
  },
  headerLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 68,
  },
  mobileBrandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mobileBrandImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  floatingTabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
    zIndex: 50,
  },
  mobileTabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: TAB_BAR_HEIGHT,
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
    minWidth: 44,
    minHeight: 44,
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
