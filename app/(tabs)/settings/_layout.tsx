/**
 * app/(tabs)/settings/_layout.tsx
 * OpusHunter — Settings Stack Layout
 * 2026-07-04 — Added `documents` screen (former top-level Vault tab,
 * moved here — see documents.tsx header comment for why).
 */
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { C } from '../../../lib/theme';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: C.bg,
                    ...(Platform.OS === 'web' ? {
                        backgroundImage: [
                            `radial-gradient(ellipse 120% 80% at 50% 0%, ${C.cyan}12 0%, transparent 55%)`,
                            `radial-gradient(ellipse 80% 60% at 85% 100%, ${C.purple}0E 0%, transparent 55%)`,
                        ].join(', '),
                    } : {}),
                },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="security" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="profile" />
        </Stack>
    );
}