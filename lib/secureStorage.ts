/**
 * lib/secureStorage.ts
 * OpusHunter — Secure Storage (small values only)
 *
 * FOR: vault PIN hash/state, biometric-unlock flags, any small sensitive
 *      flag that benefits from OS-level keychain encryption.
 * NOT FOR: Supabase session tokens — those use AsyncStorage in
 *      lib/supabase.ts deliberately, because SecureStore enforces a ~2KB
 *      per-item size limit that a session blob can exceed. Don't move
 *      session storage here; it will break the client on cold start.
 *
 * SECURITY NOTE — read before assuming this is "secure" everywhere:
 *   - Native (iOS/Android): expo-secure-store writes to the OS keychain
 *     (Keychain Services / Android Keystore). Genuinely hardware-backed
 *     encryption at rest.
 *   - Web: there is no browser equivalent of a secure enclave. This falls
 *     back to localStorage, which is plaintext, readable by any script on
 *     the page, and NOT secure against XSS. isSecure() below tells the
 *     caller which mode is active — UI that claims "vault sealed" or shows
 *     a lock icon should reflect that honestly on web rather than implying
 *     OS-level protection that doesn't exist there.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const WEB_PREFIX = "opushunter_secure_";

export function isSecure(): boolean {
  return Platform.OS !== "web";
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WEB_PREFIX + key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(WEB_PREFIX + key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(WEB_PREFIX + key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Known keys — centralized so a typo in a string literal can't silently
 *  create a second, disconnected storage slot. */
export const SECURE_KEYS = {
  VAULT_PIN_HASH: "vault_pin_hash",
  BIOMETRIC_ENABLED: "biometric_enabled",
  VAULT_UNLOCKED_UNTIL: "vault_unlocked_until", // timestamp string, short-lived unlock window
} as const;
