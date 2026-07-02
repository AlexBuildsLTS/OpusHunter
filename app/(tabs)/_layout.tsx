/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Unified Tabs Layout
 * 2026-07-02 — Sidebar de-duplicated, palette drift fixed
 * 2026-07-02 — FIX (stacking/cluttering bug): desktop no longer renders a
 *   `<Tabs>` navigator at all.
 *
 *   ROOT CAUSE: on desktop we already hide the tab bar UI
 *   (`tabBarStyle: { display: 'none' }`) and drive navigation entirely
 *   through the custom `Sidebar`. But we were still mounting the screens
 *   *through* a `<Tabs>` navigator underneath. React Navigation's web tab
 *   navigator keeps every visited screen mounted and toggles them with an
 *   inline `display` style per scene so switching tabs is instant — that's
 *   correct behavior for an actual tab bar. The problem is every scene here
 *   has `sceneStyle: { backgroundColor: 'transparent' }` (needed so the
 *   global AmbientBackground shows through) and each screen's own content
 *   is a set of GlassCard panels that don't fill the viewport height, not
 *   one opaque full-bleed background. With nothing opaque behind the active
 *   screen, the previous screen's still-mounted (not unmounted, just
 *   `display:none`'d in theory) DOM could bleed through wherever heights
 *   didn't line up — which is exactly the "Configure's search rules
 *   floating on top of Vault" bug from the screenshot.
 *
 *   FIX: swap `<Tabs>` for `<Slot />` on desktop. `Slot` renders ONLY the
 *   currently matched child route — nothing else is ever mounted, so there
 *   is nothing left to bleed through. The Sidebar already provides all the
 *   navigation UI and active-state highlighting a tab bar would; `Tabs` was
 *   only ever wired in for the underlying route registration, which `Slot`
 *   also provides. Mobile is untouched — it genuinely needs `<Tabs>` for
 *   the physical bottom tab bar and its gestures/animations.
 */

import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { Tabs, Slot, usePathname } from 'expo-router';
import { LayoutDashboard, Database, Briefcase, LucideIcon } from 'lucide-react-native';
import { C, LAYOUT } from '../../lib/theme';
import { Sidebar } from '../../components/layout/AdaptiveLayout';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';

type NavItem = { name: string; label: string; Icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: '', Icon: LayoutDashboard },
  { name: 'vault', label: '', Icon: Database },
  { name: 'configure', label: '', Icon: Briefcase },
];

const BACKGROUND_GRADIENT = `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 40%)`;

const TAB_BAR_STYLE = {
  backgroundColor: 'rgba(12, 13, 29, 0.22)',
  borderTopColor: 'transparent',
  borderColor: `${C.cyan}1A`,
  borderWidth: 1,
  height: 72,
  paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  paddingTop: 12,
  position: 'absolute' as const,
  bottom: 24,
  left: 20,
  right: 20,
  borderRadius: 36,
  elevation: 10,
  shadowColor: C.cyan,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
};

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const sharedStyle = {
    flex: 1,
    backgroundColor: C.bg,
    ...(Platform.OS === 'web' && { backgroundImage: BACKGROUND_GRADIENT }),
  };

  if (isDesktop) {
    return (
      <View className="flex-1" style={sharedStyle}>
        <Sidebar active={pathname} />
        <View className="flex-1 relative" style={{ paddingLeft: LAYOUT.sidebarOffset }}>
          {/* Slot renders exactly one screen — the one matching the current
              route — and unmounts everything else. This is what makes
              switching Sidebar items swap content instead of stacking it. */}
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile: Fixed identity bar (logo + dropdown) + bottom tab bar
  return (
    <View style={sharedStyle}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.mobileLogo}
        resizeMode="contain"
      />

      <View style={styles.mobileDropdown}>
        <ProfileDropdown />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: 'transparent',
            paddingTop: LAYOUT.headerHeight + 6,
          },
          tabBarStyle: TAB_BAR_STYLE,
          tabBarActiveTintColor: C.cyan,
          tabBarInactiveTintColor: C.sub,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginTop: 4,
          },
          tabBarItemStyle: { borderRadius: 20 },
        }}
      >
        {NAV_ITEMS.map(({ name, label, Icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: label,
              tabBarIcon: ({ color, size }) => (
                <Icon size={size ?? 24} color={color} strokeWidth={2.5} />
              ),
            }}
          />
        ))}
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
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
});