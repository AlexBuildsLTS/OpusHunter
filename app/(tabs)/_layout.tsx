/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Unified Tabs Layout
 * 2026-07-02 — Sidebar de-duplicated, palette drift fixed
 */

import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
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
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
              sceneStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="vault" />
            <Tabs.Screen name="configure" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="(settings)" />
          </Tabs>
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
        <Tabs.Screen name="(settings)" options={{ href: null }} />
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