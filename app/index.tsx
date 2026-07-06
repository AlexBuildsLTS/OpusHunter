import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';
import type { Session } from '@supabase/supabase-js';

export default function IndexScreen() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: C.core, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
    );
  }

  // ✅ FIX P1-01: Gate redirect on session presence.
  // Previously this always redirected to dashboard regardless of auth state.
  if (session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
