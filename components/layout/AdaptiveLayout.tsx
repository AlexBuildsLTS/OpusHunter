/**
 * components/layout/AdaptiveLayout.tsx
 * OpusHunter — Shared Desktop Sidebar + Standalone-Stack Mobile Header
 * 2026-07-02
 *
 * FIXED (critical): on mobile, this was a pure `<>{children}</>` passthrough.
 * (admin) is NOT nested in app/(tabs)/_layout.tsx, so it gets no logo, no
 * back button, no ProfileDropdown from anywhere else — mobile admin had
 * ZERO navigation. Now renders a real header on mobile for any stack that
 * isn't (tabs).
 * FIXED: the sidebar's decorative gradient overlay had no `overflow-hidden`
 * on its own layer, which under RN Web can let a rectangular gradient paint
 * outside the rounded corners on some GPU compositing paths — the "purple
 * box" artifact. Explicit overflow-hidden added.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Database, Briefcase, ArrowLeft } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { ProfileDropdown } from '../ui/ProfileDropdown';
import type { Database as DB } from '../../types/database.types';


type ProfileRow = DB['public']['Tables']['profiles']['Row'];

const NAV_ITEMS = [
  { name: 'dashboard', label: 'DASH', Icon: LayoutDashboard },
  { name: 'vault', label: 'VAULT', Icon: Database },
  { name: 'configure', label: 'RULES', Icon: Briefcase },
] as const;

export function Sidebar({ active }: { active: string }) {
  const router = useRouter();

  useQuery<ProfileRow | null>({
    queryKey: ['my_profile_full'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    staleTime: 30_000,
  });

  return (
    <>
      <View
        className="absolute left-6 top-8 bottom-8 w-[72px] border border-brand-cyan/15 rounded-3xl items-center py-6 z-50 shadow-2xl shadow-brand-cyan/10 overflow-hidden"
        style={{ backgroundColor: 'rgba(7, 15, 10, 0.85)' }}
      >
        <View
          pointerEvents="none"
          className="absolute inset-0 overflow-hidden rounded-3xl"
          style={{ backgroundImage: `linear-gradient(to bottom, ${C.cyan}14, ${C.purple}0A)` }}
        />

        <TouchableOpacity
          className="w-[44px] h-[44px] rounded-2xl border border-brand-cyan/20 items-center justify-center mb-8 shadow-lg shadow-brand-cyan/20"
          style={{ backgroundColor: `${C.cyan}14` }}
          onPress={() => router.push('/(tabs)/dashboard')}
          activeOpacity={0.8}
        >
          <Image source={require('../../assets/icon.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center flex-1 w-full gap-2">
          {NAV_ITEMS.map(({ name, Icon }) => {
            const isActive = active?.includes?.(name) ?? false;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => router.push(`/(tabs)/${name}` as any)}
                activeOpacity={0.8}
                className={`w-[56px] h-[56px] rounded-2xl items-center justify-center relative transition-colors duration-200 ${isActive ? 'bg-brand-cyan/10' : 'hover:bg-white/[0.04]'
                  }`}
              >
                {isActive && (
                  <View
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-md bg-brand-cyan"
                    style={Platform.OS === 'web' ? ({ boxShadow: `0 0 8px ${C.cyan}CC` } as any) : {}}
                  />
                )}
                <Icon size={22} color={isActive ? C.cyan : C.sub} strokeWidth={isActive ? 2.5 : 2} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ position: 'absolute', top: 16, right: 24, zIndex: 1000, pointerEvents: 'auto' }}>
        <ProfileDropdown />
      </View>
    </>
  );
}

/**
 * Mobile header for standalone stacks (currently just (admin)). Back button
 * routes to dashboard since admin has no bottom-tab context to "back" into.
 */
function StandaloneMobileHeader({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <View
      className="z-50 flex-row items-center justify-between w-full px-4 border-b border-brand-cyan/10"
      style={{
        backgroundColor: 'rgba(6, 11, 8, 0.85)',
        paddingTop: Platform.OS === 'ios' ? 54 : 40,
        paddingBottom: 14,
      }}
    >
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard'))}
          activeOpacity={0.8}
          className="items-center justify-center w-10 h-10 border rounded-2xl"
          style={{ borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}10` }}
        >
          <ArrowLeft size={18} color={C.cyan} />
        </TouchableOpacity>
        {title && (
          <Text className="text-[17px] font-extrabold" style={{ color: C.text }}>
            {title}
          </Text>
        )}
      </View>
      <ProfileDropdown />
    </View>
  );
}

export function AdaptiveLayout({ children, mobileTitle }: { children: React.ReactNode; mobileTitle?: string }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StandaloneMobileHeader title={mobileTitle} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: C.bg,
        backgroundImage: `radial-gradient(ellipse 100% 50% at 50% 0%, ${C.cyan}0D 0%, transparent 60%)`,
      }}
    >
      <Sidebar active={pathname} />
      <View className="flex-1" style={{ paddingLeft: 104 }}>
        {children}
      </View>
    </View>
  );
}