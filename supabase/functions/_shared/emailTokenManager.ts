/**
 * supabase/functions/_shared/emailTokenManager.ts
 * OpusHunter — Email Token Management Utility
 *
 * Handles refresh token exchanges, scope validation, and account lookups
 * for Gmail and Outlook email accounts.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface ConnectedEmailAccount {
  id: string;
  user_id: string;
  email: string;
  provider: "google" | "outlook";
  refresh_token: string;
  scopes: string[];
  is_primary_sender: boolean;
  connected_at: string;
  created_at: string;
  updated_at?: string;
}

interface TokenRefreshResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

// In-memory cache for recently refreshed tokens (5-minute TTL)
const tokenCache = new Map<
  string,
  { token: TokenRefreshResult; expires: number }
>();

/**
 * Refresh Google access token using refresh token
 */
async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenRefreshResult | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.warn("Google token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || "Bearer",
    };
  } catch (err) {
    console.error("Google token refresh error:", err);
    return null;
  }
}

/**
 * Refresh Outlook access token using refresh token
 */
async function refreshOutlookToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenRefreshResult | null> {
  try {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "Mail.Send",
        }),
      },
    );

    if (!response.ok) {
      console.warn("Outlook token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || "Bearer",
    };
  } catch (err) {
    console.error("Outlook token refresh error:", err);
    return null;
  }
}

/**
 * Refresh email account access token
 * Returns null if token is revoked or refresh fails
 */
export async function refreshEmailToken(
  supabase: SupabaseClient,
  accountId: string,
): Promise<TokenRefreshResult | null> {
  // Check cache first
  const cached = tokenCache.get(accountId);
  if (cached && cached.expires > Date.now()) {
    return cached.token;
  }

  // Fetch account from database
  const { data: account, error } = await supabase
    .from("connected_email_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account) {
    console.error("Failed to fetch email account:", error);
    return null;
  }

  // Get OAuth credentials
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  if (account.provider === "google") {
    clientId =
      Deno.env.get("GOOGLE_CLIENT_ID") ||
      Deno.env.get("EXPO_PUBLIC_GOOGLE_CLIENT_ID");
    clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  } else {
    clientId = Deno.env.get("AZURE_CLIENT_ID");
    clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  }

  if (!clientId || !clientSecret) {
    console.error("Missing OAuth credentials for", account.provider);
    return null;
  }

  // Refresh token
  let result: TokenRefreshResult | null;
  if (account.provider === "google") {
    result = await refreshGoogleToken(
      account.refresh_token,
      clientId,
      clientSecret,
    );
  } else {
    result = await refreshOutlookToken(
      account.refresh_token,
      clientId,
      clientSecret,
    );
  }

  if (!result) {
    console.warn(
      `Token refresh failed for ${account.provider} account ${accountId}`,
    );
    return null;
  }

  // Cache the result (5-minute TTL)
  tokenCache.set(accountId, {
    token: result,
    expires: Date.now() + result.expiresIn * 1000,
  });

  return result;
}

/**
 * Validate that email account still has required scopes
 */
export async function validateEmailScopes(
  supabase: SupabaseClient,
  accountId: string,
): Promise<{ valid: boolean; hasGmailSend?: boolean; hasMailSend?: boolean }> {
  const { data: account, error } = await supabase
    .from("connected_email_accounts")
    .select("scopes, provider")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account) {
    return { valid: false };
  }

  const scopes = account.scopes || [];

  if (account.provider === "google") {
    const hasGmailSend = scopes.some(
      (s: string) => s.includes("gmail.send") || s.includes("gmail"),
    );
    return {
      valid: hasGmailSend,
      hasGmailSend,
    };
  } else {
    const hasMailSend = scopes.some(
      (s: string) => s.includes("Mail.Send") || s.includes("mail.send"),
    );
    return {
      valid: hasMailSend,
      hasMailSend,
    };
  }
}

/**
 * Get primary email account for user
 */
export async function getPrimaryEmailAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConnectedEmailAccount | null> {
  const { data, error } = await supabase
    .from("connected_email_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary_sender", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch primary email account:", error);
    return null;
  }

  return (data as ConnectedEmailAccount) || null;
}

/**
 * Get all email accounts for user
 */
export async function getUserEmailAccounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConnectedEmailAccount[]> {
  const { data, error } = await supabase
    .from("connected_email_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary_sender", { ascending: false })
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch email accounts:", error);
    return [];
  }

  return (data as ConnectedEmailAccount[]) || [];
}

/**
 * Set primary email account for user
 */
export async function setPrimaryEmailAccount(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<boolean> {
  try {
    // Unset all other accounts
    await supabase
      .from("connected_email_accounts")
      .update({ is_primary_sender: false })
      .eq("user_id", userId);

    // Set this account as primary
    const { error } = await supabase
      .from("connected_email_accounts")
      .update({ is_primary_sender: true })
      .eq("id", accountId)
      .eq("user_id", userId);

    return !error;
  } catch (err) {
    console.error("Failed to set primary email account:", err);
    return false;
  }
}

/**
 * Remove email account
 */
export async function removeEmailAccount(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<boolean> {
  try {
    // Get account to check if it's primary
    const { data: account } = await supabase
      .from("connected_email_accounts")
      .select("is_primary_sender")
      .eq("id", accountId)
      .maybeSingle();

    // Delete account
    const { error: deleteError } = await supabase
      .from("connected_email_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Failed to delete email account:", deleteError);
      return false;
    }

    // If this was primary, set another as primary
    if (account?.is_primary_sender) {
      const { data: nextAccount } = await supabase
        .from("connected_email_accounts")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (nextAccount) {
        await setPrimaryEmailAccount(supabase, userId, nextAccount.id);
      }
    }

    // Clear cache
    tokenCache.delete(accountId);

    return true;
  } catch (err) {
    console.error("Failed to remove email account:", err);
    return false;
  }
}
