import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isHydrated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setHydrated: (hydrated: boolean) => void;
  setLoading: (loading: boolean) => void;

  initializeAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

let authListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isHydrated: false,
  isLoading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
  setLoading: (loading) => set({ isLoading: loading }),

  initializeAuth: async () => {
    if (authListenerRegistered) {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, isHydrated: true, isLoading: false });
      return;
    }
    authListenerRegistered = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null });

      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          set({ profile });
        } else {
          set({ profile: null });
        }
      });

      if (session?.user) {
        await get().refreshProfile();
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
    } finally {
      set({ isHydrated: true, isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    set({ profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
