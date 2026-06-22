/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Tab / Sidebar Navigation
 *
 * Three tabs: Engine (dashboard), Configure (rules), Vault (documents)
 * Desktop: icon-only sidebar, properly spaced
 * Mobile: floating pill tab bar
 */

import React from 'react';
import {
  Platform, View, Pressable, Text, Image,
  useWindowDimensions, StyleSheet,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Zap, Settings2, Archive } from 'lucide-react-native';

const NAV = [
  { route: '/(tabs)/dashboard', name: 'dashboard', Icon: Zap, label: 'ENGINE', color: '#00D4FF' },
  { route: '/(tabs)/configure', name: 'configure', Icon: Settings2, label: 'RULES', color: '#7B5EA7' },
  { route: '/(tabs)/vault', name: 'vault', Icon: Archive, label: 'VAULT', color: '#7B5EA7' },
] as const;

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore web-only */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 90% 95%, rgba(0,180,210,0.06) 0%, transparent 70%)' }} />
    </View>
  );
}

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width >= 768;
  const router = useRouter();
  const pathname = usePathname();

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0A1419' }}>
        <AmbientBg />

        {/* ── Sidebar ── */}
        <View style={styles.sidebar}>
          {/* Logo */}
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 24, height: 24, borderRadius: 6 }}
              resizeMode="contain"
            />
          </View>

          {/* Nav items */}
          <View style={styles.navItems}>
            {NAV.map(({ route, name, Icon, label, color }) => {
              const active = pathname.includes(name);
              return (
                <Pressable
                  key={route}
                  onPress={() => router.push(route as any)}
                  style={[
                    styles.navBtn,
                    active && {
                      backgroundColor: `${color}12`,
                      borderColor: `${color}30`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Icon size={18} color={active ? color : 'rgba(255,255,255,0.28)'} />
                  <Text style={[styles.navLabel, { color: active ? color : 'rgba(255,255,255,0.2)' }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Page content ── */}
        <View style={{ flex: 1 }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="configure" />
            <Tabs.Screen name="vault" />
          </Tabs>
        </View>
      </View>
    );
  }

  // ── Mobile: floating tab bar ──
  return (
    <View style={{ flex: 1, backgroundColor: '#0A1419' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(11,24,34,0.97)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(120,200,240,0.07)',
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            borderRadius: 22,
            height: 64,
            paddingBottom: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: '#00D4FF',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
          tabBarShowLabel: false,
        }}
      >
        {NAV.map(({ name, Icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              tabBarIcon: ({ color }) => <Icon size={21} color={color} />,
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 68,
    backgroundColor: 'rgba(8,16,22,0.95)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(120,200,240,0.06)',
    paddingVertical: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  logoBox: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  navItems: {
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  navBtn: {
    width: 48, height: 48, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
    gap: 3,
  },
  navLabel: {
    fontSize: 6, fontWeight: '800', letterSpacing: 1,
    textTransform: 'uppercase',
  },
});