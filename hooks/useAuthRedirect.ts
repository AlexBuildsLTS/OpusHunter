import { useEffect, useRef } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../stores/authStore";

export const useAuthRedirect = () => {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const segments = useSegments() as string[];
  const router = useRouter();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (isRedirectingRef.current) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inJobGroup = segments[0] === "job";
    const inMonsterGroup = segments[0] === "monster";
    const inCoverLetterGroup = segments[0] === "cover-letter";
    const isAdminGroup = segments[0] === "admin";

    let target: string | null = null;

    if (session === null && !inAuthGroup) {
      target = "/(auth)/auth";
    } else if (session !== null && inAuthGroup) {
      target = "/(tabs)";
    } else if (
      session &&
      profile &&
      !profile.profile_complete &&
      !inAuthGroup &&
      segments[1] !== "profile-setup"
    ) {
      target = "/(auth)/profile-setup";
    } else if (session && profile?.profile_complete && inAuthGroup) {
      target = "/(tabs)";
    } else if (
      session &&
      !inAuthGroup &&
      !inTabsGroup &&
      !inJobGroup &&
      !inMonsterGroup &&
      !inCoverLetterGroup &&
      !isAdminGroup &&
      segments[1] !== "profile-setup"
    ) {
      target = "/(tabs)";
    }

    if (target) {
      isRedirectingRef.current = true;
      router.replace(target as any);
      setTimeout(() => {
        isRedirectingRef.current = false;
      }, 300);
    }
  }, [isHydrated, session, profile, segments, router]);
};
