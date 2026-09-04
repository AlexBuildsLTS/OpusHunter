/**
 * hooks/useGmail.ts
 * OpusHunter — Gmail Integration Hook.
 *
 * REWRITE NOTE (this file was previously disconnected from the backend):
 * The old version requested scopes ["openid","email","profile"] — missing
 * gmail.send entirely — and read `result.params.email` directly off the
 * OAuth response to save into profiles.gmail_linked_email. That field does
 * not exist on Google's authorization response (only `code` does), so the
 * old flow silently did nothing while reporting success.
 *
 * This version:
 *   1. Requests the authorization CODE (not implicit token) via
 *      responseType: Code, with PKCE explicitly OFF — the oauth-link-email
 *      edge function exchanges the code using a confidential client_secret
 *      server-side and does not send a code_verifier, so a PKCE-flavored
 *      auth request would fail token exchange with invalid_grant.
 *   2. Requests gmail.send + gmail.readonly (to actually send mail later)
 *      PLUS openid + userinfo.email (required for the edge function's
 *      userinfo lookup step — gmail.* scopes alone do not grant that).
 *   3. Sends the code to supabase.functions.invoke("oauth-link-email"),
 *      which does the real token exchange + encrypted storage into
 *      connected_email_accounts. That is the actual source of truth —
 *      profiles.gmail_linked_email here is kept only as a fast-read mirror
 *      for UI display, updated from the edge function's verified response.
 *
 * "If user signed up with Google OAuth, Gmail is already linked" is FALSE
 * for sending purposes: Supabase Auth's Google sign-in scope is just
 * openid/email/profile for login, never gmail.send. That still requires
 * this same linking flow. Kept the isGoogleUser flag for UI copy only —
 * it no longer short-circuits the actual linking requirement.
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri, ResponseType } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const GMAIL_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function useGmail() {
  const { user, profile, setProfile } = useAuthStore();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({
    scheme: "opushunter",
    path: "oauth/callback",
  });

  // Authorization CODE flow, PKCE disabled — must match how the
  // oauth-link-email edge function performs its token exchange (client_secret,
  // no code_verifier). If this client ID is a Google "Web application" type,
  // this is correct. If it's an "iOS"/"Android" native type instead, Google
  // will reject the client_secret exchange server-side regardless of PKCE —
  // in that case the fix is on the Google Cloud Console client type, not here.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri,
    scopes: GMAIL_SCOPES,
    responseType: ResponseType.Code,
    usePKCE: false,
    extraParams: {
      // Forces Google to always return a refresh_token, even if this
      // isn't the user's first consent — without this, re-linking after
      // a revoke can silently omit refresh_token and the edge function's
      // `if (!tokens.refresh_token) return null` check fails it.
      access_type: "offline",
      prompt: "consent",
    },
  });

  const isGoogleUser = user?.app_metadata?.provider === "google";

  const linkGmail = async () => {
    if (!user) {
      return { success: false, message: "Not signed in" };
    }

    if (!request) {
      return { success: false, message: "OAuth request not ready" };
    }

    setLinking(true);
    setError(null);

    try {
      const result = await promptAsync();

      if (result.type !== "success") {
        const message =
          result.type === "cancel" || result.type === "dismiss"
            ? "Gmail linking cancelled"
            : `Gmail linking failed (${result.type})`;
        return { success: false, message };
      }

      const authCode = result.params.code;
      if (!authCode) {
        setError("No authorization code returned by Google");
        return {
          success: false,
          message: "No authorization code returned by Google",
        };
      }

      // Hand the code to the edge function — THIS is where the real token
      // exchange, scope verification, and encrypted storage happens.
      const { data, error: fnError } = await supabase.functions.invoke(
        "oauth-link-email",
        {
          body: {
            userId: user.id,
            provider: "google",
            authCode,
            redirectUri,
          },
        },
      );

      if (fnError) {
        let detailedMsg = fnError.message || "Gmail linking failed";
        if ("context" in fnError && fnError.context) {
          try {
            const body = await (fnError as any).context.json();
            if (body?.message) detailedMsg = body.message;
          } catch {
            // fall back to fnError.message
          }
        }
        setError(detailedMsg);
        return { success: false, message: detailedMsg };
      }

      if (!data?.success || !data?.email) {
        const message = data?.message || "Gmail linking did not complete";
        setError(message);
        return { success: false, message };
      }

      // Mirror the verified email onto the profile for fast UI reads.
      // connected_email_accounts (via the edge function) remains the
      // source of truth for actually sending mail.
      if (profile) {
        await supabase
          .from("profiles")
          .update({ gmail_linked_email: data.email })
          .eq("id", profile.id);
        setProfile({ ...profile, gmail_linked_email: data.email });
      }

      return {
        success: true,
        message: data.message || "Gmail linked successfully",
      };
    } catch (err: any) {
      const message = err?.message || "Failed to link Gmail";
      setError(message);
      return { success: false, message };
    } finally {
      setLinking(false);
    }
  };

  return { isGoogleUser, linkGmail, linking, error };
}
