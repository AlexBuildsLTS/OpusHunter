/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Tab Navigation
 * Desktop: icon sidebar (68px). Mobile/APK/iOS: floating pill tab bar.
 * 4 tabs: Dashboard · Configure · Vault · Profile
 */
import React from 'react';
import {
  Platform, View, Pressable, Text, Image,
  useWindowDimensions, StyleSheet,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Zap, SlidersHorizontal, Archive, UserCircle } from 'lucide-react-native';

const C = { cyan: '#00D4FF', purple: '#7B5EA7', bg: '#0A1419' };

const NAV = [
  { name: 'dashboard', Icon: Zap, label: 'ENGINE', color: C.cyan },
  { name: 'configure', Icon: SlidersHorizontal, label: 'RULES', color: C.purple },
  { name: 'vault', Icon: Archive, label: 'VAULT', color: C.purple },
  { name: 'profile', Icon: UserCircle, label: 'PROFILE', color: C.purple },
] as const;

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width >= 768;
  const router = useRouter();
  const pathname = usePathname();

  /* ── Desktop sidebar ─────────────────────────────────────────────────────── */
  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
        <View style={s.sidebar}>
          {/* Logo */}
          <Pressable onPress={() => router.push('/(tabs)/dashboard')} style={s.logoWrap}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 26, height: 26, borderRadius: 7 }}
              resizeMode="contain"
            />
          </Pressable>

          <View style={{ flex: 1, gap: 4, alignItems: 'center', paddingTop: 8 }}>
            {NAV.map(({ name, Icon, label, color }) => {
              const active = pathname.startsWith(`/${name}`) ||
                pathname === `/(tabs)/${name}`;
              return (
                <Pressable
                  key={name}
                  onPress={() => router.push(`/(tabs)/${name}` as any)}
                  style={[
                    s.navBtn,
                    active && {
                      backgroundColor: `${color}14`,
                      borderColor: `${color}35`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Icon
                    size={19}
                    color={active ? color : 'rgba(255,255,255,0.25)'}
                  />
                  <Text style={[
                    s.navLabel,
                    { color: active ? color : 'rgba(255,255,255,0.18)' },
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Page content — Tabs renders the matched screen */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            {NAV.map(({ name }) => <Tabs.Screen key={name} name={name} />)}
          </Tabs>
        </View>
      </View>
    );
  }

  /* ── Mobile / APK / iOS floating tab bar ─────────────────────────────────── */
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 14,
          left: 12,
          right: 12,
          borderRadius: 24,
          height: 62,
          paddingBottom: 0,
          paddingTop: 0,
          backgroundColor: 'rgba(10,20,26,0.97)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,212,255,0.07)',
          elevation: 0,
        },
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.22)',
        tabBarShowLabel: false,
      }}
    >
      {NAV.map(({ name, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ tabBarIcon: ({ color }) => <Icon size={22} color={color} /> }}
        />
      ))}
    </Tabs>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 68,
    backgroundColor: 'rgba(6,14,20,0.98)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,212,255,0.06)',
    paddingVertical: 16,
    paddingHorizontal: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  navBtn: {
    width: 48,
    height: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
  },
  navLabel: {
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});