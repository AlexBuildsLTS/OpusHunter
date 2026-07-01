/**
 * components/layout/AdaptiveLayout.tsx
 * OpusHunter — Shared Desktop Sidebar Shell
 * 2026-07-01
 *
 * Replaces the old orphaned copy of this file, which was still VeraxAI's
 * unmodified component: wrong routes (/history, /settings/models,
 * /settings/chat), wrong nav items (ENGINE/VAULT/LLM), and raw hex colors
 * (#00F0FF, #8A2BE2) that don't exist anywhere in lib/theme.ts. It was never
 * imported anywhere, so none of that ever rendered — but it sat in the repo
 * as a landmine for whoever wired it in next expecting it to work.
 *
 * This is the real thing: app/(tabs)/_layout.tsx's WebSidebar function,
 * lifted out so (admin) and (settings) can share it instead of having no
 * sidebar at all on desktop (their current state).
 *
 * Desktop web (>=768px): renders the left nav rail + offsets children.
 * Mobile / native: passthrough, no wrapper — those get AppHeader per-screen
 * and, in (tabs) only, the native bottom Tabs bar.
 *
 * Usage:
 *   <AdaptiveLayout>{...whatever the layout renders...}</AdaptiveLayout>
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, Database, Briefcase } from 'lucide-react-native';
import { C } from '../../lib/theme';

const NAV_ITEMS = [
  { name: 'dashboard', label: 'DASH', Icon: LayoutDashboard },
  { name: 'vault', label: 'VAULT', Icon: Database },
  { name: 'configure', label: 'RULES', Icon: Briefcase },
] as const;

function Sidebar({ active }: { active: string }) {
  const router = useRouter();

  return (
    <View
      className="absolute left-6 top-8 bottom-8 w-[72px] border border-brand-cyan/15 rounded-3xl items-center py-6 z-50 shadow-2xl shadow-brand-cyan/10"
      style={{ backgroundColor: 'rgba(5, 10, 13, 0.85)' }}
    >
      <View
        className="absolute inset-0 pointer-events-none bg-gradient-to-b rounded-3xl"
        style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0, 212, 255, 0.08), rgba(123, 94, 167, 0.04))' }}
      />

      <TouchableOpacity
        className="w-[44px] h-[44px] rounded-2xl border border-brand-cyan/20 items-center justify-center mb-8 shadow-lg shadow-brand-cyan/20"
        style={{ backgroundColor: 'rgba(0, 212, 255, 0.08)' }}
        onPress={() => router.push('/(tabs)/dashboard')}
        activeOpacity={0.8}
      >
        <Image source={require('../../assets/icon.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
      </TouchableOpacity>

      <View className="items-center flex-1 w-full gap-2">
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
              <Text className="text-[9px] font-bold tracking-wider uppercase" style={{ color: isActive ? C.cyan : C.sub }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: C.bg,
        backgroundImage: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0, 212, 255, 0.05) 0%, transparent 60%)',
      }}
    >
      <Sidebar active={pathname} />
      <View className="flex-1 pl-[120px]">{children}</View>
    </View>
  );
}