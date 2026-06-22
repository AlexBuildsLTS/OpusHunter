import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function IndexScreen() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 bg-[rgba(0,212,255,0.1] items-center justify-center">
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return <Redirect href="/(tabs)/dashboard" />;
}