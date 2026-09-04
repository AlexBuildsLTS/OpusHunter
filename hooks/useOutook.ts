/**
 * hooks/useOutlook.ts
 * OpusHunter — Outlook/Microsoft 365 Integration Hook.
 *
 * Did not previously exist — oauth-link-email/index.ts already has a fully
 * implemented "outlook" provider branch (exchangeOutlookToken, Mail.Send
 * scope check, Microsoft Graph /me lookup) but nothing on the frontend
 * called it. This is that missing entry point, built on the same pattern
 * as the corrected useGmail.ts:
 *   1. Authorization CODE flow (not implicit), PKCE off — the edge
 *      function exchanges the code with a confidential client_secret and
 *      sends no code_verifier, so a PKCE-flavored request would fail
 *      token exchange with invalid_grant.
 *   2. Requests Mail.Send (to actually send mail later) PLUS User.Read
 *      (required for the edge function's Microsoft Graph /me lookup step
 *      — Mail.Send alone does not grant access to /me).
 *   3. Sends the code to supabase.functions.invoke("oauth-link-email")
 *      with provider: "outlook" — that edge function branch is already
 *      correct and does not need changes.
 *
 * Uses expo-auth-session's generic AuthRequest (not a dedicated Microsoft
 * provider package — expo-auth-session doesn't ship one) against the
 * v2.0 common-tenant endpoints, matching exchangeOutlookToken's
 * "https://login.microsoftonline.com/common/oauth2/v2.0/token" call.
 *
 * REQUIRES: your Azure App Registration's client ID must be a
 * "Web" platform registration with a client secret configured — same
 * constraint as the Google Web client, for the same reason (server-side
 * client_secret exchange, no code_verifier sent). A "Mobile and desktop
 * applications" (public client) registration has no secret and will be
 * rejected by the edge function's token exchange regardless of this code.
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import * as WebBrowser from "expo-web-browser";
import { AuthRequest, ResponseType, makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const OUTLOOK_SCOPES = ["openid", "offline_access", "User.Read", "Mail.Send"];

const OUTLOOK_DISCOVERY = {
  authorizationEndpoint:
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

export function useOutlook() {
  const { user, profile, setProfile } = useAuthStore();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({
    scheme: "opushunter",
    path: "oauth/callback",
  });

  const linkOutlook = async () => {
    if (!user) {
      return { success: false, message: "Not signed in" };
    }

    const clientId = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID;
    if (!clientId) {
      const message =
        "EXPO_PUBLIC_AZURE_CLIENT_ID is not set — check your .env";
      setError(message);
      return { success: false, message };
    }

    setLinking(true);
    setError(null);

    try {
      const authRequest = new AuthRequest({
        clientId,
        redirectUri,
        scopes: OUTLOOK_SCOPES,
        responseType: ResponseType.Code,
        usePKCE: false,
        extraParams: {
          // Ensures Microsoft returns a refresh_token even on re-consent —
          // without this, re-linking after a revoke can omit it and the
          // edge function's `if (!tokens.refresh_token) return null` fails.
          prompt: "consent",
        },
      });

      const result = await authRequest.promptAsync(OUTLOOK_DISCOVERY);

      if (result.type !== "success") {
        const message =
          result.type === "cancel" || result.type === "dismiss"
            ? "Outlook linking cancelled"
            : `Outlook linking failed (${result.type})`;
        return { success: false, message };
      }

      const authCode = result.params.code;
      if (!authCode) {
        setError("No authorization code returned by Microsoft");
        return {
          success: false,
          message: "No authorization code returned by Microsoft",
        };
      }

      // Existing edge function branch — no changes needed there.
      const { data, error: fnError } = await supabase.functions.invoke(
        "oauth-link-email",
        {
          body: {
            userId: user.id,
            provider: "outlook",
            authCode,
            redirectUri,
          },
        },
      );

      if (fnError) {
        let detailedMsg = fnError.message || "Outlook linking failed";
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
        const message = data?.message || "Outlook linking did not complete";
        setError(message);
        return { success: false, message };
      }

      // Mirror onto profile for fast UI reads — connected_email_accounts
      // (via the edge function) remains the source of truth for sending.
      if (profile) {
        await supabase
          .from("profiles")
          .update({ outlook_linked_email: data.email })
          .eq("id", profile.id);
        setProfile({ ...profile, outlook_linked_email: data.email });
      }

      return {
        success: true,
        message: data.message || "Outlook linked successfully",
      };
    } catch (err: any) {
      const message = err?.message || "Failed to link Outlook";
      setError(message);
      return { success: false, message };
    } finally {
      setLinking(false);
    }
  };

  return { linkOutlook, linking, error };
}
