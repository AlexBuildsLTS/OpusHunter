import { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuthStore } from "../../stores/authStore";
import { colors, radius, shadows } from "../../constants/theme";
import * as Haptics from "expo-haptics";
import {
  User,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  X,
} from "lucide-react-native";

/**
 * ProfileDropdown — account menu anchored in the nav shell.
 * Shows the user's avatar (real image when available, initials otherwise),
 * name, email, role-gated actions, and sign out. Opens with a smooth
 * scale + fade (Reanimated, UI-thread).
 */
export function ProfileDropdown() {
  const router = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);

  // Dropdown open/close animation (scale + fade + slide).
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + progress.value * 0.06 },
      { translateY: (1 - progress.value) * -8 },
    ],
  }));

  const handleNavigate = (route: string) => {
    setOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(route as any);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/(auth)/auth");
  };

  const fullName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : "Operator";
  const initials = `${profile?.first_name?.[0] || user?.email?.[0] || "U"}${
    profile?.last_name?.[0] || ""
  }`.toUpperCase();

  return (
    <>
      <Pressable
        onPress={() => setOpen(!open)}
        style={styles.trigger}
        hitSlop={8}
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <ChevronDown size={14} color={colors.text.secondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.dropdown, panelStyle]}>
                <View style={styles.header}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarLarge}
                    />
                  ) : (
                    <View style={styles.avatarLarge}>
                      <Text style={styles.avatarTextLarge}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{fullName}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user?.email || ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                    <X size={18} color={colors.text.dim} />
                  </Pressable>
                </View>

                <View style={styles.menu}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => handleNavigate("/(tabs)/settings/profile")}
                  >
                    <User size={16} color={colors.accent.cyan} />
                    <Text style={styles.menuText}>Profile Settings</Text>
                  </Pressable>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => handleNavigate("/(tabs)/settings")}
                  >
                    <Settings size={16} color={colors.accent.cyan} />
                    <Text style={styles.menuText}>Settings</Text>
                  </Pressable>
                  {profile?.role === "admin" && (
                    <Pressable
                      style={styles.menuItem}
                      onPress={() => handleNavigate("/(tabs)/admin" as any)}
                    >
                      <Shield size={16} color={colors.accent.red} />
                      <Text style={styles.menuText}>Admin Console</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                  <LogOut size={16} color={colors.accent.red} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 6,
    paddingRight: 10,
    borderRadius: 24,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.role.member.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.accent.cyan, fontSize: 12, fontWeight: "800" },
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 20,
  },
  dropdown: {
    width: 280,
    backgroundColor: colors.bg.core,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radius.xl,
    padding: 14,
    ...(shadows.glassLg as any),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.role.member.bg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarTextLarge: {
    color: colors.accent.cyan,
    fontSize: 16,
    fontWeight: "800",
  },
  userName: { color: colors.text.primary, fontSize: 14, fontWeight: "700" },
  userEmail: { color: colors.text.dim, fontSize: 11 },
  menu: { marginTop: 8, gap: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  menuText: { color: colors.text.primary, fontSize: 13, fontWeight: "500" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.role.admin.bg,
    marginTop: 8,
  },
  signOutText: { color: colors.accent.red, fontSize: 13, fontWeight: "700" },
});
