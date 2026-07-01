/**
 * app/(settings)/_layout.tsx
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
                    backgroundColor: C.bg,
                    backgroundImage: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(0, 212, 255, 0.05) 0%, transparent 60%)',
                },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="security" />
        </Stack>
    );
}