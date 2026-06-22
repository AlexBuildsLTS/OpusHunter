import React from 'react';
import { Platform, View, Pressable, Text, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Zap, Archive } from 'lucide-react-native';

const NAV = [
  { route: '/(tabs)/dashboard', name: 'dashboard', Icon: Zap, label: 'ENGINE', color: '#00D4FF' },
  { route: '/(tabs)/vault', name: 'vault', Icon: Archive, label: 'VAULT', color: '#7B5EA7' },
] as const;

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore web-only */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 90% 95%, rgba(0,180,210,0.07) 0%, transparent 70%)' }} />
      {/* @ts-ignore web-only */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 35% at 5% 5%, rgba(90,40,160,0.06) 0%, transparent 65%)' }} />
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

        {/* Icon-only sidebar */}
        <View style={styles.sidebar}>
          {/* Logo mark */}
          <View style={styles.logoMark}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 26, height: 26, borderRadius: 6 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ flex: 1, gap: 6, alignItems: 'center' }}>
            {NAV.map(({ route, name, Icon, label, color }) => {
              const active = pathname.includes(name);
              return (
                <Pressable key={route} onPress={() => router.push(route as any)} style={[styles.navBtn, active && { backgroundColor: `${color}15`, borderColor: `${color}35`, borderWidth: 1 }]}>
                  <Icon size={19} color={active ? color : 'rgba(255,255,255,0.3)'} />
                  <Text style={[styles.navLabel, { color: active ? color : 'rgba(255,255,255,0.22)' }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Page content */}
        <View style={{ flex: 1 }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="vault" />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1419' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            position: 'absolute',
            bottom: 18, left: 18, right: 18,
            borderRadius: 22,
            height: 62,
            paddingBottom: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: '#00D4FF',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.28)',
          tabBarShowLabel: false,
        }}
      >
        {NAV.map(({ name, Icon }) => (
          <Tabs.Screen key={name} name={name} options={{ tabBarIcon: ({ color }) => <Icon size={21} color={color} /> }} />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 68,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  logoMark: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  navBtn: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  navLabel: {
    fontSize: 6.5, fontWeight: '700', letterSpacing: 1.1,
    marginTop: 3, textTransform: 'uppercase',
  },
});