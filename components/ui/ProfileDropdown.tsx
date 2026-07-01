/**
 * components/ui/ProfileDropdown.tsx
 * OpusHunter — User Profile Menu
 * 2026-07-01
 *
 * Rebuilt from scratch. The previous version imported `useAuthStore` from
 * `store/useAuthStore`, which does not exist anywhere in this repo (the only
 * store is `usePipelineStore`), and linked to routes that don't exist in
 * this app's actual router structure (`/settings/profile`, `/admin`,
 * `/(auth)/sign-in`). It would throw on import — which is almost certainly
 * why it was never wired into any screen.
 *
 * This version:
 *   - Fetches the profile via the SAME react-query key ('my_profile_full')
 *     used in app/(tabs)/profile.tsx, so the cache is shared and this never
 *     triggers an extra network round-trip if the profile screen has
 *     already loaded.
 *   - Uses ROLE_CFG from lib/theme.ts — the single source of truth for
 *     role colors — instead of a second, divergent color map.
 *   - Points at real routes: /(tabs)/profile, /(tabs)/(settings),
 *     /(admin), /(auth)/login.
 *   - Built with NativeWind + GlassCard so it matches the rest of the
 *     design system instead of being its own one-off StyleSheet.
 */

import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import {
  User,
  Settings,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C, ROLE_CFG, type RoleName } from '../../lib/theme';
import { GlassCard } from './GlassCard';
import type { Database } from '../../types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? '??';
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem = React.memo(({ icon: Icon, label, onPress, danger }: MenuItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${danger ? 'active:bg-brand-pink/10' : 'active:bg-white/5'
      }`}
  >
    <Icon size={16} color={danger ? C.pink : C.cyan} />
    <Text
      className="text-[11px] font-extrabold uppercase tracking-widest"
      style={{ color: danger ? C.pink : C.text }}
    >
      {label}
    </Text>
  </TouchableOpacity>
));
MenuItem.displayName = 'MenuItem';

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile } = useQuery<ProfileRow | null>({
    queryKey: ['my_profile_full'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const role = (profile?.role ?? 'member') as RoleName;
  const roleCfg = ROLE_CFG[role];
  const initials = getInitials(profile?.full_name, profile?.email);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path as any);
    },
    [router],
  );

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await supabase.auth.signOut();
    qc.clear();
    router.replace('/(auth)/login');
  }, [router, qc]);

  return (
    <View style={{ zIndex: 1000 }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
        className="items-center justify-center overflow-hidden border-2 rounded-full h-11 w-11"
        style={{
          borderColor: roleCfg.color,
          backgroundColor: C.core,
          ...(Platform.OS === 'web'
            ? ({ boxShadow: `0 0 14px ${roleCfg.color}55` } as any)
            : { shadowColor: roleCfg.color, shadowOpacity: 0.5, shadowRadius: 10 }),
        }}
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={{ color: roleCfg.color, fontSize: 14, fontWeight: '800' }}>{initials}</Text>
        )}
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          />

          <Animated.View
            entering={FadeInDown.duration(220).springify().damping(20)}
            exiting={FadeOutUp.duration(150)}
            style={{ position: 'absolute', top: 54, right: 0, width: 260, zIndex: 1000 }}
          >
            <GlassCard tint={role === 'admin' ? 'pink' : role === 'premium' ? 'amber' : 'purple'} padding="sm" glow>
              <View className="px-2 pt-1 mb-2">
                <Text numberOfLines={1} className="text-[15px] font-extrabold" style={{ color: C.text }}>
                  {profile?.full_name || 'Your account'}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-[11px]" style={{ color: C.sub }}>
                  {profile?.email}
                </Text>
                <View
                  className="mt-2 self-start rounded-lg border px-2.5 py-1"
                  style={{ backgroundColor: roleCfg.bg, borderColor: roleCfg.border }}
                >
                  <Text className="text-[9px] font-black tracking-widest" style={{ color: roleCfg.color }}>
                    {roleCfg.label}
                  </Text>
                </View>
              </View>

              <View className="h-px my-1" style={{ backgroundColor: C.border }} />

              <MenuItem icon={User} label="Profile" onPress={() => go('/(tabs)/profile')} />
              <MenuItem icon={Settings} label="Settings" onPress={() => go('/(tabs)/(settings)')} />

              {role === 'admin' && (
                <>
                  <View className="h-px my-1" style={{ backgroundColor: C.border }} />
                  <MenuItem icon={ShieldCheck} label="Admin Core" onPress={() => go('/(admin)/')} />
                </>
              )}

              <View className="h-px my-1" style={{ backgroundColor: C.border }} />
              <MenuItem icon={LogOut} label="Sign Out" onPress={handleSignOut} danger />
            </GlassCard>
          </Animated.View>
        </>
      )}
    </View>
  );
}