/**
 * app/(settings)/_layout.tsx
 * OpusHunter — Settings Stack Layout
 * Accessible from profile screen via router.push('/(settings)')
 */
import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0A1419' },
                animation: Platform.OS === 'ios' ? 'slide_from_right' : 'none',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="security" />
        </Stack>
    );
}

import { Platform } from 'react-native';