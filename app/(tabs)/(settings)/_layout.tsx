/**
 * app/(tabs)/settings/_layout.tsx
 * OpusHunter — Settings Stack Layout
 * 2026-06-29
 */
import { Stack } from 'expo-router';
import { C } from '../../../lib/theme';

export default function SettingsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: 'transparent',
                },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="security" />
        </Stack>
    );
}