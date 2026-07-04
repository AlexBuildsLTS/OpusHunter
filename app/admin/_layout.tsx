/**
 * app/(admin)/_layout.tsx
 * OpusHunter — Admin Stack Guard
 * 2026-06-29
 *
 * Hard server-verified guard. Even if someone manually navigates to
 * /(admin)/users by typing the URL, this layout checks role on mount via
 * is_admin() RPC (SECURITY DEFINER, cannot be spoofed client-side) and
 * kicks non-admins back to the dashboard immediately.
 *
 * This is the SECOND line of defense — the FIRST is that the Admin Core
 * button/menu item is only ever rendered for role === 'admin' in
 * (tabs)/_layout.tsx's UserMenu and profile.tsx. Both must hold for the
 * panel to be truly admin-only.
 */
import { AdaptiveLayout } from '../../components/layout/AdaptiveLayout';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';


export default function AdminLayout() {
    const router = useRouter();
    const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

    useEffect(() => {
        let mounted = true;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (mounted) { setStatus('denied'); router.replace('/(auth)/login'); }
                return;
            }

            // is_admin() is SECURITY DEFINER — server-verified, not spoofable
            const { data: isAdmin, error } = await supabase.rpc('is_admin');

            if (!mounted) return;

            if (error || !isAdmin) {
                setStatus('denied');
                router.replace('/(tabs)/dashboard');
                return;
            }

            setStatus('allowed');
        })();

        return () => { mounted = false; };
    }, []);

    if (status === 'checking') {
        return (
            <View style={st.center}>
                <ActivityIndicator color={C.cyan} size="large" />
                <Text style={st.text}>Verifying admin access…</Text>
            </View>
        );
    }

    if (status === 'denied') {
        return (
            <View style={st.center}>
                <ShieldAlert size={32} color={C.pink} />
                <Text style={[st.text, { color: C.pink, marginTop: 12 }]}>Access denied. Redirecting…</Text>
            </View>
        );
    }

    if (status === 'allowed') {
        return (
            <AdaptiveLayout mobileTitle="Admin Core">
                <Stack screenOptions={{
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
                }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="users" />
                    <Stack.Screen name="api-keys" />
                </Stack>
            </AdaptiveLayout>
        );
    }

    return null;
}

const st = StyleSheet.create({
    center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 8 },
    text: { fontSize: 13, color: C.sub, fontWeight: '600' },
});