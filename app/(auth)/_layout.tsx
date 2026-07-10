/**
 * app/(auth)/_layout.tsx
 * OpusHunter — Auth Stack Layout
 *
 * Simple pass-through stack. Animation is handled at the root
 * _layout.tsx level to avoid double-transition flash.
 */

import { Stack } from 'expo-router';
import { C } from '../../lib/theme';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: C.core },
                animation: 'fade',
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}