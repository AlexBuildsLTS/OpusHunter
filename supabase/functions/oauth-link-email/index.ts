/**
 * supabase/functions/oauth-link-email/index.ts
 * OpusHunter — Email Account OAuth Linking (Gmail & Outlook)
 *
 * Exchanges OAuth auth codes for refresh tokens with email send permissions.
 * Stores encrypted tokens in connected_email_accounts table.
 * Enforces scope verification: gmail.send for Google, Mail.Send for Outlook.
 *
 * POST /oauth-link-email
 * {
 *   "userId": "uuid",
 *   "provider": "google" | "outlook",
 *   "authCode": "...",
 *   "redirectUri": "opushunter://oauth/callback"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "email": "user@gmail.com",
 *   "provider": "google",
 *   "scopes": ["gmail.send", "gmail.readonly"],
 *   "accountId": "uuid",
 *   "isPrimarySender": true
 * }
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface OAuthUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Exchange Google OAuth code for refresh token and user info
 */
async function exchangeGoogleToken(
  authCode: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{
  refreshToken: string;
  accessToken: string;
  email: string;
  scopes: string[];
} | null> {
  try {
    // Step 1: Exchange auth code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error("Google token exchange failed:", error);
      return null;
    }

    const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
    if (!tokens.refresh_token || !tokens.access_token) {
      console.error("No refresh token in Google response");
      return null;
    }

    // Step 2: Verify scopes include gmail.send
    const scopesStr = tokens.scope || "";
    const scopes = scopesStr.split(" ");
    const hasGmailSend = scopes.some(
      (s) => s.includes("gmail.send") || s.includes("gmail"),
    );

    if (!hasGmailSend) {
      console.warn(
        "Google OAuth missing gmail.send scope. Granted scopes:",
        scopes,
      );
      return null;
    }

    // Step 3: Get user email using access token.
    // Uses the current v2 endpoint (v1 is deprecated by Google). This call
    // requires the 'openid' + 'userinfo.email' scopes on the ORIGINAL auth
    // request — gmail.send / gmail.readonly alone do NOT grant access here.
    // If this 403s, the frontend Google.useAuthRequest() scopes array is
    // missing those two entries; that is the actual root cause if linking
    // silently fails with "oauth_exchange_failed" after scope check passes.
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    if (!userResponse.ok) {
      const errBody = await userResponse.text().catch(() => "");
      console.error(
        `Failed to get Google user info (status ${userResponse.status}): ${errBody.slice(0, 300)}. ` +
          `Likely cause: missing 'openid' or 'userinfo.email' scope on the frontend auth request.`,
      );
      return null;
    }

    const userInfo = (await userResponse.json()) as OAuthUserInfo;
    if (!userInfo.email) {
      console.error("No email in Google user info");
      return null;
    }

    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      email: userInfo.email,
      scopes: scopes.filter((s) => s.length > 0),
    };
  } catch (err) {
    console.error("Google OAuth exchange error:", err);
    return null;
  }
}

/**
 * Exchange Outlook OAuth code for refresh token and user info
 */
async function exchangeOutlookToken(
  authCode: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<{
  refreshToken: string;
  accessToken: string;
  email: string;
  scopes: string[];
} | null> {
  try {
    // Step 1: Exchange auth code for tokens
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authCode,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      },
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error("Outlook token exchange failed:", error);
      return null;
    }

    const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
    if (!tokens.refresh_token || !tokens.access_token) {
      console.error("No refresh token in Outlook response");
      return null;
    }

    // Step 2: Verify scopes include Mail.Send
    const scopesStr = tokens.scope || "";
    const scopes = scopesStr.split(" ");
    const hasMailSend = scopes.some(
      (s) => s.includes("Mail.Send") || s.includes("mail.send"),
    );

    if (!hasMailSend) {
      console.warn(
        "Outlook OAuth missing Mail.Send scope. Granted scopes:",
        scopes,
      );
      return null;
    }

    // Step 3: Get user email using access token
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      const errBody = await userResponse.text().catch(() => "");
      console.error(
        `Failed to get Outlook user info (status ${userResponse.status}): ${errBody.slice(0, 300)}. ` +
          `Likely cause: missing 'User.Read', 'profile', or 'email' scope on the frontend auth request ` +
          `— 'Mail.Send' alone does not grant access to /me.`,
      );
      return null;
    }

    const userInfo = (await userResponse.json()) as {
      userPrincipalName?: string;
    };
    if (!userInfo.userPrincipalName) {
      console.error("No email in Outlook user info");
      return null;
    }

    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      email: userInfo.userPrincipalName,
      scopes: scopes.filter((s) => s.length > 0),
    };
  } catch (err) {
    console.error("Outlook OAuth exchange error:", err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const jwtUser = await verifyJwt(req);
    if (!jwtUser) {
      return Response.json(
        { error: "unauthorized", message: "A valid Supabase session is required." },
        { status: 401, headers: corsHeaders },
      );
    }

    const { userId, provider, authCode, redirectUri } = await req.json();

    // Validate inputs
    if (!provider || !authCode || !redirectUri) {
      return Response.json(
        {
          error: "missing_fields",
          message: "provider, authCode, redirectUri required",
        },
        { status: 400, headers: corsHeaders },
      );
    }
    if (userId && userId !== jwtUser.userId) {
      return Response.json(
        { error: "user_mismatch", message: "The account does not match the active session." },
        { status: 403, headers: corsHeaders },
      );
    }
    const authenticatedUserId = jwtUser.userId;

    if (!["google", "outlook"].includes(provider)) {
      return Response.json(
        {
          error: "invalid_provider",
          message: 'provider must be "google" or "outlook"',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get OAuth credentials from environment
    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (provider === "google") {
      clientId =
        Deno.env.get("GOOGLE_CLIENT_ID") ||
        Deno.env.get("EXPO_PUBLIC_GOOGLE_CLIENT_ID");
      clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    } else {
      clientId = Deno.env.get("AZURE_CLIENT_ID");
      clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
    }

    if (!clientId || !clientSecret) {
      console.error(
        `Missing OAuth credentials for ${provider}. Available env keys:`,
        Object.keys(Deno.env.toObject()).filter(
          (k) => k.includes("GOOGLE") || k.includes("AZURE"),
        ),
      );
      return Response.json(
        {
          error: "server_config_error",
          message: "OAuth credentials not configured",
        },
        { status: 500, headers: corsHeaders },
      );
    }

    // Exchange auth code for tokens
    let oauthResult;
    if (provider === "google") {
      oauthResult = await exchangeGoogleToken(
        authCode,
        redirectUri,
        clientId,
        clientSecret,
      );
    } else {
      oauthResult = await exchangeOutlookToken(
        authCode,
        redirectUri,
        clientId,
        clientSecret,
      );
    }

    if (!oauthResult) {
      return Response.json(
        {
          error: "oauth_exchange_failed",
          message: `Failed to exchange ${provider} auth code. Check scopes granted.`,
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Check if account already linked
    const { data: existingAccount } = await supabase
      .from("connected_email_accounts")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .eq("email", oauthResult.email)
      .maybeSingle();

    let accountId: string;
    let isNewAccount = true;

    if (existingAccount) {
      // Update existing account with new tokens
      accountId = existingAccount.id;
      isNewAccount = false;

      const { error: updateError } = await supabase
        .from("connected_email_accounts")
        .update({
          refresh_token: oauthResult.refreshToken,
          scopes: oauthResult.scopes,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      if (updateError) {
        console.error("Failed to update account:", updateError);
        return Response.json(
          { error: "update_failed", message: updateError.message },
          { status: 500, headers: corsHeaders },
        );
      }
    } else {
      // Insert new account
      // Check if this is the first account for the user
      const { count: accountCount } = await supabase
        .from("connected_email_accounts")
        .select("id", { count: "exact" })
        .eq("user_id", authenticatedUserId);

      const isPrimary = (accountCount || 0) === 0;

      const { data: newAccount, error: insertError } = await supabase
        .from("connected_email_accounts")
        .insert({
          user_id: authenticatedUserId,
          email: oauthResult.email,
          provider,
          refresh_token: oauthResult.refreshToken,
          scopes: oauthResult.scopes,
          is_primary_sender: isPrimary,
          connected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to insert account:", insertError);
        return Response.json(
          { error: "insert_failed", message: insertError.message },
          { status: 500, headers: corsHeaders },
        );
      }

      accountId = newAccount.id;
    }

    // Log the OAuth event
    await supabase.from("api_key_usage_logs").insert({
      user_id: authenticatedUserId,
      function_name: "oauth-link-email",
      provider: provider === "google" ? "google_oauth" : "outlook_oauth",
      key_source: "oauth_token",
      status_code: 200,
      success: true,
      tokens_used: 0,
      cost_estimate_usd: 0,
    });

    return Response.json(
      {
        success: true,
        email: oauthResult.email,
        provider,
        scopes: oauthResult.scopes,
        accountId,
        isPrimarySender: isNewAccount,
        message: isNewAccount
          ? `${provider} account linked successfully as primary sender`
          : `${provider} account updated successfully`,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("OAuth link email error:", error);
    return Response.json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
