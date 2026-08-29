/**
 * components/shared/ResponsiveNavShell.tsx
 * OpusHunter — Adaptive Navigation Shell.
 *
 * The single shell that wraps every authenticated screen (mounted once in
 * app/(tabs)/_layout.tsx). Layout adapts by width:
 *   • Desktop (≥1024px) — fixed icon sidebar + floating bottom profile trigger.
 *   • Tablet  (768–1023) — narrower sidebar.
 *   • Mobile  (<768)     — top header + floating bottom tab bar.
 *
 * Pure React Native primitives + StyleSheet only — no raw DOM elements, so it
 * renders identically (and correctly) on Web, iOS, and Android.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { NAV_ITEMS } from "../../lib/navConfig";
import { colors, radius, shadows } from "../../constants/theme";
import { ProfileDropdown } from "./ProfileDropdown";
import { Zap } from "lucide-react-native";

const DESKTOP_BP = 1024;
const TABLET_BP = 768;

export const ResponsiveNavShell = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();

  const isDesktop = width >= DESKTOP_BP;
  const isTablet = width >= TABLET_BP && width < DESKTOP_BP;
  const isMobile = width < TABLET_BP;

  const visibleItems = NAV_ITEMS;

  return (
    <View style={styles.root}>
      {/* ── Desktop / Tablet Sidebar ────────────────────────────── */}
      {(isDesktop || isTablet) && (
        <View
          style={[
            styles.sidebar,
            isDesktop ? styles.sidebarWide : styles.sidebarNarrow,
          ]}
        >
          {/* Brand mark */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={styles.brandMark}
          >
            <Zap size={20} color={colors.bg.deepest} />
          </TouchableOpacity>

          {/* Nav items */}
          <View style={styles.navList}>
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.route ||
                (item.route !== "/(tabs)" && pathname.startsWith(item.route));
              const IconComponent = item.icon;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                >
                  <IconComponent
                    size={20}
                    color={
                      isActive ? colors.accent.cyan : colors.text.secondary
                    }
                  />
                  <Text
                    style={[styles.navLabel, isActive && styles.navLabelActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Main content column ─────────────────────────────────── */}
      <View style={styles.contentColumn}>
        {/* Mobile top header */}
        {isMobile && (
          <View style={styles.mobileHeader}>
            <Text style={styles.mobileBrand}>OPUSHUNTER</Text>
            <ProfileDropdown />
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: isMobile ? 110 : 40,
            paddingHorizontal: isDesktop ? 32 : 16,
            paddingTop: 20,
          }}
        >
          {children}
        </ScrollView>

        {/* ── Mobile bottom floating tab bar ────────────────────── */}
        {isMobile && (
          <View style={styles.mobileTabBar}>
            {visibleItems.map((item) => {
              const isActive = pathname === item.route;
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => router.push(item.route as any)}
                  style={styles.mobileTabItem}
                >
                  <IconComponent
                    size={20}
                    color={
                      isActive ? colors.accent.cyan : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.mobileTabLabel,
                      isActive && styles.navLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Desktop / Tablet profile trigger (top-right) ────────── */}
      {(isDesktop || isTablet) && (
        <View style={styles.profileAnchor}>
          <ProfileDropdown />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.bg.deepest,
  },

  // ── Sidebar ──────────────────────────────────────────────────
  sidebar: {
    backgroundColor: colors.bg.sidebar,
    borderRightWidth: 1,
    borderRightColor: colors.surface.border,
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  sidebarWide: { width: 80 },
  sidebarNarrow: { width: 64 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.cyan,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    ...(shadows.glowCyan as any),
  },
  navList: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  navItem: {
    width: 56,
    paddingVertical: 10,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navItemActive: {
    backgroundColor: `${colors.accent.blue}26`,
    borderWidth: 1,
    borderColor: `${colors.accent.cyan}4D`,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.text.secondary,
  },
  navLabelActive: { color: colors.accent.cyan },

  // ── Content column ────────────────────────────────────────────
  contentColumn: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  mobileBrand: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.accent.cyan,
  },

  // ── Mobile bottom tab bar ─────────────────────────────────────
  mobileTabBar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.bg.sidebar,
    ...(shadows.glassLg as any),
  },
  mobileTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  mobileTabLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.text.secondary,
  },

  // ── Profile anchor (desktop/tablet, top-right) ───────────────
  profileAnchor: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1000,
  },
});
