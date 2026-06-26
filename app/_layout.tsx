/**
 * app/_layout.tsx
 * OpusHunter — Root Layout
 *
 * FIXES vs previous version:
 *   - onAuthStateChange now redirects to login on SIGNED_OUT
 *   - React error boundary wraps QueryClientProvider
 *   - SafeAreaProvider added for proper insets on all platforms
 */

import React, { useEffect, Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import '../global.css';

// ── Error Boundary ────────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error) {
        console.error('[AppErrorBoundary]', error);
    }
    render() {
        if (this.state.hasError) {
            return (
                <View style={eb.container}>
                    <Text style={eb.title}>Something went wrong</Text>
                    <Text style={eb.message}>{this.state.error?.message}</Text>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false, error: null })}
                        style={eb.btn}
                    >
                        <Text style={eb.btnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const eb = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A1419', alignItems: 'center', justifyContent: 'center', padding: 32 },
    title: { fontSize: 18, fontWeight: '800', color: '#E8436A', marginBottom: 10 },
    message: { fontSize: 13, color: 'rgba(216,228,236,0.5)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)' },
    btnText: { color: '#00D4FF', fontWeight: '700', fontSize: 13 },
});

// ── Auth listener component ───────────────────────────────────────────────────

function AuthListener() {
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.replace('/(auth)/login');
            }
            if (event === 'SIGNED_IN' && session) {
                // Only redirect to dashboard if currently on auth screens
                const inAuthGroup = segments[0] === '(auth)';
                if (inAuthGroup) {
                    router.replace('/(tabs)/dashboard');
                }
            }
            if (event === 'TOKEN_REFRESHED') {
                // Silent — token auto-refreshed, no action needed
            }
        });
        return () => subscription.unsubscribe();
    }, [router, segments]);

    return null;
}

// ── Root Layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0A1419' }}>
            <SafeAreaProvider>
                <AppErrorBoundary>
                    <QueryClientProvider client={queryClient}>
                        <AuthListener />
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="+not-found" />
                        </Stack>
                    </QueryClientProvider>
                </AppErrorBoundary>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}