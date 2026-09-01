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
  ScrollView,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { ProfileDropdown } from "../shared/ProfileDropdown";
import { C } from "../../lib/theme";
import { Search, Kanban, FolderOpen, Zap } from "lucide-react-native";

const NAV_ITEMS = [
  {
    id: "discover",
    path: "/(tabs)",
    title: "DISCOVER",
    Icon: Search,
  },
  { id: "pipeline", path: "/(tabs)/pipeline", title: "PIPELINE", Icon: Kanban },
  {
    id: "vault",
    path: "/(tabs)/settings/vault",
    title: "VAULT",
    Icon: FolderOpen,
  },
];

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();

  const isDesktop = width >= 1024;

  return (
    <View style={styles.root}>
      {Platform.OS === "web" && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          *::-webkit-scrollbar { display: none !important; }
          html, body { overflow: hidden; height: 100%; width: 100%; margin: 0; padding: 0; background-color: transparent; }
        `,
          }}
        />
      )}

      {/* ── DESKTOP SIDEBAR (≥1024px) ────────────────────────────── */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <View style={{ width: "100%", alignItems: "center", gap: 32 }}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)")}
              activeOpacity={0.8}
            >
              <View style={styles.brandLogo}>
                <Zap size={22} color="#050811" />
              </View>
            </TouchableOpacity>

            <View style={{ width: "100%", alignItems: "center", gap: 16 }}>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.path || pathname.startsWith(item.path);
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
              <Text style={styles.mobileBrandText}>OpusHunter</Text>
            </View>
          ) : (
            <View /> /* Empty spacer for desktop to push profile right */
          )}

          <ProfileDropdown />
        </View>

        {/* ── SCROLLABLE CHILDREN ─────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: isDesktop ? 40 : 120,
            paddingTop: 16,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {/* ── MOBILE BOTTOM FLOATING TAB BAR (<1024px) ────────────── */}
        {!isDesktop && (
          <View
            style={[
              styles.mobileTabBarContainer,
              { pointerEvents: "box-none" },
            ]}
          >
            <BlurView
              intensity={Platform.OS === "web" ? 30 : 60}
              tint="dark"
              style={styles.mobileTabBar}
            >
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.path || pathname.startsWith(item.path);
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
  },
  sidebar: {
    width: 96,
    backgroundColor: "rgba(6, 9, 19, 0.85)",
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    zIndex: 50,
    alignItems: "center",
    paddingVertical: 24,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.cyan,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 16px ${C.cyan}44`,
    marginBottom: 16,
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
  mobileBrandText: {
    fontSize: 12,
    fontWeight: "900",
    color: C.cyan,
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
