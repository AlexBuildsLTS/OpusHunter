/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Tabs Layout
 * 2026-06-29
 *
 * Architecture:
 *   Web  ≥768px: Left sidebar (60px wide) — persistent, like VeraxAI
 *   Mobile/APK/iOS: Bottom tab bar
 *
 * Sidebar matches the VeraxAI example exactly:
 *   - Icon + label stack
 *   - Cyan active indicator
 *   - Avatar/profile access top-right (web)
 *   - User menu popup on avatar tap
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  useWindowDimensions, Modal, Pressable,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  LayoutDashboard, Settings, Briefcase, Database,
  LogOut, Shield, User, ChevronDown,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import type { Database as DB } from '../../types/database.types';

const C = {
  cyan: '#00D4FF',
  purple: '#7B5EA7',
  pink: '#E8436A',
  amber: '#F59E0B',
  obsidian: '#020507',
  sidebar: '#050A0D',
  border: 'rgba(255,255,255,0.065)',
  text: '#D8E4EC',
  sub: 'rgba(216,228,236,0.45)',
  dim: 'rgba(216,228,236,0.22)',
};

const NAV_ITEMS = [
  { name: 'dashboard', label: 'HUNT', Icon: LayoutDashboard },
  { name: 'vault', label: 'VAULT', Icon: Database },
  { name: 'configure', label: 'RULES', Icon: Briefcase },
  { name: 'profile', label: 'PROFILE', Icon: User },
] as const;

type NavItemName = typeof NAV_ITEMS[number]['name'];

type ProfileRow = DB['public']['Tables']['profiles']['Row'];

// ── Avatar Component ───────────────────────────────────────────────────────────

function Avatar({ profile, size = 36 }: { profile?: ProfileRow | null; size?: number }) {
  const initials = profile?.full_name
    ? profile.full_name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? '??';
  const roleColors: Record<string, string> = { admin: C.pink, premium: C.amber, member: C.cyan };
  const color = roleColors[profile?.role ?? 'member'];
  return (
    <View style={[avatarS.wrap, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}60` }]}>
      {profile?.avatar_url
        ? null // expo-image would go here: <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size, borderRadius: size/2 }} />
        : <Text style={[avatarS.text, { color, fontSize: size * 0.36 }]}>{initials}</Text>
      }
    </View>
  );
}
const avatarS = StyleSheet.create({
  wrap: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  text: { fontWeight: '800' },
});

// ── User Menu Popup ────────────────────────────────────────────────────────────

function UserMenu({ profile, visible, onClose }: { profile?: ProfileRow | null; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const roleColors: Record<string, string> = { admin: C.pink, premium: C.amber, member: C.purple };
  const role = profile?.role ?? 'member';
  const color = roleColors[role];

  const doSignOut = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const MENU = [
    { label: 'Profile', icon: User, action: () => { onClose(); router.push('/(tabs)/profile'); } },
    { label: 'Settings', icon: Settings, action: () => { onClose(); router.push('/(settings)/' as any); } },
    ...(role === 'admin' ? [{ label: 'Admin Core', icon: Shield, action: () => { onClose(); router.push('/(admin)/' as any); }, color: C.pink }] : []),
  ];

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View entering={FadeInDown.springify().damping(20)} style={menuS.card}>
        {/* User header */}
        <View style={menuS.userRow}>
          <Avatar profile={profile} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={menuS.userName} numberOfLines={1}>{profile?.full_name || 'No name'}</Text>
            <Text style={menuS.userEmail} numberOfLines={1}>{profile?.email}</Text>
            <View style={[menuS.roleBadge, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
              <Text style={[menuS.roleText, { color }]}>{role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={menuS.divider} />

        {/* Menu items */}
        {MENU.map(({ label, icon: Icon, action, color: itemColor }) => (
          <TouchableOpacity key={label} onPress={action} style={menuS.item} activeOpacity={0.7}>
            <Icon size={16} color={itemColor ?? C.sub} />
            <Text style={[menuS.itemText, itemColor ? { color: itemColor } : {}]}>{label}</Text>
          </TouchableOpacity>
        ))}

        <View style={menuS.divider} />

        <TouchableOpacity onPress={doSignOut} style={menuS.item} activeOpacity={0.7}>
          <LogOut size={16} color={C.pink} />
          <Text style={[menuS.itemText, { color: C.pink }]}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const menuS = StyleSheet.create({
  card: {
    position: 'absolute', top: 60, right: 16, width: 240,
    backgroundColor: 'rgba(8,16,24,0.96)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 20,
    padding: 8, zIndex: 9999,
    // Web shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(24px)',
    } as any : {
      shadowColor: '#000', shadowOpacity: 0.5,
      shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    }),
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  userName: { fontSize: 14, fontWeight: '700', color: C.text },
  userEmail: { fontSize: 11, color: C.sub, marginBottom: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10 },
  itemText: { fontSize: 13, fontWeight: '600', color: C.text },
});

// ── Web Sidebar ────────────────────────────────────────────────────────────────

function WebSidebar({ active, profile }: { active: string; profile?: ProfileRow | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={sidebarS.root}>
        {/* Logo */}
        <TouchableOpacity style={sidebarS.logoBtn} onPress={() => router.push('/(tabs)/dashboard')} activeOpacity={0.8}>
          <Text style={sidebarS.logoIcon}>⊙</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, gap: 4 }}>
          {NAV_ITEMS.map(({ name, label, Icon }) => {
            const isActive = active.includes(name);
            return (
              <TouchableOpacity
                key={name}
                onPress={() => router.push(`/(tabs)/${name}` as any)}
                style={[sidebarS.navItem, isActive && sidebarS.navItemActive]}
                activeOpacity={0.8}
              >
                {isActive && <View style={sidebarS.activeIndicator} />}
                <Icon size={20} color={isActive ? C.cyan : C.sub} strokeWidth={isActive ? 2.5 : 2} />
                <Text style={[sidebarS.navLabel, isActive && { color: C.cyan }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Settings */}
        <TouchableOpacity
          onPress={() => router.push('/(settings)/' as any)}
          style={sidebarS.navItem}
          activeOpacity={0.8}
        >
          <Settings size={20} color={C.sub} strokeWidth={2} />
          <Text style={sidebarS.navLabel}>SET</Text>
        </TouchableOpacity>
      </View>

      {/* Top-right avatar (web) */}
      <View style={avatarBtnS.wrap}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
          <Avatar profile={profile} size={38} />
        </TouchableOpacity>
      </View>

      <UserMenu profile={profile} visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const sidebarS = StyleSheet.create({
  root: {
    position: 'fixed' as any, left: 0, top: 0, bottom: 0,
    width: 64, backgroundColor: C.sidebar,
    borderRightWidth: 1, borderRightColor: C.border,
    alignItems: 'center', paddingVertical: 16,
    zIndex: 100, gap: 0,
  },
  logoBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(0,212,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoIcon: { fontSize: 20, color: C.cyan },
  navItem: {
    width: 52, minHeight: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, position: 'relative',
  },
  navItemActive: { backgroundColor: 'rgba(0,212,255,0.08)' },
  activeIndicator: {
    position: 'absolute', left: 0, top: 12, bottom: 12,
    width: 3, borderRadius: 2, backgroundColor: C.cyan,
  },
  navLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1, color: C.sub, textTransform: 'uppercase' },
});

const avatarBtnS = StyleSheet.create({
  wrap: { position: 'fixed' as any, top: 14, right: 16, zIndex: 200 },
});

// ── Main Layout ────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Load profile for avatar / role-aware nav
  const { data: profile } = useQuery<ProfileRow | null>({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data ?? null;
    },
    staleTime: 60_000,
  });

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <WebSidebar active={pathname} profile={profile} />
        <View style={{ flex: 1, marginLeft: 64 }}>
          <Tabs
            screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
          >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="vault" />
            <Tabs.Screen name="configure" />
            <Tabs.Screen name="profile" />
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile: native bottom tab bar
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.sidebar,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.sub,
        tabBarLabelStyle: {
          fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
        },
      }}
    >
      {NAV_ITEMS.map(({ name, label, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ color, size }) => <Icon size={size ?? 22} color={color} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}