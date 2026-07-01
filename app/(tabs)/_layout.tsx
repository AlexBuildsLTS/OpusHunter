/**
 * app/(tabs)/_layout.tsx
 * OpusHunter — Unified Tabs Layout
 * 2026-06-29
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  LayoutDashboard, Database, Briefcase, Settings, User
} from 'lucide-react-native';
import { C } from '../../lib/theme';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database as DB } from '../../types/database.types';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';

type ProfileRow = DB['public']['Tables']['profiles']['Row'];

const NAV_ITEMS = [
  { name: 'dashboard', label: 'DASH', Icon: LayoutDashboard },
  { name: 'vault', label: 'VAULT', Icon: Database },
  { name: 'configure', label: 'RULES', Icon: Briefcase }
]

// ── Web Sidebar (Desktop Only) ──────────────────────────────────────────────────
function WebSidebar({ active }: { active: string }) {
  const router = useRouter();

  return (
    <View className="absolute left-6 top-8 bottom-8 w-[72px] bg-[#0A121A]/80 border border-brand-cyan/10 rounded-3xl items-center py-6 z-50 shadow-2xl shadow-brand-cyan/5">
      {/* Absolute gradient behind sidebar for sleek look */}
      <View className="absolute inset-0 bg-gradient-to-b from-brand-cyan/5 to-transparent pointer-events-none rounded-3xl" />
      
      {/* Logo */}
      <TouchableOpacity 
        className="w-[44px] h-[44px] rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 items-center justify-center mb-8 shadow-lg shadow-brand-cyan/20"
        onPress={() => router.push('/(tabs)/dashboard')} 
        activeOpacity={0.8}
      >
        <Image source={require('../../assets/icon.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
      </TouchableOpacity>

      <View className="flex-1 w-full items-center gap-2">
        {NAV_ITEMS.map(({ name, label, Icon }) => {
          const isActive = active?.includes?.(name) ?? false;
          return (
            <TouchableOpacity
              key={name}
              onPress={() => router.push(`/(tabs)/${name}` as any)}
              activeOpacity={0.8}
              className={`w-[56px] h-[56px] rounded-2xl items-center justify-center gap-1 relative ${isActive ? 'bg-brand-cyan/10' : ''}`}
            >
              {isActive && (
                <View className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-md bg-brand-cyan shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
              )}
              <Icon size={22} color={isActive ? C.cyan : C.sub} strokeWidth={isActive ? 2.5 : 2} />
              <Text className="text-[9px] font-bold tracking-wider uppercase" style={{ color: isActive ? C.cyan : C.sub }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Removed Profile Dropdown from bottom of sidebar */}
    </View>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (isDesktop) {
    return (
      <View className="flex-1 bg-[#050A0F]">
        <WebSidebar active={pathname} />
        <View className="flex-1 pl-[120px]">
          {/* Top-Right Profile Dropdown for Web */}
          <View className="absolute top-8 right-8 z-50">
            <ProfileDropdown />
          </View>

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

  // Mobile: Native Bottom Tab Bar
  return (
    <View style={{ flex: 1, backgroundColor: '#050A0F' }}>
      {/* ── MOBILE GLOBAL TOP HEADER ── */}
      {pathname !== '/profile' && (
        <View 
          style={{ 
            position: 'absolute', 
            top: Platform.OS === 'ios' ? 56 : 48, 
            left: 20, 
            right: 20, 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            zIndex: 1000 
          }} 
          pointerEvents="box-none"
        >
          {/* Top Left Logo */}
          <Image 
            source={require('../../assets/icon.png')} 
            style={{ width: 36, height: 36 }} 
            resizeMode="contain" 
          />
          
          {/* Top Right Profile Dropdown */}
          <ProfileDropdown />
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            backgroundColor: 'rgba(10, 18, 26, 0.95)',
            borderTopColor: 'transparent',
            borderColor: 'rgba(0, 212, 255, 0.1)',
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
            shadowColor: '#00D4FF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          },
          tabBarActiveTintColor: C.cyan,
          tabBarInactiveTintColor: C.sub,
          tabBarLabelStyle: {
            fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4
          },
          tabBarItemStyle: {
            borderRadius: 20,
          },
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
        <Tabs.Screen 
          name="(settings)" 
          options={{ 
            href: null,
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            href: null,
          }} 
        />
      </Tabs>
    </View>
  );
}