/**
 * hooks/useGmail.ts
 * OpusHunter — Gmail Integration Hook.
 * If user signed up with Google OAuth: Gmail is ALREADY linked (automatic).
 * If user signed up with Email/Password: Optionally link Gmail as sender.
 * Uses Supabase OAuth for the optional linking flow.
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export function useGmail() {
  const { user, profile, setProfile } = useAuthStore();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth request (only for optional linking when user used email/password)
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: "opushunter",
      path: "auth/callback",
    }),
    scopes: ["openid", "email", "profile"],
  });

  /**
   * If user signed up with Google OAuth, no action needed.
   * If user signed up with email/password, they can link a Gmail.
   */
  const isGoogleUser = user?.app_metadata?.provider === "google";

  const linkGmail = async () => {
    if (isGoogleUser) {
      // Already linked automatically
      return {
        success: true,
        message: "Gmail already linked via Google OAuth",
      };
    }

    if (!request) return { success: false, message: "OAuth request not ready" };

    setLinking(true);
    setError(null);

    try {
      const result = await promptAsync();
      if (result.type === "success") {
        // Save the linked email in profiles table
        const email = result.params.email;
        if (email && profile) {
          await supabase
            .from("profiles")
            .update({ gmail_linked_email: email })
            .eq("id", profile.id);
          setProfile({ ...profile, gmail_linked_email: email });
        }
        return { success: true, message: "Gmail linked successfully" };
      }
      return { success: false, message: "Gmail linking cancelled" };
    } catch (err: any) {
      setError(err.message || "Failed to link Gmail");
      return { success: false, message: err.message };
    } finally {
      setLinking(false);
    }
  };

  return { isGoogleUser, linkGmail, linking, error };
}
