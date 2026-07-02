/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Unified Tabs Layout
 * 2026-07-02 — Sidebar de-duplicated, palette drift fixed
 *
 * FIXED: local `WebSidebar` (still hardcoding the pre-repalette cyan) is
 * gone — desktop now uses the single `Sidebar` from AdaptiveLayout, which
 * also renders the floating ProfileDropdown itself, so the duplicate block
 * that used to sit here has been removed.
 * FIXED: mobile tab bar's shadow/glow color and radial gradients still read
 * `#00D4FF` / `rgba(0,212,255,…)` — now read `C.cyan` (violet).
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, Database, Briefcase } from 'lucide-react-native';
import { C, LAYOUT } from '../../lib/theme';
import { Sidebar } from '../../components/layout/AdaptiveLayout';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';

const NAV_ITEMS = [
  { name: 'dashboard', label: '', Icon: LayoutDashboard },
  { name: 'vault', label: '', Icon: Database },
  { name: 'configure', label: '', Icon: Briefcase },
] as const;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isDesktop) {
    return (
      <View
        className="flex-1"
        style={{
          backgroundColor: C.bg,
          backgroundImage: `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 40%)`,
        }}
      >
        <Sidebar active={pathname} />
        <View className="flex-1 relative" style={{ paddingLeft: LAYOUT.sidebarOffset }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' }, sceneStyle: { backgroundColor: 'transparent' } }}>
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

  // Mobile: Native Bottom Tab Bar — ONE fixed identity bar (logo + dropdown)
  // that every (tabs) screen renders under via sceneStyle.paddingTop below.
  // Per-screen headers must NOT duplicate this (see AppHeader's `showIdentity`).
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.bg,
      backgroundImage: `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 40%)`,
    }}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ position: 'absolute', top: 12, left: 20, width: 40, height: 40, zIndex: 1000 }}
        resizeMode="contain"
      />

      <View style={{ position: 'absolute', top: 12, right: 20, zIndex: 1000 }}>
        <ProfileDropdown />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent', paddingTop: LAYOUT.headerH + 6 },
          tabBarStyle: {
            backgroundColor: 'rgba(10, 23, 18, 0.72)',
            borderTopColor: 'transparent',
            borderColor: `${C.cyan}1A`,
            borderWidth: 1,
            height: 72,
            paddingBottom: Platform.OS === 'ios' ? 20 : 12,
            paddingTop: 12,
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            borderRadius: 36,
            elevation: 10,
            shadowColor: C.cyan,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
          },
          tabBarActiveTintColor: C.cyan,
          tabBarInactiveTintColor: C.sub,
          tabBarLabelStyle: {
            fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4,
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
              tabBarIcon: ({ color, size }) => <Icon size={size ?? 24} color={color} strokeWidth={2.5} />,
            }}
          />
        ))}
        <Tabs.Screen name="(settings)" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}