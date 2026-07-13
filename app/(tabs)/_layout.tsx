/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Unified Tabs Layout
 *
 * 2026-07-12 — FIXED: real scroll-clipping bug, confirmed from screenshot.
 *   mobileContentContainer had paddingTop but no paddingBottom, while the
 *   tab bar floats as an absolutely-positioned overlay from bottom:24 to
 *   bottom:96. Nothing reserved that space in the content's own layout, so
 *   every screen's last ~96px rendered directly underneath the tab bar with
 *   no way to scroll far enough to actually see it. paddingBottom now
 *   matches the tab bar's real footprint (96px + a margin of breathing
 *   room), computed as one named constant instead of a magic number.
 *
 * 2026-07-12 — Mobile tab bar polish: added the active-state glow dot and
 *   label under each icon (previously icon-only, inconsistent with the
 *   desktop Sidebar's icon+label pattern) and deduplicated the web/native
 *   tab bar JSX, which were two copies of the identical render logic.
 *
 * 2026-07-02 — Sidebar de-duplicated, palette drift fixed.
 * 2026-07-04 — Removed "Vault" from both nav bars — moved to
 *   Settings → Documents; see that file for why a single-purpose upload
 *   screen shouldn't occupy a permanent primary-nav slot.
 * 2026-07-02 — Desktop renders <Slot/>, not <Tabs/>. React Navigation's web
 *   tab navigator keeps every visited screen mounted and toggles visibility
 *   per scene; with transparent scene backgrounds (needed for the ambient
 *   background to show through) and content that doesn't fill the viewport,
 *   a previous screen could bleed through wherever heights didn't line up.
 *   Slot renders only the currently matched route — nothing else is ever
 *   mounted, so there's nothing left to bleed through. Mobile keeps its own
 *   custom bar + Slot for the same reason; it never used <Tabs/> either.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions, Image, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Sidebar } from '../../components/layout/AdaptiveLayout';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { PageContainer } from '../../components/layout/PageContainer';
import { NAV_ITEMS } from '../../lib/navConfig';
import { C } from '../../lib/theme';

const LAYOUT = {
  // 72px sidebar width + 24px left offset + 8px breathing room = 104px
  sidebarOffset: 104,
  headerHeight: 64,
};

// Single source of truth for the floating tab bar's real footprint — used
// both to size the bar itself and to reserve matching space in the content
// above it, so the two can never drift out of sync again.
const TAB_BAR = {
  height: 72,
  bottomOffset: 24,
  get totalFootprint() {
    return this.height + this.bottomOffset;
  },
};

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const sharedStyle: any = {
    flex: 1,
    backgroundColor: C.bg,
    // On web: layer a violet radial gradient over the solid dark base.
    // Cards with backdrop-blur diffuse this gradient, creating the frosted look.
    ...(Platform.OS === 'web' && {
      backgroundImage: [
        `radial-gradient(ellipse 120% 80% at 50% 0%, ${C.core}12 0%, transparent 55%)`,
        `radial-gradient(ellipse 80% 60% at 85% 100%, ${C.purple}0E 0%, transparent 55%)`,
      ].join(', '),
    }),
  };

  if (isDesktop) {
    return (
      <View className="flex-1" style={sharedStyle}>
        <Sidebar active={pathname} />
        <View className="relative flex-1" style={{ paddingLeft: LAYOUT.sidebarOffset }}>
          {/* Slot renders exactly one screen — the one matching the current
              route — and unmounts everything else. This is what makes
              switching Sidebar items swap content instead of stacking it. */}
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile: Slot (not Tabs) — same stacking-bug reasoning as desktop.
  // Custom floating tab bar below handles navigation and active state.
  const getActiveTab = () => {
    if (pathname.includes('dashboard')) return 'dashboard';
    if (pathname.includes('jobs')) return 'jobs';
    if (pathname.includes('configure')) return 'configure';
    if (pathname.includes('settings')) return 'settings';
    return 'dashboard';
  };
  const activeTab = getActiveTab();

  const navigateTo = (name: string) => {
    router.push((name === 'settings' ? './settings' : name) as any);
  };

  // Shared between the web and native render paths below — was previously
  // duplicated verbatim in both branches.
  const navItems = NAV_ITEMS.map(({ name, label, Icon }) => {
    const active = activeTab === name;
    return (
      <Pressable
        key={name}
        onPress={() => navigateTo(name)}
        style={[styles.tabBarItem, active && styles.tabBarItemActive]}
      >
        <Icon size={22} color={active ? C.cyan : C.sub} strokeWidth={2.5} />
        <Text style={[styles.tabBarLabel, active && styles.tabBarLabelActive]}>{label}</Text>
        {active && <View style={styles.activeDot} />}
      </Pressable>
    );
  });

  return (
    <PageContainer style={sharedStyle} safeAreaTop={false}>
      {/* Header: Logo + Dropdown */}
      <Image
        source={require('../../assets/icon.png')}
        style={styles.mobileLogo}
        resizeMode="contain"
      />
      <View style={styles.mobileDropdown}>
        <ProfileDropdown />
      </View>

      {/* Main Content — Slot renders ONLY the active route. paddingBottom
          reserves space for the floating tab bar so content never renders
          underneath it. */}
      <View style={styles.mobileContentContainer}>
        <Slot />
      </View>

      {/* Floating tab bar — real BlurView on native, CSS backdrop-filter
          on web (React Native has no backdrop-filter equivalent). */}
      {Platform.OS === 'web' ? (
        <View style={[styles.mobileTabBar, { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any]}>
          {navItems}
        </View>
      ) : (
        <BlurView intensity={40} tint="dark" style={styles.mobileTabBar}>
          {navItems}
        </BlurView>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  mobileLogo: {
    position: 'absolute',
    top: 12,
    left: 20,
    width: 40,
    height: 40,
    zIndex: 1000,
  },
  mobileDropdown: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 1000,
  },
  mobileContentContainer: {
    flex: 1,
    // Top: clears the absolutely-positioned logo/dropdown above Slot.
    // Bottom: clears the floating tab bar — this was previously missing
    // entirely, which is what hid content behind the bar with no way to
    // scroll to it.
    paddingTop: 64,
    paddingBottom: TAB_BAR.totalFootprint + 16,
  },
  mobileTabBar: {
    position: 'absolute',
    bottom: TAB_BAR.bottomOffset,
    left: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 13, 30, 0.05)',
    borderTopColor: 'transparent',
    borderColor: `${C.cyan}1A`,
    borderWidth: 1,
    height: TAB_BAR.height,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    paddingTop: 8,
    borderRadius: 32,
    elevation: 12,
    zIndex: 100,
    shadowColor: C.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 6,
    gap: 3,
  },
  tabBarItemActive: {
    backgroundColor: `${C.cyan}0D`,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.sub,
    letterSpacing: 0.3,
  },
  tabBarLabelActive: {
    color: C.cyan,
  },
  activeDot: {
    position: 'absolute',
    bottom: -1,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});