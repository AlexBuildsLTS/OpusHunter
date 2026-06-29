/**
 * app/_layout.tsx
 * OpusHunter — Root Layout
 * 2026-06-29
 *
 * - Auth guard: listens to onAuthStateChange, redirects accordingly
 * - Profile/role fetch on mount after auth
 * - Provides QueryClient, safe area, reanimated
 * - Splash screen management
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const mounted = useRef(false);

    const navigate = useCallback(async (session: any) => {
        if (!mounted.current) return;

        const inAuth = segments[0] === '(auth)';
        const inAdmin = segments[0] === '(admin)';
        const inTabs = segments[0] === '(tabs)';

        if (!session) {
            // Not logged in → send to auth
            if (!inAuth) router.replace('/(auth)/login');
            return;
        }

        // Has session — fetch profile for role guard
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (inAuth) {
                // Was on auth screen, redirect to dashboard
                router.replace('/(tabs)/dashboard');
            }
        } catch {
            // Profile not ready yet, still let them in — trigger will create it
            if (inAuth) router.replace('/(tabs)/dashboard');
        }
    }, [segments]);

    useEffect(() => {
        mounted.current = true;

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            navigate(session);
            SplashScreen.hideAsync().catch(() => { });
        });

        // Auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            navigate(session);
        });

        return () => {
            mounted.current = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: {
                                backgroundColor: 'transparent',
                            },
                            animation: Platform.OS === 'web' ? 'none' : 'fade',
                        }}
                    >
                        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
                        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                        <Stack.Screen name="(admin)" options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="(settings)" options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="+not-found" />
                    </Stack>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}