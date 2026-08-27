import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { type Database } from '../types/database.types';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: any | null;
  session: any | null;
  profile: Profile | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: any | null) => void;
  setSession: (session: any | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      clearAuth: () => set({ user: null, session: null, profile: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => (Platform.OS === 'web' ? localStorage : {
        getItem: (name) => SecureStore.getItemAsync(name),
        setItem: (name, value) => SecureStore.setItemAsync(name, value),
        removeItem: (name) => SecureStore.deleteItemAsync(name),
      })),
    }
  )
);
