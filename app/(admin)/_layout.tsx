/**
 * app/(admin)/_layout.tsx
 * OpusHunter — Admin Panel Layout
 * Role-gated: redirects non-admin users to dashboard immediately.
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AdminLayout() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace('/(auth)/login'); return; }
            const { data: profile } = await supabase
                .from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role !== 'admin') {
                router.replace('/(tabs)/dashboard');
                return;
            }
            setChecking(false);
        })();
    }, []);

    if (checking) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0A1419', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#00D4FF" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A1419' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="api-keys" />
            <Stack.Screen name="users" />
        </Stack>
    );
}