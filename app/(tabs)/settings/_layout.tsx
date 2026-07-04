/**
 * app/(tabs)/settings/_layout.tsx
 * OpusHunter — Settings Stack Layout
 * 2026-07-04 — Added `documents` screen (former top-level Vault tab,
 * moved here — see documents.tsx header comment for why).
 */
import { Stack } from 'expo-router';
import { C } from '../../../lib/theme';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: C.bg,
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