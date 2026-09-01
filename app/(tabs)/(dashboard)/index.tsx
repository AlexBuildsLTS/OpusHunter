/**
 * app/(tabs)/settings.tsx
 * OpusHunter — Settings Screen.
 * Card-based layout (icon, title, subtitle, chevron). Sections: Account, Security, Documents, Support.
 * Includes Gmail Linking (OAuth), BYOK API Keys, and Admin access via dropdown.
 */

import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaWrapper } from "../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../components/ui/Typography";
import { Card } from "../../../components/ui/GlassCard";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../../../stores/authStore";
import { supabase } from "../../../lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, radius } from "../../../constants/theme";
import {
  User,
  Shield,
  FileText,
  Mail,
  KeyRound,
  ChevronRight,
  LogOut,
  Cloud,
  Database,
  Settings as SettingsIcon,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

export default function SettingsScreen() {
  const { profile, signOut } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [modal, setModal] = useState<null | "gmail" | "apikeys" | "password">(
    null,
  );
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiProvider, setApiProvider] = useState<"gemini" | "rapidapi">(
    "gemini",
  );
  const [gmailLinking, setGmailLinking] = useState(false);

  // Fetch Connected Emails
  const { data: emails } = useQuery({
    queryKey: ["emails", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("connected_email_accounts")
        .select("*")
        .eq("user_id", profile.id);
      if (error) throw error;
      return data || [];
    },
  });

  // Gmail OAuth - Mocking a simplified flow (actual uses Supabase Auth)
  const handleGmailLink = async () => {
    setGmailLinking(true);
    // In production, this would redirect to Google OAuth via Supabase
    await new Promise((res) => setTimeout(res, 1500));
    setGmailLinking(false);
    setModal(null);
    queryClient.invalidateQueries({ queryKey: ["emails", profile?.id] });
  };

  // Save API Key (BYOK)
  const handleSaveKey = async () => {
    if (!profile || !apiKeyInput) return;
    const { error } = await supabase.rpc("set_my_api_key", {
      p_provider: apiProvider,
      p_key: apiKeyInput,
    });
    if (!error) {
      setApiKeyInput("");
      setModal(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/auth");
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredContainer}>
          <View style={styles.header}>
            <Typography variant="h2" weight="bold" color="primary">
              Settings & Preferences
            </Typography>
            <Typography
              variant="caption"
              color="secondary"
              style={{ marginTop: 4 }}
            >
              Manage your personal identity, hardware enclave, and application
              integrations.
            </Typography>
          </View>

          {/* Account Section */}
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            ACCOUNT & IDENTITY
          </Typography>
          <Card
            variant="interactive"
            style={styles.settingCard}
            onPress={() => router.push("/(tabs)/settings/profile" as any)}
          >
            <View style={styles.settingIcon}>
              <User size={20} color={colors.accent.cyan} />
            </View>
            <View style={styles.settingText}>
              <Typography variant="bodySm" weight="bold" color="primary">
                Profile & Seniority
              </Typography>
              <Typography variant="caption" color="secondary">
                Name, target roles, multi-level seniority, and AI bio
              </Typography>
            </View>
            <ChevronRight size={18} color={colors.text.dim} />
          </Card>

          {/* Security Section */}
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            SECURITY & HARDWARE ENCLAVE
          </Typography>
          <Card
            variant="interactive"
            style={styles.settingCard}
            onPress={() => router.push("/(tabs)/settings/vault" as any)}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(0,210,255,0.1)" },
              ]}
            >
              <Shield size={20} color={colors.accent.cyan} />
            </View>
            <View style={styles.settingText}>
              <Typography variant="bodySm" weight="bold" color="primary">
                Enclave Vault & Credentials
              </Typography>
              <Typography variant="caption" color="secondary">
                Hardware Vault PIN, Biometric lock, Password & BYOK API Keys
              </Typography>
            </View>
            <ChevronRight size={18} color={colors.text.dim} />
          </Card>

          <Card
            variant="interactive"
            style={styles.settingCard}
            onPress={() => setModal("gmail")}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(16,185,129,0.1)" },
              ]}
            >
              <Mail size={20} color={colors.accent.green} />
            </View>
            <View style={styles.settingText}>
              <Typography variant="bodySm" weight="bold" color="primary">
                Linked Email Account
              </Typography>
              <Typography variant="caption" color="secondary">
                {emails && emails.length > 0
                  ? emails[0].email
                  : "Link Gmail for auto-detected interview invites"}
              </Typography>
            </View>
            <ChevronRight size={18} color={colors.text.dim} />
          </Card>

          {/* Documents Section */}
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            DOCUMENTS & CERTIFICATIONS
          </Typography>
          <Card
            variant="interactive"
            style={styles.settingCard}
            onPress={() => router.push("/(tabs)/settings/vault" as any)}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(245,158,11,0.1)" },
              ]}
            >
              <FileText size={20} color={colors.accent.amber} />
            </View>
            <View style={styles.settingText}>
              <Typography variant="bodySm" weight="bold" color="primary">
                CVs & Multi-Certifications
              </Typography>
              <Typography variant="caption" color="secondary">
                Indexed resumes, primary targeting, and credentials
              </Typography>
            </View>
            <ChevronRight size={18} color={colors.text.dim} />
          </Card>

          {/* Support Section */}
          <Typography
            variant="caption"
            color="secondary"
            style={styles.sectionLabel}
          >
            SYSTEM & SUPPORT
          </Typography>
          <Card variant="interactive" style={styles.settingCard}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(139,92,246,0.1)" },
              ]}
            >
              <Cloud size={20} color="#8B5CF6" />
            </View>
            <View style={styles.settingText}>
              <Typography variant="bodySm" weight="bold" color="primary">
                Help & Documentation
              </Typography>
              <Typography variant="caption" color="secondary">
                User guide, architecture docs, and telemetry status
              </Typography>
            </View>
            <ChevronRight size={18} color={colors.text.dim} />
          </Card>

          {/* Role Badge */}
          <View style={styles.roleWrap}>
            <Typography variant="caption" color="secondary">
              Current Hunter Tier:
            </Typography>
            <Badge
              variant={
                profile?.role === "admin"
                  ? "roleAdmin"
                  : profile?.role === "premium"
                    ? "rolePremium"
                    : "roleMember"
              }
              label={profile?.role?.toUpperCase() || "MEMBER"}
              dot
            />
          </View>

          {/* Sign Out */}
          <Button
            variant="destructive"
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <LogOut size={18} color={colors.accent.red} /> Sign Out
          </Button>
        </View>
      </ScrollView>

      {/* Gmail Link Modal */}
      <Modal
        visible={modal === "gmail"}
        onClose={() => setModal(null)}
        title="Link Gmail Account"
      >
        <View style={styles.modalContent}>
          <Typography
            variant="bodySm"
            color="secondary"
            style={{ marginBottom: 16 }}
          >
            Link your Gmail so companies can respond to your applications. This
            is critical for receiving interview offers.
          </Typography>
          {emails && emails.length > 0 && (
            <Card style={styles.connectedCard}>
              <Mail size={16} color={colors.accent.green} />
              <Typography variant="bodySm" color="primary">
                {emails[0].email}
              </Typography>
            </Card>
          )}
          <Button onPress={handleGmailLink} loading={gmailLinking}>
            Connect Gmail
          </Button>
        </View>
      </Modal>

      {/* API Keys Modal */}
      <Modal
        visible={modal === "apikeys"}
        onClose={() => setModal(null)}
        title="API Keys (BYOK)"
      >
        <View style={styles.modalContent}>
          <Typography
            variant="bodySm"
            color="secondary"
            style={{ marginBottom: 12 }}
          >
            Use your own API keys to bypass rate limits.
          </Typography>
          <View style={styles.providerRow}>
            {(["gemini", "rapidapi"] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setApiProvider(p)}
                style={[
                  styles.providerBtn,
                  apiProvider === p && styles.providerActive,
                ]}
              >
                <Typography
                  variant="bodySm"
                  color={apiProvider === p ? "accent" : "secondary"}
                  style={{ textTransform: "capitalize" }}
                >
                  {p}
                </Typography>
              </Pressable>
            ))}
          </View>
          <Input
            label={`${apiProvider} API Key`}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="Enter your key..."
            secureTextEntry
          />
          <Button onPress={handleSaveKey}>Save Key</Button>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
    alignItems: "center",
  },
  centeredContainer: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.8,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    marginBottom: 8,
    borderRadius: radius.lg,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(0,210,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1, gap: 2 },
  roleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  signOutBtn: { marginTop: 16, flexDirection: "row", gap: 8 },
  modalContent: { gap: 16 },
  connectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  providerRow: { flexDirection: "row", gap: 8 },
  providerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.card,
  },
  providerActive: {
    borderColor: colors.accent.cyan,
    backgroundColor: "rgba(0,210,255,0.1)",
  },
});
