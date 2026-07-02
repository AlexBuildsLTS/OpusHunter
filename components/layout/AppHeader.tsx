/**
 * components/layout/AppHeader.tsx
 * OpusHunter — Unified Screen Header
 * 2026-07-02
 *
 * FIXED: was styled with a hardcoded generic `slate-950`/`slate-800`
 * gradient — completely disconnected from the violet/emerald palette, the
 * "ugly header that doesn't match" the rest of the app.
 * FIXED: configure.tsx renders this INSIDE the (tabs) mobile layout, which
 * already draws its own fixed logo (top-left) + ProfileDropdown (top-right)
 * — AppHeader was drawing a second logo + second dropdown on top of that.
 * New `showIdentity` prop (default true) lets screens nested inside
 * app/(tabs)/_layout.tsx opt out of the logo/dropdown it already renders,
 * while standalone stacks like (admin) — which get no identity bar
 * otherwise on mobile — keep the default and still get one.
 * On desktop, the sidebar (see AdaptiveLayout/Sidebar) always owns the
 * ProfileDropdown now, so AppHeader never renders its own there.
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
    /**
     * Set false when the parent layout already renders the logo (mobile)
     * elsewhere on screen — e.g. any screen inside app/(tabs)/_layout.tsx.
     * Default true for standalone stacks (e.g. (admin)) that render no
     * identity bar of their own.
     */
    showIdentity?: boolean;
}

export function AppHeader({ title, subtitle, showIdentity = true }: AppHeaderProps) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;

    return (
        <View
            className="z-50 flex-row items-center justify-between w-full px-5 border-b border-brand-cyan/10"
            style={{
                backgroundColor: 'rgba(6, 11, 8, 0.72)',
                ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px) saturate(160%)', position: 'sticky', top: 0 } as any) : {}),
                paddingTop: isDesktop ? 12 : Platform.OS === 'ios' ? 12 : 8,
                paddingBottom: 14,
            }}
        >
            <View className="flex-row items-center gap-3">
                {!isDesktop && showIdentity && (
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

            {/* Desktop: sidebar already owns the ProfileDropdown — never duplicate it here. */}
            {!isDesktop && showIdentity && <ProfileDropdown />}
        </View>
    );
}