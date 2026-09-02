/**
 * app/(tabs)/(dashboard)/settings/email-linking.tsx
 * OpusHunter — Email Account Linking & Management UI
 *
 * Allows users to link Gmail (gmail.send) and Outlook (Mail.Send) accounts
 * for sending job applications via email.
 *
 * Features:
 * - Link multiple email accounts
 * - View connected accounts with provider icons
 * - Set primary sender account
 * - Remove accounts (revokes tokens)
 * - Responsive design (mobile-first)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useAuthStore } from "../../../../stores/authStore";
import { supabase } from "../../../../lib/supabase";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { colors, radius } from "../../../../constants/theme";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Clock,
  Radio,
  RadioOff,
} from "lucide-react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Database } from "../../../../types/database.types";

WebBrowser.maybeCompleteAuthSession();

type EmailAccount =
  Database["public"]["Tables"]["connected_email_accounts"]["Row"];

export default function EmailLinkingScreen() {
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth setup
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId:
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      redirectUri: makeRedirectUri({
        scheme: "opushunter",
        path: "oauth/callback",
      }),
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    });

  // Load connected accounts on mount
  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user?.id]);

  const loadAccounts = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("connected_email_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary_sender", { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as EmailAccount[]);
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLink = useCallback(async () => {
    if (!googleRequest) return;

    setLinking(true);
    setError(null);

    try {
      const result = await googlePromptAsync();
      if (result?.type === "success") {
        const { authentication } = result;
        if (!authentication?.accessToken) {
          throw new Error("No access token returned");
        }

        // Call backend edge function to exchange code for refresh token
        const { data, error } = await supabase.functions.invoke(
          "oauth-link-email",
          {
            body: {
              userId: user?.id,
              provider: "google",
              authCode: result.params.code,
              redirectUri: makeRedirectUri({
                scheme: "opushunter",
                path: "oauth/callback",
              }),
            },
          },
        );

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.message || "Failed to link Gmail account");
        }

        Alert.alert(
          "Success",
          `Gmail account ${data.email} linked successfully!`,
        );
        await loadAccounts();
      }
    } catch (err: any) {
      console.error("Google linking error:", err);
      setError(err.message || "Failed to link Gmail");
      Alert.alert("Error", err.message || "Failed to link Gmail account");
    } finally {
      setLinking(false);
    }
  }, [googleRequest, googlePromptAsync, user?.id]);

  // TODO: Add Outlook OAuth flow
  const handleOutlookLink = async () => {
    Alert.alert("Coming Soon", "Outlook linking will be available soon");
  };

  const handleRemoveAccount = async (accountId: string, email: string) => {
    Alert.alert(
      "Remove Email Account",
      `Are you sure you want to remove ${email}?`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Remove",
          onPress: async () => {
            try {
              setRemovingId(accountId);
              const { error } = await supabase
                .from("connected_email_accounts")
                .delete()
                .eq("id", accountId);

              if (error) throw error;
              await loadAccounts();
              Alert.alert("Success", `${email} removed`);
            } catch (err: any) {
              setError(err.message);
              Alert.alert("Error", err.message || "Failed to remove account");
            } finally {
              setRemovingId(null);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleSetPrimary = async (accountId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("connected_email_accounts")
        .update({ is_primary_sender: true })
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (!error) {
        await supabase
          .from("connected_email_accounts")
          .update({ is_primary_sender: false })
          .eq("user_id", user.id)
          .neq("id", accountId);
      }

      await loadAccounts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set primary account");
    }
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Typography variant="h2" weight="bold" color="primary">
                Email Accounts
              </Typography>
              <Typography
                variant="caption"
                color="secondary"
                style={styles.headerSubtitle}
              >
                Link Gmail and Outlook for sending job applications
              </Typography>
            </View>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={colors.accent.red} />
              <Typography
                variant="bodySm"
                weight="medium"
                style={{ color: colors.accent.red, flex: 1 }}
              >
                {error}
              </Typography>
            </View>
          )}

          {/* Connected Accounts Section */}
          {!loading && accounts.length > 0 && (
            <Card variant="elevated" style={styles.cardSection}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <CheckCircle2 size={16} color={colors.accent.green} />
                  <Typography
                    variant="caption"
                    weight="bold"
                    color="secondary"
                    style={styles.sectionTag}
                  >
                    CONNECTED ACCOUNTS
                  </Typography>
                </View>
                <Badge label={`${accounts.length}`} variant="cyan" size="sm" />
              </View>

              <View style={styles.accountsList}>
                {accounts.map((account) => (
                  <View key={account.id} style={styles.accountCard}>
                    <View style={styles.accountHeader}>
                      <View style={styles.accountInfo}>
                        <View style={styles.providerBadge}>
                          <Typography
                            variant="caption"
                            weight="bold"
                            style={{
                              color:
                                account.provider === "google"
                                  ? "#EA4335"
                                  : "#0078D4",
                            }}
                          >
                            {account.provider.toUpperCase()}
                          </Typography>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Typography
                            variant="bodySm"
                            weight="semiBold"
                            color="primary"
                            numberOfLines={1}
                          >
                            {account.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="dim"
                            numberOfLines={1}
                          >
                            <Clock size={12} /> Connected{" "}
                            {new Date(
                              account.connected_at,
                            ).toLocaleDateString()}
                          </Typography>
                        </View>
                      </View>

                      {/* Primary Sender Toggle */}
                      <Pressable
                        onPress={() => handleSetPrimary(account.id)}
                        style={styles.primaryToggle}
                      >
                        {account.is_primary_sender ? (
                          <>
                            <Radio
                              size={20}
                              color={colors.accent.cyan}
                              fill={colors.accent.cyan}
                            />
                            <Typography
                              variant="caption"
                              weight="bold"
                              style={{ color: colors.accent.cyan }}
                            >
                              PRIMARY
                            </Typography>
                          </>
                        ) : (
                          <>
                            <RadioOff size={20} color={colors.text.dim} />
                            <Typography variant="caption" color="dim">
                              Set as primary
                            </Typography>
                          </>
                        )}
                      </Pressable>
                    </View>

                    {/* Scopes Display */}
                    <View style={styles.scopesContainer}>
                      {account.scopes.map((scope, idx) => (
                        <Badge
                          key={`${account.id}-${idx}`}
                          label={scope.split("/").pop() || scope}
                          variant="cyan"
                          size="sm"
                        />
                      ))}
                    </View>

                    {/* Remove Button */}
                    <Pressable
                      onPress={() =>
                        handleRemoveAccount(account.id, account.email)
                      }
                      disabled={removingId === account.id}
                      style={styles.removeButton}
                    >
                      {removingId === account.id ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.accent.red}
                        />
                      ) : (
                        <>
                          <Trash2 size={14} color={colors.accent.red} />
                          <Typography
                            variant="caption"
                            style={{ color: colors.accent.red }}
                          >
                            Remove
                          </Typography>
                        </>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Add Account Section */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Plus size={16} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  ADD EMAIL ACCOUNT
                </Typography>
              </View>
            </View>

            <Typography
              variant="bodySm"
              color="secondary"
              style={styles.addDescription}
            >
              Link email accounts to send job applications automatically.
              Requires permission to send emails on your behalf.
            </Typography>

            <View
              style={[
                styles.buttonGrid,
                isMobile
                  ? { flexDirection: "column" }
                  : { flexDirection: "row" },
              ]}
            >
              <Button
                variant="primary"
                size="md"
                onPress={handleGoogleLink}
                loading={linking}
                disabled={linking || !googleRequest}
                style={[
                  styles.linkButton,
                  isMobile ? { width: "100%" } : { flex: 1 },
                ]}
              >
                <Mail size={16} color={colors.text.inverse} />
                Link Gmail
              </Button>

              <Button
                variant="ghost"
                size="md"
                onPress={handleOutlookLink}
                disabled={linking}
                style={[
                  styles.linkButton,
                  isMobile
                    ? { width: "100%", marginTop: 12 }
                    : { flex: 1, marginLeft: 12 },
                ]}
              >
                <Mail size={16} color={colors.accent.cyan} />
                Link Outlook
              </Button>
            </View>
          </Card>

          {/* Info Section */}
          <Card variant="default" style={styles.cardSection}>
            <Typography
              variant="caption"
              weight="bold"
              color="secondary"
              style={styles.sectionTag}
            >
              HOW IT WORKS
            </Typography>

            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Typography variant="bodySm" weight="medium" color="primary">
                  1. Link Gmail
                </Typography>
                <Typography variant="caption" color="dim">
                  Grants permission to send emails from your account
                </Typography>
              </View>

              <View style={styles.infoItem}>
                <Typography variant="bodySm" weight="medium" color="primary">
                  2. Set as Primary
                </Typography>
                <Typography variant="caption" color="dim">
                  Choose which account auto-apply uses to send emails
                </Typography>
              </View>

              <View style={styles.infoItem}>
                <Typography variant="bodySm" weight="medium" color="primary">
                  3. Auto-Apply
                </Typography>
                <Typography variant="caption" color="dim">
                  Applications are sent from your linked email automatically
                </Typography>
              </View>
            </View>
          </Card>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.cyan} />
              <Typography
                variant="bodySm"
                color="secondary"
                style={{ marginTop: 12 }}
              >
                Loading email accounts...
              </Typography>
            </View>
          )}

          {/* Empty State */}
          {!loading && accounts.length === 0 && (
            <View style={styles.emptyState}>
              <Mail
                size={48}
                color={colors.text.dim}
                style={{ marginBottom: 16 }}
              />
              <Typography
                variant="h3"
                weight="bold"
                color="primary"
                style={{ marginBottom: 8 }}
              >
                No Email Accounts
              </Typography>
              <Typography variant="bodySm" color="secondary">
                Link an email account to get started with automatic applications
              </Typography>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  centeredContainer: {
    maxWidth: 900,
    marginHorizontal: "auto",
    width: "100%",
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginBottom: 20,
  },
  cardSection: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    letterSpacing: 0.8,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  accountInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  primaryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  scopesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    alignSelf: "flex-start",
  },
  addDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonGrid: {
    gap: 12,
  },
  linkButton: {
    flex: 1,
  },
  infoList: {
    gap: 12,
    marginTop: 12,
  },
  infoItem: {
    gap: 4,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
