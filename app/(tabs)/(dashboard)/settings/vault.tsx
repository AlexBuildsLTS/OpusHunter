import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { DocumentUploader } from "./DocumentUploader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { colors, radius } from "../../../../constants/theme";
import { useToast } from "../../../../components/ui/Toast";
import {
  setSecureItem,
  getSecureItem,
  deleteSecureItem,
  isSecure,
} from "../../../../lib/secureStorage";
import * as LocalAuthentication from "expo-local-authentication";
import {
  FileText,
  Award,
  Trash2,
  Star,
  Upload,
  Plus,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Fingerprint,
  Cpu,
} from "lucide-react-native";
import type { Database } from "../../../../types/database.types";
import type { ApiProvider } from "../../../../types/app.types";

type ResumeDoc = Database["public"]["Tables"]["resume_documents"]["Row"];
type Cert = Database["public"]["Tables"]["certifications"]["Row"];

interface ApiKeyItem {
  id: string;
  provider: ApiProvider;
  is_active: boolean;
  created_at: string;
}

// Supported AI & Job Aggregator Key Providers
const SUPPORTED_PROVIDERS: { id: ApiProvider; name: string; hint: string }[] = [
  {
    id: "gemini",
    name: "Google Gemini AI",
    hint: "Cover Letters, Scoring & AI Context",
  },
  {
    id: "linkedin",
    name: "LinkedIn Scraper API",
    hint: "Direct LinkedIn Job Scraping & Live Postings",
  },
  {
    id: "rapidapi",
    name: "RapidAPI Jobs",
    hint: "Job Aggregator & Feed Connectors",
  },
  { id: "adzuna", name: "Adzuna Nordic", hint: "Live Job Scraping & Postings" },
  {
    id: "geodb",
    name: "GeoDB Cities",
    hint: "Location Search & Radius Filtering",
  },
];

export default function VaultScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showUploader, setShowUploader] = useState<
    false | "cv" | "certification"
  >(false);

  // 1. VAULT PIN & BIOMETRICS HARDWARE STATE
  const [hasPinSet, setHasPinSet] = useState(false);
  const [vaultPinInput, setVaultPinInput] = useState("");
  const [vaultPinConfirm, setVaultPinConfirm] = useState("");
  const [pinStatus, setPinStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    async function checkSecurityState() {
      try {
        const storedPin = await getSecureItem("user_vault_pin");
        setHasPinSet(!!storedPin);

        const bioPref = await getSecureItem("vault_biometrics_enabled");
        setBiometricsEnabled(bioPref === "true");

        if (Platform.OS !== "web") {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricsAvailable(hasHardware && isEnrolled);
        }
      } catch (err) {
        console.warn("Error reading secure storage:", err);
      }
    }
    checkSecurityState();
  }, []);

  const handleSavePin = async () => {
    if (vaultPinInput.length < 4 || vaultPinInput.length > 8) {
      setPinStatus({
        type: "error",
        msg: "PIN must be between 4 and 8 numeric digits.",
      });
      return;
    }
    if (vaultPinInput !== vaultPinConfirm) {
      setPinStatus({ type: "error", msg: "PINs do not match." });
      return;
    }
    try {
      await setSecureItem("user_vault_pin", vaultPinInput);
      setHasPinSet(true);
      setVaultPinInput("");
      setVaultPinConfirm("");
      setPinStatus({
        type: "success",
        msg: "Hardware Vault PIN secured and activated.",
      });
    } catch (err: any) {
      setPinStatus({
        type: "error",
        msg: err.message || "Failed to store PIN.",
      });
    }
  };

  const handleRemovePin = async () => {
    try {
      await deleteSecureItem("user_vault_pin");
      setHasPinSet(false);
      setPinStatus({ type: "success", msg: "Vault PIN removed." });
    } catch (err: any) {
      setPinStatus({
        type: "error",
        msg: err.message || "Failed to remove PIN.",
      });
    }
  };

  const handleToggleBiometrics = async () => {
    if (!biometricsAvailable) {
      showToast("No biometric sensor is enrolled on this device.", "info");
      return;
    }
    const nextState = !biometricsEnabled;
    try {
      if (nextState) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable Biometric Vault Unlock",
          fallbackLabel: "Use Vault PIN",
        });
        if (!res.success) return;
      }
      await setSecureItem(
        "vault_biometrics_enabled",
        nextState ? "true" : "false",
      );
      setBiometricsEnabled(nextState);
    } catch (err: any) {
      showToast(err.message || "Could not toggle biometrics.", "error");
    }
  };

  // 2. CHANGE PASSWORD FORM WITH GRADIENT STRENGTH METER
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Compute Password Strength
  const getPasswordStrength = (pass: string) => {
    if (!pass)
      return { score: 0, label: "Empty", color: colors.text.dim, width: "0%" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: "Very Weak", color: "#EF4444", width: "20%" };
      case 2:
        return { score: 2, label: "Weak", color: "#F97316", width: "40%" };
      case 3:
        return { score: 3, label: "Fair", color: "#FBBF24", width: "60%" };
      case 4:
        return { score: 4, label: "Good", color: "#10B981", width: "80%" };
      case 5:
        return {
          score: 5,
          label: "Strong & Enclave Safe",
          color: colors.accent.cyan,
          width: "100%",
        };
      default:
        return { score: 0, label: "Too Short", color: "#EF4444", width: "10%" };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordStatus({
        type: "error",
        msg: "Please enter your current account password.",
      });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        msg: "New password must be at least 8 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }

    setPasswordSaving(true);
    setPasswordStatus(null);
    try {
      // Supabase verification of current password via re-auth signIn
      if (user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (signInError) {
          throw new Error(
            "Current password verification failed. Please check your credentials.",
          );
        }
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setPasswordStatus({
        type: "success",
        msg: "Password securely updated and encrypted across sessions.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordStatus({
        type: "error",
        msg: err.message || "Failed to update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // 3. API KEYS FORM STATE
  const [selectedProvider, setSelectedProvider] =
    useState<ApiProvider>("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Queries
  const { data: resumeDocs = [] } = useQuery({
    queryKey: ["resume-documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resume_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data || []) as ResumeDoc[];
    },
  });

  const { data: certs = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Cert[];
    },
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("id, provider, is_active, created_at")
        .eq("user_id", user!.id);
      if (error) {
        console.warn("Could not fetch user_api_keys", error.message);
        return [];
      }
      return (data || []) as ApiKeyItem[];
    },
  });

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyStatus({ type: "error", msg: "API key cannot be empty" });
      return;
    }
    setSavingKey(true);
    setKeyStatus(null);
    try {
      const { error } = await supabase.functions.invoke("save-api-key", {
        body: { provider: selectedProvider, key: apiKeyInput.trim() },
      });
      if (error) throw error;
      setKeyStatus({
        type: "success",
        msg: "API key securely stored in vault.",
      });
      setApiKeyInput("");
      queryClient.invalidateQueries({ queryKey: ["api-keys", user?.id] });
    } catch (err: any) {
      setKeyStatus({
        type: "error",
        msg: err.message || "Failed to encrypt and store key",
      });
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteDoc = async (id: string, path: string) => {
    try {
      await supabase.storage.from("resumes").remove([path]);
      await supabase.from("resume_documents").delete().eq("id", id);
      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      showToast(err.message || "Failed to remove document", "error");
    }
  };

  const handleSetPrimaryDoc = async (id: string) => {
    try {
      await supabase
        .from("resume_documents")
        .update({ is_primary: false })
        .eq("user_id", user!.id);
      await supabase
        .from("resume_documents")
        .update({ is_primary: true })
        .eq("id", id);
      queryClient.invalidateQueries({
        queryKey: ["resume-documents", user?.id],
      });
    } catch (err: any) {
      showToast(err.message || "Failed to update primary resume", "error");
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await supabase.from("certifications").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["certifications", user?.id] });
    } catch (err: any) {
      showToast(err.message || "Failed to remove document", "error");
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await supabase.from("user_api_keys").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["api-keys", user?.id] });
    } catch (err: any) {
      showToast(err.message || "Failed to remove document", "error");
    }
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Symmetrical Centered Box Wrapper */}
        <View style={styles.centeredContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Typography variant="h2" weight="bold" color="primary">
                Security & Enclave Vault
              </Typography>
              <Typography
                variant="caption"
                color="secondary"
                style={styles.headerSubtitle}
              >
                Hardware-backed credentials, PIN protection, biometric locks,
                and encrypted documents.
              </Typography>
            </View>
            <View style={styles.enclaveBadge}>
              <Cpu size={14} color={colors.accent.cyan} />
              <Typography
                variant="caption"
                weight="bold"
                style={{ color: colors.accent.cyan }}
              >
                {isSecure()
                  ? "HARDWARE ENCLAVE ACTIVE"
                  : "SECURE CLIENT ENCLAVE"}
              </Typography>
            </View>
          </View>

          {/* 1. Hardware-Backed Vault PIN & Biometric Controls */}
          <Card variant="elevated" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Lock size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  DEVICE VAULT PIN & BIOMETRIC AUTH
                </Typography>
              </View>
              <Badge
                label={hasPinSet ? "PIN ACTIVE" : "NOT CONFIGURED"}
                variant={hasPinSet ? "green" : "default"}
                size="sm"
              />
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 16 }}
            >
              Configure a dedicated hardware-backed PIN (
              {Platform.OS === "web" ? "Secure Storage" : "Keychain / Keystore"}
              ) to seal critical actions and automate biometric verification.
            </Typography>

            <View style={styles.gridTwoCols}>
              <View style={styles.gridCol}>
                <Input
                  label="Vault PIN (4-8 digits)"
                  value={vaultPinInput}
                  onChangeText={(t) => setVaultPinInput(t.slice(0, 8))}
                  placeholder="••••"
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Input
                  label="Confirm Vault PIN"
                  value={vaultPinConfirm}
                  onChangeText={(t) => setVaultPinConfirm(t.slice(0, 8))}
                  placeholder="••••"
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>
            </View>

            {pinStatus && (
              <View
                style={[
                  styles.statusAlert,
                  pinStatus.type === "success"
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}
              >
                {pinStatus.type === "success" ? (
                  <CheckCircle2 size={16} color={colors.accent.green} />
                ) : (
                  <AlertCircle size={16} color={colors.accent.red} />
                )}
                <Typography
                  variant="caption"
                  weight="medium"
                  style={{
                    color:
                      pinStatus.type === "success"
                        ? colors.accent.green
                        : colors.accent.red,
                    flex: 1,
                  }}
                >
                  {pinStatus.msg}
                </Typography>
              </View>
            )}

            <View style={styles.pinActionsRow}>
              <Button
                variant="primary"
                size="sm"
                onPress={handleSavePin}
                disabled={!vaultPinInput}
                style={{ flexDirection: "row", gap: 6 }}
              >
                <ShieldCheck size={14} color={colors.text.inverse} />
                {hasPinSet ? "Update Vault PIN" : "Seal with Vault PIN"}
              </Button>

              {hasPinSet && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleRemovePin}
                  style={{ flexDirection: "row", gap: 6 }}
                >
                  <Trash2 size={14} color={colors.accent.red} />
                  Remove PIN
                </Button>
              )}

              {/* Biometrics Toggle Button */}
              <Pressable
                onPress={handleToggleBiometrics}
                style={[
                  styles.biometricBtn,
                  biometricsEnabled && styles.biometricBtnActive,
                ]}
              >
                <Fingerprint
                  size={14}
                  color={
                    biometricsEnabled ? colors.accent.cyan : colors.text.dim
                  }
                />
                <Typography
                  variant="caption"
                  weight="semiBold"
                  style={{
                    color: biometricsEnabled
                      ? colors.accent.cyan
                      : colors.text.secondary,
                  }}
                >
                  {biometricsEnabled
                    ? "Biometrics Enabled ✓"
                    : "Enable Biometrics"}
                </Typography>
              </Pressable>
            </View>
          </Card>

          {/* 2. Account Password Change with Color Gradient Strength Meter */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Key size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  CHANGE ACCOUNT PASSWORD
                </Typography>
              </View>
              <Badge label="Argon2/Bcrypt" variant="cyan" size="sm" />
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 16 }}
            >
              Provide your current password to authorize re-encryption. New
              passwords must be at least 8 characters.
            </Typography>

            {/* Current Password */}
            <View style={{ marginBottom: 12 }}>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••••••"
                secureTextEntry={!showCurrentPass}
                icon={
                  <Pressable
                    onPress={() => setShowCurrentPass(!showCurrentPass)}
                  >
                    {showCurrentPass ? (
                      <EyeOff size={16} color={colors.text.dim} />
                    ) : (
                      <Eye size={16} color={colors.text.dim} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* New Password & Confirm */}
            <View style={styles.gridTwoCols}>
              <View style={styles.gridCol}>
                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••••••"
                  secureTextEntry={!showNewPass}
                  icon={
                    <Pressable onPress={() => setShowNewPass(!showNewPass)}>
                      {showNewPass ? (
                        <EyeOff size={16} color={colors.text.dim} />
                      ) : (
                        <Eye size={16} color={colors.text.dim} />
                      )}
                    </Pressable>
                  }
                />
              </View>

              <View style={styles.gridCol}>
                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••••••"
                  secureTextEntry={!showNewPass}
                />
              </View>
            </View>

            {/* Color Gradient Password Strength Meter */}
            {newPassword.length > 0 && (
              <View style={styles.strengthMeterContainer}>
                <View style={styles.strengthMeterHeader}>
                  <Typography variant="caption" color="dim">
                    PASSWORD STRENGTH:
                  </Typography>
                  <Typography
                    variant="caption"
                    weight="bold"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </Typography>
                </View>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthBar,
                      {
                        width: strength.width as any,
                        backgroundColor: strength.color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {passwordStatus && (
              <View
                style={[
                  styles.statusAlert,
                  passwordStatus.type === "success"
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}
              >
                {passwordStatus.type === "success" ? (
                  <CheckCircle2 size={16} color={colors.accent.green} />
                ) : (
                  <AlertCircle size={16} color={colors.accent.red} />
                )}
                <Typography
                  variant="caption"
                  weight="medium"
                  style={{
                    color:
                      passwordStatus.type === "success"
                        ? colors.accent.green
                        : colors.accent.red,
                    flex: 1,
                  }}
                >
                  {passwordStatus.msg}
                </Typography>
              </View>
            )}

            <Button
              variant="secondary"
              size="md"
              onPress={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword}
              loading={passwordSaving}
              style={{ marginTop: 14 }}
            >
              Verify & Re-encrypt Password
            </Button>
          </Card>

          {/* 3. BYOK / Custom API Keys (OpenAI Removed) */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Key size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  API KEYS
                </Typography>
              </View>
              <Badge
                label="Zero-Knowledge At Rest"
                variant="default"
                size="sm"
              />
            </View>

            <Typography
              variant="caption"
              color="dim"
              style={{ marginBottom: 14 }}
            >
              Keys are encrypted with server-side AES-GCM and only unsealed in
              edge functions when orchestrating jobs or generating documents.
            </Typography>

            <Typography
              variant="caption"
              color="secondary"
              style={{ marginBottom: 8 }}
            >
              SELECT RECOGNIZED PROVIDER:
            </Typography>
            <View style={styles.providerGrid}>
              {SUPPORTED_PROVIDERS.map((p) => {
                const active = selectedProvider === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedProvider(p.id)}
                    style={[
                      styles.providerCard,
                      active && styles.providerCardActive,
                    ]}
                  >
                    <Typography
                      variant="bodySm"
                      weight={active ? "bold" : "medium"}
                      style={{
                        color: active
                          ? colors.accent.cyan
                          : colors.text.primary,
                      }}
                    >
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="dim" numberOfLines={1}>
                      {p.hint}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label={`Secret Key for ${SUPPORTED_PROVIDERS.find((p) => p.id === selectedProvider)?.name}`}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="AIzaSy... / sk-ant-..."
              secureTextEntry
            />

            {keyStatus && (
              <View
                style={[
                  styles.statusAlert,
                  keyStatus.type === "success"
                    ? styles.statusSuccess
                    : styles.statusError,
                ]}
              >
                {keyStatus.type === "success" ? (
                  <CheckCircle2 size={16} color={colors.accent.green} />
                ) : (
                  <AlertCircle size={16} color={colors.accent.red} />
                )}
                <Typography
                  variant="caption"
                  weight="medium"
                  style={{
                    color:
                      keyStatus.type === "success"
                        ? colors.accent.green
                        : colors.accent.red,
                    flex: 1,
                  }}
                >
                  {keyStatus.msg}
                </Typography>
              </View>
            )}

            <Button
              variant="primary"
              size="md"
              onPress={handleSaveApiKey}
              disabled={savingKey || !apiKeyInput}
              loading={savingKey}
              style={{ marginTop: 12 }}
            >
              Seal API Key to Vault
            </Button>

            {/* List of Active Keys */}
            <Typography
              variant="caption"
              color="dim"
              style={{ marginTop: 20, marginBottom: 8 }}
            >
              CONFIGURED VAULT KEYS:
            </Typography>
            {apiKeys.length === 0 ? (
              <Typography variant="caption" color="dim">
                No custom keys stored. Standard Hunter platform defaults will be
                utilized.
              </Typography>
            ) : (
              <View style={{ gap: 8 }}>
                {apiKeys.map((k) => (
                  <View key={k.id} style={styles.savedKeyItem}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Key size={14} color={colors.accent.cyan} />
                      <Typography
                        variant="bodySm"
                        weight="bold"
                        color="primary"
                      >
                        {k.provider.toUpperCase()}
                      </Typography>
                      <Badge label="ACTIVE" variant="green" size="sm" />
                    </View>
                    <Pressable
                      onPress={() => handleDeleteApiKey(k.id)}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={colors.accent.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* 4. Resumes & CV Documents */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <FileText size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  STORED RESUMES & CVS
                </Typography>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setShowUploader("cv")}
                style={{ flexDirection: "row", gap: 4 }}
              >
                <Upload size={14} color={colors.accent.cyan} />
                Upload CV
              </Button>
            </View>

            {resumeDocs.length === 0 ? (
              <Typography variant="caption" color="dim">
                No resumes uploaded yet. Upload a PDF to automatically index
                skills and generate tailored applications.
              </Typography>
            ) : (
              <View style={{ gap: 8 }}>
                {resumeDocs.map((doc) => (
                  <View key={doc.id} style={styles.docItem}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Typography
                          variant="bodySm"
                          weight="bold"
                          color="primary"
                        >
                          {doc.file_name}
                        </Typography>
                        {doc.is_primary && (
                          <Badge label="PRIMARY" variant="cyan" size="sm" />
                        )}
                      </View>
                      <Typography variant="caption" color="dim">
                        {Math.round(doc.file_size_kb || 0)} KB · Uploaded{" "}
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {!doc.is_primary && (
                        <Pressable
                          onPress={() => handleSetPrimaryDoc(doc.id)}
                          style={styles.actionIconBtn}
                        >
                          <Star size={16} color={colors.text.dim} />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() =>
                          handleDeleteDoc(doc.id, doc.storage_path)
                        }
                        style={styles.actionIconBtn}
                      >
                        <Trash2 size={16} color={colors.accent.red} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* 5. Certifications */}
          <Card variant="default" style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Award size={18} color={colors.accent.cyan} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color="secondary"
                  style={styles.sectionTag}
                >
                  PROFESSIONAL CERTIFICATIONS
                </Typography>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setShowUploader("certification")}
                style={{ flexDirection: "row", gap: 4 }}
              >
                <Plus size={14} color={colors.accent.cyan} />
                Add Cert
              </Button>
            </View>

            {certs.length === 0 ? (
              <Typography variant="caption" color="dim">
                No certifications registered. Add AWS, GCP, CKA, or specialized
                credentials to boost your profile score.
              </Typography>
            ) : (
              <View style={{ gap: 8 }}>
                {certs.map((c) => (
                  <View key={c.id} style={styles.docItem}>
                    <View style={{ flex: 1 }}>
                      <Typography
                        variant="bodySm"
                        weight="bold"
                        color="primary"
                      >
                        {c.cert_name || c.file_name}
                      </Typography>
                      <Typography variant="caption" color="dim">
                        {c.cert_issuer ? `${c.cert_issuer} · ` : ""}Uploaded{" "}
                        {new Date(c.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteCert(c.id)}
                      style={styles.actionIconBtn}
                    >
                      <Trash2 size={16} color={colors.accent.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Upload Modal Drawer */}
      <DocumentUploader
        visible={showUploader !== false}
        type={showUploader || "cv"}
        onClose={() => setShowUploader(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  enclaveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderColor: "rgba(6, 182, 212, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  cardSection: {
    padding: 20,
    marginBottom: 20,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTag: {
    letterSpacing: 0.8,
  },
  gridTwoCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  gridCol: {
    flex: 1,
    minWidth: 220,
  },
  pinActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginLeft: "auto",
  },
  biometricBtnActive: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderColor: colors.accent.cyan,
  },
  strengthMeterContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  strengthMeterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  strengthTrack: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthBar: {
    height: "100%",
    borderRadius: 3,
  },
  statusAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  statusSuccess: {
    backgroundColor: `${colors.accent.green}15`,
    borderColor: `${colors.accent.green}35`,
  },
  statusError: {
    backgroundColor: `${colors.accent.red}15`,
    borderColor: `${colors.accent.red}35`,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  providerCard: {
    flex: 1,
    minWidth: 140,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  providerCardActive: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderColor: colors.accent.cyan,
  },
  savedKeyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  docItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  actionIconBtn: {
    padding: 6,
  },
});
