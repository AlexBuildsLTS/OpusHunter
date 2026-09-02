/**
 * app/(tabs)/(dashboard)/admin/users.tsx
 * OpusHunter — User Registry & Access Control Console
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * - 120fps Reanimated Ambient Architecture (Zero-Drop Touch Safety)
 * - Dynamic Search (Name, Email, UID) & Multi-Role Filtering (All, Member, Premium, Admin)
 * - Server-Validated Role Promotions via `force_set_role` RPC
 * - Multi-Step Double-Confirmation Purge Dialog via `admin_delete_user` RPC
 * - Responsive Glassmorphism Cards & Native / Web Layout Engine
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useEffect, useMemo, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  LayoutAnimation,
  UIManager,
  Dimensions,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  UserCog,
  Trash2,
  Calendar,
  ShieldAlert,
  Mail,
  RefreshCcw,
  KeyRound,
  Shield,
  CheckCircle2,
  ArrowBigLeftDash,
  AlertTriangle,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  useFrameCallback,
} from "react-native-reanimated";

import { supabase } from "../../../../lib/supabase";
import { Database } from "../../../../types/database.types";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { FadeIn } from "../../../../components/shared/FadeIn";
import { cn } from "../../../../lib/utils";

// Enable Android Layout Animations
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── THEME ───
const THEME = {
  obsidian: "#000012",
  cyan: "#00F0FF",
  danger: "#FF007F",
  success: "#32FF00",
  warning: "#F59E0B",
  purple: "#8A2BE2",
  member: "#3B82F6",
  slate: "#94a3b8",
};

const IS_WEB = Platform.OS === "web";

const strictInputStyle = {
  flex: 1,
  height: "100%",
  color: "#FFFFFF",
  paddingVertical: 0,
  margin: 0,
  textAlignVertical: "center",
  ...(IS_WEB ? { outlineStyle: "none" } : {}),
} as any;

type UserRole = Database["public"]["Enums"]["user_role"];

interface AdminUserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  profile_complete: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: AMBIENT ENGINE (Wandering Core + Nebula)
// ══════════════════════════════════════════════════════════════════════════════

const SingleRipple = memo(({ color, delay, duration, maxSize }: any) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.sin) }),
        -1,
        false,
      ),
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, maxSize]),
    height: interpolate(progress.value, [0, 1], [0, maxSize]),
    borderRadius: interpolate(progress.value, [0, 1], [0, maxSize / 2]),
    opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 0.15, 0.02, 0]),
    borderWidth: interpolate(progress.value, [0, 1], [60, 20]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          borderColor: color,
          backgroundColor: "transparent",
        },
        animatedStyle,
      ]}
    />
  );
});
SingleRipple.displayName = "SingleRipple";

const WanderingCore = memo(
  ({ coreSize, color, maxWaveSize, waveCount, baseDuration }: any) => {
    const { width, height } = Dimensions.get("window");
    const time = useSharedValue(0);

    useFrameCallback((frameInfo) => {
      if (frameInfo.timeSincePreviousFrame === null) return;
      time.value += frameInfo.timeSincePreviousFrame / 3000;
    });

    const animatedPosition = useAnimatedStyle(() => ({
      transform: [
        { translateX: width / 2 + Math.sin(time.value * 0.4) * (width * 0.3) },
        {
          translateY: height / 2 + Math.cos(time.value * 0.3) * (height * 0.2),
        },
      ],
    }));

    const corePulse = useSharedValue(0.4);
    useEffect(() => {
      corePulse.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, [corePulse]);

    const coreStyle = useAnimatedStyle(() => ({
      opacity: interpolate(corePulse.value, [0.4, 1], [0.4, 1]),
      transform: [
        { scale: interpolate(corePulse.value, [0.4, 1], [0.8, 1.2]) },
      ],
    }));

    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedPosition,
        ]}
      >
        {Array.from({ length: waveCount }).map((_, index) => (
          <SingleRipple
            key={index}
            color={color}
            delay={index * (baseDuration / waveCount)}
            duration={baseDuration}
            maxSize={maxWaveSize}
          />
        ))}
        <Animated.View
          style={[
            coreStyle,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              backgroundColor: color,
              shadowColor: color,
              shadowRadius: 15,
              shadowOpacity: 1,
              shadowOffset: { width: 0, height: 0 },
              ...(IS_WEB ? ({ boxShadow: `0 0 20px ${color}` } as any) : {}),
            },
          ]}
        />
      </Animated.View>
    );
  },
);
WanderingCore.displayName = "WanderingCore";

const AmbientArchitecture = memo(() => {
  const { width, height } = Dimensions.get("window");
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: -1, elevation: -1 }]}
      pointerEvents="none"
    >
      <WanderingCore
        coreSize={14}
        color={THEME.cyan}
        maxWaveSize={width >= 1024 ? width * 0.8 : height * 1.0}
        waveCount={4}
        baseDuration={12000}
      />
    </View>
  );
});
AmbientArchitecture.displayName = "AmbientArchitecture";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: USER MANAGEMENT MASTER CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminUsersScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const isMobile = SCREEN_WIDTH < 768;

  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "MEMBER" | "PREMIUM" | "ADMIN"
  >("ALL");

  // Role Action Modal
  const [selectedUserForRole, setSelectedUserForRole] =
    useState<AdminUserProfile | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Critical Delete Modal
  const [userToDelete, setUserToDelete] = useState<AdminUserProfile | null>(
    null,
  );
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      // First try the SECURITY DEFINER RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "admin_list_users",
        {
          p_page: 0,
          p_page_size: 100,
        },
      );

      if (!rpcError && rpcData) {
        setUsers(rpcData as AdminUserProfile[]);
      } else {
        // Direct fallback query for admin profiles
        const { data: tableData, error: tableError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (tableError) throw tableError;
        setUsers((tableData || []) as AdminUserProfile[]);
      }
    } catch (err) {
      console.error("[USERS FETCH FAULT]:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel(`admin_users_channel_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        fetchUsers,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  // Execute Role Change via SECURITY DEFINER RPC
  const handleExecuteRoleChange = async (targetRole: UserRole) => {
    if (!selectedUserForRole) return;
    setIsUpdatingRole(true);
    setActionError(null);

    try {
      const { error } = await supabase.rpc("force_set_role", {
        target_email: selectedUserForRole.email,
        target_role: targetRole,
      });

      if (error) throw error;

      // Optimistically update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForRole.id ? { ...u, role: targetRole } : u,
        ),
      );
      setSelectedUserForRole(null);
    } catch (err: any) {
      console.error("Role change failed:", err);
      setActionError(err.message || "Failed to update clearance level.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Execute User Deletion via SECURITY DEFINER RPC
  const handleExecuteDelete = async () => {
    if (!userToDelete || deleteConfirmationInput.trim() !== "DELETE") return;
    setIsDeleting(true);
    setActionError(null);

    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        target_id: userToDelete.id,
      });

      if (error) throw error;

      // Optimistically remove
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      setDeleteConfirmationInput("");
    } catch (err: any) {
      console.error("User deletion failed:", err);
      setActionError(err.message || "Failed to purge account.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;

      const q = searchQuery.toLowerCase().trim();
      const fullName =
        `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const id = (u.id || "").toLowerCase();

      const matchesSearch =
        !q || fullName.includes(q) || email.includes(q) || id.includes(q);

      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const userStats = useMemo(() => {
    return {
      total: users.length,
      premium: users.filter((u) => u.role === "premium").length,
      admin: users.filter((u) => u.role === "admin").length,
      members: users.filter((u) => u.role === "member").length,
    };
  }, [users]);

  const renderUserCard = ({ item }: { item: AdminUserProfile }) => {
    const fullName =
      `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
      "Anonymous Hunter";
    const initials =
      fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "OH";

    const roleColor =
      item.role === "admin"
        ? THEME.purple
        : item.role === "premium"
          ? THEME.cyan
          : THEME.member;

    return (
      <GlassCard className="mb-4 rounded-3xl border border-white/5 bg-white/[0.015] p-5 md:p-6">
        <View className="flex-col justify-between gap-4 md:flex-row md:items-center">
          {/* Identity Info */}
          <View className="flex-1 flex-row items-center gap-4">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${roleColor}15`,
                borderWidth: 1.5,
                borderColor: `${roleColor}40`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: roleColor,
                  fontWeight: "900",
                  fontSize: 16,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                {initials}
              </Text>
            </View>

            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  className="text-base font-bold tracking-wide text-white"
                  numberOfLines={1}
                >
                  {fullName}
                </Text>
                <View
                  style={{
                    backgroundColor: `${roleColor}20`,
                    borderColor: `${roleColor}50`,
                  }}
                  className="rounded-full border px-2.5 py-0.5"
                >
                  <Text
                    style={{ color: roleColor }}
                    className="font-mono text-[8px] font-black uppercase tracking-widest"
                  >
                    {item.role}
                  </Text>
                </View>
              </View>

              <Text
                className="mt-0.5 font-mono text-xs text-white/50"
                numberOfLines={1}
              >
                {item.email}
              </Text>

              <View className="mt-2 flex-row flex-wrap items-center gap-3">
                <View className="flex-row items-center gap-1">
                  <Calendar size={11} color="#ffffff40" />
                  <Text className="font-mono text-[10px] text-white/40">
                    Joined {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Sparkles
                    size={11}
                    color={
                      item.profile_complete ? THEME.success : THEME.warning
                    }
                  />
                  <Text className="font-mono text-[10px] text-white/40">
                    {item.profile_complete
                      ? "Setup Verified"
                      : "Incomplete Setup"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full flex-row items-center justify-end gap-2 self-end border-t border-white/5 pt-3 md:w-auto md:self-auto md:border-t-0 md:pt-0">
            <TouchableOpacity
              onPress={() => setSelectedUserForRole(item)}
              className="flex-row items-center gap-1.5 rounded-2xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-4 py-2.5 active:scale-95"
            >
              <UserCog size={14} color={THEME.cyan} />
              <Text className="font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                Clearance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setUserToDelete(item);
                setDeleteConfirmationInput("");
              }}
              className="rounded-2xl border border-[#FF007F]/30 bg-[#FF007F]/10 p-2.5 active:scale-95"
            >
              <Trash2 size={16} color={THEME.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
      <View
        style={[StyleSheet.absoluteFill, { zIndex: -1, elevation: -1 }]}
        pointerEvents="none"
      >
        <AmbientArchitecture />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View className="w-full max-w-[1240px] self-center px-4 pb-2 pt-4 md:px-9">
            <FadeIn delay={100} className="mb-6">
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/(dashboard)/admin")}
                delayPressIn={0}
                className="mb-5 flex-row items-center gap-x-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                activeOpacity={0.7}
              >
                <ArrowBigLeftDash size={18} color={THEME.cyan} />
                <Text className="font-mono text-xs font-bold tracking-wider text-white/80">
                  KERNEL
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-mono text-2xl font-black uppercase tracking-widest text-white md:text-3xl">
                    USER REGISTRY
                  </Text>
                  <Text className="mt-0.5 font-mono text-[10px] font-bold uppercase text-[#00F0FF]/80 md:text-xs">
                    Access Clearance & Role Operations
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setRefreshing(true);
                    fetchUsers();
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-95"
                >
                  <RefreshCcw size={16} color={THEME.cyan} />
                </TouchableOpacity>
              </View>
            </FadeIn>

            {/* Quick Metrics Bar */}
            <FadeIn delay={150} className="mb-6">
              <View className="flex-row flex-wrap gap-3">
                <GlassCard className="min-w-[120px] flex-1 rounded-2xl border border-white/5 bg-white/[0.015] p-3.5">
                  <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Total Accounts
                  </Text>
                  <Text className="mt-1 font-mono text-xl font-black text-white">
                    {userStats.total}
                  </Text>
                </GlassCard>

                <GlassCard className="min-w-[120px] flex-1 rounded-2xl border border-white/5 bg-white/[0.015] p-3.5">
                  <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Premium Subs
                  </Text>
                  <Text className="mt-1 font-mono text-xl font-black text-[#00F0FF]">
                    {userStats.premium}
                  </Text>
                </GlassCard>

                <GlassCard className="min-w-[120px] flex-1 rounded-2xl border border-white/5 bg-white/[0.015] p-3.5">
                  <Text className="font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                    Admin Staff
                  </Text>
                  <Text className="mt-1 font-mono text-xl font-black text-[#8A2BE2]">
                    {userStats.admin}
                  </Text>
                </GlassCard>
              </View>
            </FadeIn>

            {/* Search and Filters */}
            <FadeIn delay={200} className="mb-6 flex-col gap-3 md:flex-row">
              <View className="h-12 flex-1 flex-row items-center rounded-2xl border border-white/10 bg-black/40 px-4">
                <Search size={16} color="#ffffff50" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search name, email, or UID..."
                  placeholderTextColor="#ffffff30"
                  style={[strictInputStyle, { marginLeft: 10 }]}
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={16} color="#ffffff60" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Role filter pills */}
              <View className="flex-row gap-2 self-start rounded-2xl border border-white/10 bg-black/40 p-1 md:self-auto">
                {(["ALL", "MEMBER", "PREMIUM", "ADMIN"] as const).map((r) => {
                  const active = roleFilter === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRoleFilter(r)}
                      className={cn(
                        "rounded-xl px-3.5 py-2 transition-all",
                        active
                          ? "border border-[#00F0FF]/40 bg-[#00F0FF]/20"
                          : "border border-transparent",
                      )}
                    >
                      <Text
                        className={cn(
                          "font-mono text-[10px] font-black uppercase tracking-widest",
                          active ? "text-[#00F0FF]" : "text-white/40",
                        )}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FadeIn>
          </View>

          {/* User List */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={THEME.cyan} />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserCard}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                paddingHorizontal: isMobile ? 16 : 36,
                paddingBottom: 120,
                maxWidth: 1240,
                alignSelf: "center",
                width: "100%",
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchUsers();
                  }}
                  tintColor={THEME.cyan}
                />
              }
              ListEmptyComponent={
                <View className="items-center justify-center rounded-3xl border border-dashed border-white/10 py-20">
                  <Text className="font-mono text-xs uppercase tracking-widest text-white/40">
                    No matching users found in registry.
                  </Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ─── MODAL 1: ROLE CLEARANCE SWITCHER ─── */}
      <Modal
        visible={!!selectedUserForRole}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUserForRole(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <GlassCard className="w-full max-w-md rounded-3xl border border-[#00F0FF]/30 bg-[#050A15] p-6 md:p-8">
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Shield size={22} color={THEME.cyan} />
                <Text className="font-mono text-lg font-black uppercase tracking-widest text-white">
                  Modify Clearance
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedUserForRole(null)}>
                <X size={20} color="#ffffff60" />
              </TouchableOpacity>
            </View>

            {selectedUserForRole && (
              <>
                <Text className="mb-2 font-mono text-xs text-white/60">
                  Target Account:
                </Text>
                <View className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <Text
                    className="text-sm font-bold text-white"
                    numberOfLines={1}
                  >
                    {`${selectedUserForRole.first_name || ""} ${selectedUserForRole.last_name || ""}`.trim() ||
                      "Anonymous"}
                  </Text>
                  <Text className="mt-0.5 font-mono text-xs text-[#00F0FF]">
                    {selectedUserForRole.email}
                  </Text>
                </View>

                {actionError && (
                  <View className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <Text className="font-mono text-xs text-red-400">
                      {actionError}
                    </Text>
                  </View>
                )}

                <Text className="mb-3 font-mono text-xs text-white/60">
                  Assign Clearance Level:
                </Text>

                <View className="flex-col gap-3">
                  {(["member", "premium", "admin"] as UserRole[]).map(
                    (role) => {
                      const active = selectedUserForRole.role === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          disabled={isUpdatingRole}
                          onPress={() => handleExecuteRoleChange(role)}
                          className={cn(
                            "active:scale-98 flex-row items-center justify-between rounded-2xl border p-4 transition-all",
                            active
                              ? "border-[#00F0FF] bg-[#00F0FF]/15"
                              : "border-white/10 bg-white/5 hover:border-white/20",
                          )}
                        >
                          <View>
                            <Text className="font-mono text-sm font-black uppercase tracking-wider text-white">
                              {role}
                            </Text>
                            <Text className="mt-0.5 font-mono text-[10px] text-white/40">
                              {role === "admin"
                                ? "Full Kernel command access & system RPC execution"
                                : role === "premium"
                                  ? "Unlimited applications, advanced AI scoring & priority queue"
                                  : "Standard member with default rate limits"}
                            </Text>
                          </View>
                          {active && (
                            <CheckCircle2 size={18} color={THEME.cyan} />
                          )}
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                {isUpdatingRole && (
                  <View className="mt-4 items-center">
                    <ActivityIndicator color={THEME.cyan} />
                  </View>
                )}
              </>
            )}
          </GlassCard>
        </View>
      </Modal>

      {/* ─── MODAL 2: CRITICAL PURGE / DELETE USER ─── */}
      <Modal
        visible={!!userToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setUserToDelete(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <GlassCard className="w-full max-w-md rounded-3xl border border-[#FF007F]/30 bg-[#050A15] p-6 md:p-8">
            <View className="mb-4 flex-row items-center gap-3">
              <AlertTriangle size={24} color={THEME.danger} />
              <Text className="font-mono text-lg font-black uppercase tracking-widest text-white">
                CRITICAL ACCOUNT PURGE
              </Text>
            </View>

            <Text className="mb-4 font-mono text-xs leading-relaxed text-white/60">
              You are about to permanently delete this user account, their cover
              letters, job applications, and API keys. This action cannot be
              undone.
            </Text>

            {userToDelete && (
              <View className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <Text className="text-sm font-bold text-white">
                  {userToDelete.email}
                </Text>
                <Text className="mt-0.5 font-mono text-[10px] text-white/40">
                  UID: {userToDelete.id}
                </Text>
              </View>
            )}

            {actionError && (
              <View className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <Text className="font-mono text-xs text-red-400">
                  {actionError}
                </Text>
              </View>
            )}

            <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
              Type <Text className="font-bold text-[#FF007F]">DELETE</Text> to
              confirm:
            </Text>

            <View className="mb-6 h-12 justify-center rounded-xl border border-white/15 bg-black/50 px-4 focus-within:border-[#FF007F]">
              <TextInput
                value={deleteConfirmationInput}
                onChangeText={setDeleteConfirmationInput}
                placeholder="DELETE"
                placeholderTextColor="#ffffff30"
                style={strictInputStyle}
                autoCapitalize="characters"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setUserToDelete(null)}
                className="h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 active:scale-95"
              >
                <Text className="font-mono text-xs font-bold uppercase text-white/70">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  deleteConfirmationInput.trim() !== "DELETE" || isDeleting
                }
                onPress={handleExecuteDelete}
                className={cn(
                  "h-12 flex-1 items-center justify-center rounded-xl transition-all active:scale-95",
                  deleteConfirmationInput.trim() === "DELETE"
                    ? "bg-[#FF007F] shadow-lg shadow-pink-900/40"
                    : "bg-white/10 opacity-50",
                )}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-mono text-xs font-black uppercase tracking-wider text-white">
                    PURGE USER
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}
