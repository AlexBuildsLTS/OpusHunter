/**
 * app/admin/users.tsx
 * OpusHunter — Admin: User Management.
 * Lists all users, changes roles (Member/Premium/Admin), and deletes users.
 * Uses SECURITY DEFINER RPCs to ensure server-side authorization.
 */

import React, { useState, useCallback } from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaWrapper } from "../../../../components/shared/SafeAreaWrapper";
import { Typography } from "../../../../components/ui/Typography";
import { Card } from "../../../../components/ui/GlassCard";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { supabase } from "../../../../lib/supabase";
import { colors, radius } from "../../../../constants/theme";
import { User, Trash2, ShieldCheck, RefreshCw } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "../../../../types/database.types";

// Type for admin_list_users RPC return
type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Database["public"]["Enums"]["user_role"];
  created_at: string;
  profile_complete: boolean;
};

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();

  // Fetch Users via SECURITY DEFINER RPC
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_page: 0,
        p_page_size: 50,
      });
      if (error) throw error;
      return (data || []) as AdminUser[];
    },
  });

  // Change Role
  const handleChangeRole = async (
    targetEmail: string,
    newRole: Database["public"]["Enums"]["user_role"],
  ) => {
    const { error } = await supabase.rpc("force_set_role", {
      target_email: targetEmail,
      target_role: newRole,
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } else {
      console.error("Role change failed:", error);
    }
  };

  // Delete User
  const handleDeleteUser = async (targetId: string) => {
    const { error } = await supabase.rpc("admin_delete_user", {
      target_id: targetId,
    });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } else {
      console.error("Delete user failed:", error);
    }
  };

  const renderItem = ({ item }: { item: AdminUser }) => {
    const roleBadgeVariant =
      item.role === "admin"
        ? "roleAdmin"
        : item.role === "premium"
          ? "rolePremium"
          : "roleMember";
    const fullName = `${item.first_name || "Unknown"} ${item.last_name || ""}`;

    return (
      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <User size={20} color={colors.accent.cyan} />
          </View>
          <View style={styles.userInfo}>
            <Typography
              variant="bodySm"
              weight="bold"
              color="primary"
              numberOfLines={1}
            >
              {fullName}
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {item.email}
            </Typography>
            <Typography variant="caption" color="dim">
              Joined: {new Date(item.created_at).toLocaleDateString()}
            </Typography>
          </View>
          <Badge variant={roleBadgeVariant} label={item.role} size="sm" dot />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <View style={styles.actionGroup}>
            <Typography
              variant="caption"
              color="secondary"
              style={{ marginBottom: 4 }}
            >
              Change Role:
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleChangeRole(item.email, "member")}
              style={styles.roleBtn}
            >
              Member
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleChangeRole(item.email, "premium")}
              style={styles.roleBtn}
            >
              Premium
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleChangeRole(item.email, "admin")}
              style={styles.roleBtn}
            >
              Admin
            </Button>
          </View>
          <Pressable
            onPress={() => handleDeleteUser(item.id)}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Trash2 size={18} color={colors.accent.red} />
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaWrapper edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold" color="primary">
          Users
        </Typography>
        <Button
          variant="ghost"
          size="sm"
          onPress={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-users"] })
          }
          style={styles.refreshBtn}
        >
          <RefreshCw size={16} color={colors.accent.cyan} /> Refresh
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <Typography color="secondary">Loading users...</Typography>
        </View>
      ) : error ? (
        <View style={styles.loading}>
          <Typography color="error">Failed to load users</Typography>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  refreshBtn: { flexDirection: "row", gap: 4 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  userCard: { padding: 16, marginBottom: 12 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,210,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1, gap: 2 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    paddingTop: 12,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  roleBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  deleteBtn: {
    padding: 8,
    backgroundColor: "rgba(248,113,113,0.1)",
    borderRadius: 8,
  },
});
