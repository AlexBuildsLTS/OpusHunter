/**
 * components/layout/AppHeader.tsx
 * OpusHunter — Unified Screen Header
 * 2026-07-01
 *
 * Replaces `components/layout/MobileHeader`, which was imported by
 * profile.tsx, dashboard.tsx, vault.tsx and configure.tsx but never existed
 * anywhere in the repo — every one of those screens would fail to build.
 *
 * Usage — same call site the old (missing) component used, so the fix is a
 * one-line import swap in each screen:
 *
 *   import { AppHeader } from '../../components/layout/AppHeader';
 *   ...
 *   <AppHeader title="Dashboard" />
 *
 * Behavior:
 *   - Mobile (native or narrow web): brand icon top-left (taps → dashboard),
 *     optional title, ProfileDropdown top-right.
 *   - Desktop web (≥768px): the left sidebar in app/(tabs)/_layout.tsx
 *     already shows the brand icon, so the header only renders the page
 *     title + ProfileDropdown top-right to avoid a duplicate logo.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../../lib/theme';
import { ProfileDropdown } from '../ui/ProfileDropdown';

interface AppHeaderProps {
    /** Page title shown next to (mobile) or instead of (desktop) the logo. */
    title?: string;
    /** Optional small subtitle under the title, desktop only. */
    subtitle?: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;

    return (
        <View
            className="flex-row items-center justify-between w-full"
            style={{
                paddingTop: isDesktop ? 8 : Platform.OS === 'ios' ? 8 : 4,
                paddingBottom: 16,
            }}
        >
            <View className="flex-row items-center gap-3">
                {!isDesktop && (
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/dashboard')}
                        activeOpacity={0.8}
                        className="items-center justify-center w-10 h-10 border rounded-2xl"
                        style={{ borderColor: `${C.cyan}30`, backgroundColor: `${C.cyan}10` }}
                    >
                        <Image source={require('../../assets/icon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    </TouchableOpacity>
                )}

                {title && (
                    <View>
                        <Text className="text-[19px] font-extrabold" style={{ color: C.text, letterSpacing: -0.3 }}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text className="text-[11px]" style={{ color: C.sub }}>
                                {subtitle}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            <ProfileDropdown />
        </View>
    );
}