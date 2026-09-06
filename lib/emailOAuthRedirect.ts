import { Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";

/**
 * The redirect URI must be byte-for-byte identical in:
 * Google Cloud Console, the authorization request, and the Edge Function
 * token exchange. Web uses the site origin because static Expo exports do
 * not guarantee an /oauth/callback document exists.
 */
export function getEmailOAuthRedirectUri(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const configuredRedirectUri =
      process.env.EXPO_PUBLIC_WEB_OAUTH_REDIRECT_URI?.trim();

    return configuredRedirectUri || window.location.origin;
  }

  return makeRedirectUri({
    scheme: "opushunter",
    path: "oauth/callback",
  });
}
