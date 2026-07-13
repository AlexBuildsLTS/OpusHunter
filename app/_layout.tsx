/**
 * app/_layout.tsx
 * OpusHunter — Root Layout
 * 2026-07-02 — Mounted AmbientBackground (was previously nothing behind
 * the Stack
 * 2026-07-02 — FIX (routing collision): `(admin)` renamed to `admin`.
 */

import '../global.css';

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { PageContainer } from '../components/layout/PageContainer';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const mounted = useRef(false);

    const navigate = useCallback(async (session: any) => {
        if (!mounted.current) return;

        const inAuth = segments[0] === '(auth)';

        if (!session) {
            if (!inAuth) router.replace('/(auth)/login');
            return;
        }

        try {
            await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (inAuth) router.replace('/(tabs)/dashboard');
        } catch {
            if (inAuth) router.replace('/(tabs)/dashboard');
        }
    }, [segments]);

    useEffect(() => {
        mounted.current = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            navigate(session);
            SplashScreen.hideAsync().catch(() => { });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            navigate(session);

            // Web OAuth redirect completes here (not in login.tsx's native
            // branch). If Google returned offline-access tokens, hand them
            // to the edge function so auto-apply can send from this address
            // later. Native/mobile links inside login.tsx's handleGoogle
            // instead, since that flow never round-trips through this event
            // with the tokens attached in the same shape.
            if (event === 'SIGNED_IN' && Platform.OS === 'web') {
                const s = session as any;
                if (s?.provider_refresh_token) {
                    supabase.functions
                        .invoke('link-gmail-account', {
                            body: {
                                provider_token: s.provider_token ?? null,
                                provider_refresh_token: s.provider_refresh_token,
                            },
                        })
                        .catch(() => { /* non-fatal — Settings can retry the link */ });
                }
            }
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
                    <PageContainer className="bg-transparent" safeAreaTop={true}>
                        <AmbientBackground />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: 'transparent' },
                                animation: Platform.OS === 'web' ? 'slide_from_right' : 'fade',
                            }}
                        >
                            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                            <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
                            <Stack.Screen name="+not-found" />
                        </Stack>
                    </PageContainer>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}