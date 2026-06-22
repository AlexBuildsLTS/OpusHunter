/**
 * app/(auth)/_layout.tsx
 * OpusHunter — Auth Stack Layout
 *
 * Simple pass-through stack. Animation is handled at the root
 * _layout.tsx level to avoid double-transition flash.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#020205' },
                animation: 'none',
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}