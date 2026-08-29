/**
 * app/admin/api-keys.tsx
 * OpusHunter — Admin: System API Key Management.
 * Lists, adds, toggles, and deletes fallback API keys for all providers.
 * Uses SECURITY DEFINER RPCs. Masks keys (never shows full key after save).
 */

import React, { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";
import { Modal } from "../../../../components/ui/Modal";
import { supabase } from "../../../../lib/supabase";
import { colors, radius } from "../../../../constants/theme";
import { KeyRound, Trash2, Plus, Power, Shield } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../types/database.types";

type ApiProvider = Database["public"]["Enums"]["api_provider_enum"];
type AdminKey =
  Database["public"]["Functions"]["admin_list_api_keys"]["Returns"][number];

const PROVIDERS: ApiProvider[] = [
  "gemini",
  "rapidapi",
  "adzuna",
  "openai",
  "anthropic",
  "geodb",
];

export default function AdminApiKeysScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ApiProvider>("gemini");
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Fetch API Keys via SECURITY DEFINER RPC
  const {
    data: keys,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_api_keys");
      if (error) throw error;
      return (data || []) as AdminKey[];
    },
  });

  // Add Key
  const handleAddKey = async () => {
    if (!newKey) return;
    const { error } = await supabase.rpc("admin_add_api_key", {
      p_provider: selectedProvider,
      p_api_key: newKey,
      p_label: newLabel || `${selectedProvider}_fallback`,
    });
    if (!error) {
      setNewKey("");
      setNewLabel("");
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    } else {
      console.error("Add key failed:", error);
    }
  };

  // Toggle Active
  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    const { error } = await supabase.rpc("admin_set_api_key_active", {
      p_key_id: keyId,
      p_active: !currentActive,
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    } else {
      console.error("Toggle key failed:", error);
    }
  };

  // Delete Key
  const handleDeleteKey = async (keyId: string) => {
    const { error } = await supabase.rpc("admin_delete_api_key", {
      p_key_id: keyId,
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    } else {
      console.error("Delete key failed:", error);
    }
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          API Keys
        </Typography>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
        >
          <Plus size={16} color={colors.text.inverse} /> Add
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <Typography color="secondary">Loading keys...</Typography>
          </View>
        ) : error ? (
          <View style={styles.loading}>
            <Typography color="error">Failed to load keys</Typography>
          </View>
        ) : keys && keys.length > 0 ? (
          keys.map((key) => {
            const isActive = key.is_active;
            const variant =
              key.provider === "gemini"
                ? "cyan"
                : key.provider === "rapidapi"
                  ? "blue"
                  : key.provider === "adzuna"
                    ? "green"
                    : "default";
            return (
              <Card key={key.id} style={styles.keyCard}>
                <View style={styles.keyHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isActive
                          ? "rgba(0,210,255,0.1)"
                          : "rgba(100,116,139,0.1)",
                      },
                    ]}
                  >
                    <KeyRound
                      size={20}
                      color={isActive ? colors.accent.cyan : colors.text.dim}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.keyTitleRow}>
                      <Typography
                        variant="bodySm"
                        weight="bold"
                        color="primary"
                      >
                        {key.label}
                      </Typography>
                      <Badge
                        variant={isActive ? "green" : "default"}
                        label={isActive ? "Active" : "Off"}
                        size="sm"
                      />
                    </View>
                    <Typography variant="caption" color="secondary">
                      {key.key_preview}
                    </Typography>
                  </View>
                </View>

                <View style={styles.keyMetaRow}>
                  <Badge variant={variant} label={key.provider} size="sm" />
                  <Typography variant="caption" color="dim">
                    Priority: {key.priority_order}
                  </Typography>
                  <Typography variant="caption" color="dim">
                    Last Used:{" "}
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : "Never"}
                  </Typography>
                </View>

                <View style={styles.actionsRow}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleToggleActive(key.id, key.is_active)}
                    style={styles.actionBtn}
                  >
                    <Power size={14} color={colors.accent.cyan} />{" "}
                    {key.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Pressable
                    onPress={() => handleDeleteKey(key.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={18} color={colors.accent.red} />
                  </Pressable>
                </View>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Typography color="dim" textAlign="center">
              No fallback keys configured. Add one to ensure uptime.
            </Typography>
          </Card>
        )}
      </ScrollView>

      {/* Add Key Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add System Fallback Key"
      >
        <View style={styles.modalContent}>
          <Typography
            variant="caption"
            color="secondary"
            style={{ marginBottom: 8 }}
          >
            PROVIDER
          </Typography>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setSelectedProvider(p)}
                style={[
                  styles.providerBtn,
                  selectedProvider === p && styles.providerActive,
                ]}
              >
                <Typography
                  variant="bodySm"
                  color={
                    selectedProvider === p
                      ? "accent"
                      : "secondary"
                  }
                  style={{ textTransform: "capitalize" }}
                >
                  {p}
                </Typography>
              </Pressable>
            ))}
          </View>
          <Input
            label="API Key"
            value={newKey}
            onChangeText={setNewKey}
            placeholder="Enter full key..."
            secureTextEntry
          />
          <Input
            label="Label (optional)"
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="e.g., Gemini Fallback 1"
          />
          <Button onPress={handleAddKey}>Save Key</Button>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  addBtn: { flexDirection: "row", gap: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  keyCard: { padding: 16, marginBottom: 12 },
  keyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  keyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  keyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: { flexDirection: "row", gap: 4 },
  deleteBtn: {
    padding: 8,
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 8,
  },
  emptyCard: { padding: 20, alignItems: "center" },
  modalContent: { gap: 16 },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  providerBtn: {
    paddingHorizontal: 12,
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
