/**
 * supabase/functions/oauth-link-email/index.ts
 * OpusHunter — Email Send-Account Linker (Gmail + Outlook).
 *
 * This is the missing piece auto-apply/index.ts depends on: it's what actually
 * creates the connected_email_accounts row with a refresh_token that has the
 * SEND scope (gmail.send / Mail.Send) — not the Supabase "Sign in with Google"
 * auth flow, which is a completely separate thing and cannot send mail.
 *
 * Flow (both providers):
 *   1. Client opens the provider's OAuth consent screen (via expo-auth-session
 *      or WebBrowser.openAuthSessionAsync) requesting the SEND scope, with
 *      redirectUri pointing back into the app.
 *   2. Provider redirects back with ?code=...
 *   3. Client POSTs { provider, code, redirectUri, userId } to THIS function.
 *   4. This function exchanges the code for tokens server-side (client secret
 *      never touches the client) and upserts connected_email_accounts.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET           (already used by auto-apply)
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET     (new — Azure AD app registration)
 *
 * Verified against schema.sql (2026-09-02): connected_email_accounts has
 * exactly (id, user_id, provider default 'gmail', email, refresh_token
 * not null, scopes text[] default '{}', is_primary_sender, connected_at,
 * created_at). No access_token, expires_at, or updated_at column — access
 * tokens are never persisted, only refresh_token (matches auto-apply/
 * index.ts, which already re-derives an access token per-send via
 * getGoogleAccessToken()). No unique constraint beyond the id primary key,
 * so this function does an explicit select-then-update-or-insert instead of
 * .upsert(onConflict:...) — that constraint doesn't exist in the DB.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

const GOOGLE_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const MICROSOFT_SEND_SCOPE = "Mail.Send offline_access";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Exchanges a Google authorization code for tokens with the gmail.send scope.
 */
async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const clientId =
    Deno.env.get("GOOGLE_CLIENT_ID") ||
    Deno.env.get("EXPO_PUBLIC_GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "server_misconfigured: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`google_token_exchange_failed: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GoogleTokenResponse;

  if (!data.scope || !data.scope.includes("gmail.send")) {
    // The user's consent screen was requested without the send scope, or they
    // partially denied it. Surface this clearly instead of storing a token
    // that will silently fail every send later.
    throw new Error(
      `missing_send_scope: token granted scopes "${data.scope || "none"}" ` +
        `do not include gmail.send — request the OAuth consent screen with ` +
        `scope="${GOOGLE_SEND_SCOPE}" and access_type=offline&prompt=consent`,
    );
  }

  if (!data.refresh_token) {
    // Google only returns a refresh_token on the FIRST consent, or when
    // prompt=consent is forced. If the user already granted this app access
    // before, a bare re-auth won't return one again.
    throw new Error(
      "no_refresh_token: Google did not return a refresh_token. The client " +
        "must request the consent screen with prompt=consent&access_type=offline " +
        "to guarantee one is issued.",
    );
  }

  return data;
}

/**
 * Fetches the authenticated Google user's email address using the fresh access token.
 */
async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("failed_to_fetch_google_userinfo");
  const data = await res.json();
  if (!data.email) throw new Error("google_userinfo_missing_email");
  return data.email as string;
}

/**
 * Exchanges a Microsoft authorization code for tokens with the Mail.Send scope.
 */
async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string,
): Promise<MicrosoftTokenResponse> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "server_misconfigured: MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET not set",
    );
  }

  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: MICROSOFT_SEND_SCOPE,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `microsoft_token_exchange_failed: ${errText.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as MicrosoftTokenResponse;

  if (!data.scope || !data.scope.toLowerCase().includes("mail.send")) {
    throw new Error(
      `missing_send_scope: token granted scopes "${data.scope || "none"}" ` +
        `do not include Mail.Send`,
    );
  }

  if (!data.refresh_token) {
    throw new Error(
      "no_refresh_token: Microsoft did not return a refresh_token. Ensure " +
        "offline_access is included in the requested scope.",
    );
  }

  return data;
}

/**
 * Fetches the authenticated Microsoft user's email address via Graph.
 */
async function fetchMicrosoftEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("failed_to_fetch_microsoft_profile");
  const data = await res.json();
  const email = data.mail || data.userPrincipalName;
  if (!email) throw new Error("microsoft_profile_missing_email");
  return email as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Require a real logged-in user — never trust a client-supplied userId alone
    const jwtUser = await verifyJwt(req);
    if (!jwtUser) {
      return Response.json(
        { error: "unauthorized", message: "Missing or invalid session" },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider || "").toLowerCase();
    const code = body.code as string | undefined;
    const redirectUri = body.redirectUri as string | undefined;
    const setPrimary = body.setPrimary !== false; // default true

    if (!code || !redirectUri) {
      return Response.json(
        {
          error: "missing_fields",
          message: "Missing required fields: code, redirectUri",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    if (provider !== "gmail" && provider !== "outlook") {
      return Response.json(
        {
          error: "invalid_provider",
          message: 'provider must be "gmail" or "outlook"',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const userId = jwtUser.userId;

    let email: string;
    let refreshToken: string;
    let accessToken: string;
    let expiresIn: number;
    let grantedScope: string;

    if (provider === "gmail") {
      const tokens = await exchangeGoogleCode(code, redirectUri);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token as string;
      expiresIn = tokens.expires_in;
      grantedScope = tokens.scope;
      email = await fetchGoogleEmail(accessToken);
    } else {
      const tokens = await exchangeMicrosoftCode(code, redirectUri);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token as string;
      expiresIn = tokens.expires_in;
      grantedScope = tokens.scope;
      email = await fetchMicrosoftEmail(accessToken);
    }

    // 2. If this account is being set as primary sender, unset any existing
    //    primary for this user first (only one primary sender at a time).
    if (setPrimary) {
      await supabase
        .from("connected_email_accounts")
        .update({ is_primary_sender: false })
        .eq("user_id", userId);
    }

    // 3. No unique constraint exists on (user_id, provider, email) in the DB,
    //    so upsert(onConflict:...) isn't usable here — do an explicit
    //    select-then-update-or-insert instead. scopes is a text[] column;
    //    split the OAuth scope string on whitespace to match.
    const scopesArray = grantedScope.split(/\s+/).filter(Boolean);

    const { data: existingRow } = await supabase
      .from("connected_email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("email", email)
      .maybeSingle();

    let savedAccount: { id: string } | null = null;

    if (existingRow) {
      const { data, error: updateError } = await supabase
        .from("connected_email_accounts")
        .update({
          refresh_token: refreshToken,
          scopes: scopesArray,
          is_primary_sender: setPrimary,
        })
        .eq("id", existingRow.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("connected_email_accounts update failed:", updateError);
        throw new Error(`storage_failed: ${updateError.message}`);
      }
      savedAccount = data;
    } else {
      const { data, error: insertError } = await supabase
        .from("connected_email_accounts")
        .insert({
          user_id: userId,
          provider,
          email,
          refresh_token: refreshToken,
          scopes: scopesArray,
          is_primary_sender: setPrimary,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("connected_email_accounts insert failed:", insertError);
        throw new Error(`storage_failed: ${insertError.message}`);
      }
      savedAccount = data;
    }

    // accessToken/expiresIn are intentionally not persisted — this table has
    // no column for them, and auto-apply/index.ts already re-derives a fresh
    // access token per send from refresh_token via getGoogleAccessToken().
    void accessToken;
    void expiresIn;

    // 4. Mirror onto profiles.gmail_linked_email for quick display, Google only
    //    (matches the existing column name used elsewhere in the codebase).
    if (provider === "gmail") {
      await supabase
        .from("profiles")
        .update({ gmail_linked_email: email })
        .eq("id", userId);
    }

    return Response.json(
      {
        success: true,
        provider,
        email,
        is_primary_sender: setPrimary,
        scope: grantedScope,
        account_id: savedAccount?.id ?? null,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("oauth-link-email error:", error);
    const message = error instanceof Error ? error.message : String(error);

    // Surface the specific failure code as the top-level error so the client
    // can show a precise message (e.g. "missing_send_scope" → re-trigger
    // consent with the right scope) instead of a generic failure toast.
    const knownCode = message.split(":")[0];

    return Response.json(
      { error: knownCode || "link_failed", message },
      { status: 500, headers: corsHeaders },
    );
  }
});
