/**
 * components/layout/AdaptiveLayout.tsx
 * OpusHunter — Shared Desktop Sidebar + Standalone-Stack Mobile Header
 * 2026-07-02
 * 2026-07-04 — Removed "Vault" from primary nav. It was a single-purpose
 * upload screen (CV + certifications, nothing else) sitting in the same
 * three-item nav as Dashboard and Configure, which get used every session —
 * a permanent slot for a screen someone visits maybe twice ever doesn't
 * earn its place next to daily-use screens. Moved to Settings → Documents
 * (see app/(tabs)/settings/documents.tsx); still exists, still fully
 * functional, just reachable in one tap from Settings instead of occupying
 * primary nav real estate.
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
import { ArrowLeft } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { ProfileDropdown } from '../ui/ProfileDropdown';
import { NAV_ITEMS } from '../../lib/navConfig';
import type { Database as DB } from '../../types/database.types';


type ProfileRow = DB['public']['Tables']['profiles']['Row'];

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
        className="absolute left-1 top-12 bottom-12 w-[90px] border border-brand-cyan/12 rounded-4xl items-center py-6 z-50 shadow-1xl shadow-brand-cyan/12 overflow-hidden"
        style={{ backgroundColor: C.bg }}
      >
        <View
          pointerEvents="none"
          className="absolute inset-0 overflow-hidden rounded-4xl"
          style={{ backgroundImage: `linear-gradient(to bottom, ${C.cyan}14, ${C.purple}0A)` }}
        />

        <TouchableOpacity
          className="w-[48px] h-[48px] rounded-2xl border border-brand-cyan/40 items-center justify-center mb-12 shadow-lg shadow-brand-cyan/40"
          style={{ backgroundColor: `${C.cyan}18` }}
          onPress={() => router.push('/(tabs)/dashboard')}
          activeOpacity={0.8}
        >
          <Image source={require('../../assets/icon.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center flex-1 w-full gap-1">
          {NAV_ITEMS.map(({ name, label, Icon }) => {
            const isActive = active?.includes?.(name) ?? false;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => router.push(`/(tabs)/${name}` as any)}
                activeOpacity={0.8}
                className={`w-[78px] py-3.5 rounded-2xl items-center justify-center gap-3.5 relative transition-colors duration-200 ${isActive ? 'bg-brand-cyan/10' : 'hover:bg-white/[0.05]'
                  }`}
              >
                {isActive && (
                  <View
                    className="absolute left-0 top-4 bottom-4 w-[2px] rounded-r-md bg-brand-cyan"
                    style={Platform.OS === 'web' ? ({ boxShadow: `0 0 1px ${C.cyan}CC` } as any) : {}}
                  />
                )}
                <Icon size={20} color={isActive ? C.cyan : C.sub} strokeWidth={isActive ? 2.5 : 2.5} />
                <Text
                  style={{
                    fontSize: 9, fontWeight: '800', letterSpacing: 0.8,
                    color: isActive ? C.cyan : C.sub,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Text>
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
      className="z-50 flex-row items-center justify-between w-full px-4 border-b border-brand-cyan/0"
      style={{
        backgroundColor: C.core,
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
        ...(Platform.OS === 'web' ? ({
          backgroundImage: [
            `radial-gradient(ellipse 120% 80% at 50% 0%, ${C.cyan}12 0%, transparent 55%)`,
            `radial-gradient(ellipse 80% 60% at 85% 100%, ${C.purple}0E 0%, transparent 55%)`,
          ].join(', '),
        } as any) : {}),
      }}
    >
      <Sidebar active={pathname} />
      <View className="flex-1" style={{ paddingLeft: 104 }}>
        {children}
      </View>
    </View>
  );
}