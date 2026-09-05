import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Home,
  Compass,
  Inbox,
  SlidersHorizontal,
  User,
  Settings,
  ShieldAlert,
  LogOut,
} from "lucide-react-native";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from "react-native-reanimated";
import { useAuthStore } from "../../stores/authStore";

const ProfileMenu = ({ onClose, isAdmin }: { onClose: () => void; isAdmin: boolean }) => {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Animated.View
      entering={SlideInRight.springify().damping(20)}
      exiting={SlideOutRight}
      className="absolute right-4 top-[72px] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
    >
      <BlurView intensity={Platform.OS === "ios" ? 80 : 100} tint="dark" className="p-2">
        <View className="mb-2 border-b border-white/10 px-4 py-3">
          <Text className="font-semibold text-white">System Operator</Text>
          <Text className="text-xs text-slate-400">Secure Enclave</Text>
        </View>

        <Pressable onPress={() => navigateTo("/(tabs)/(dashboard)/settings")} className="flex-row items-center rounded-lg p-3 active:bg-white/10">
          <Settings size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">Settings Hub</Text>
        </Pressable>

        <Pressable onPress={() => navigateTo("/(tabs)/(dashboard)/settings/profile")} className="flex-row items-center rounded-lg p-3 active:bg-white/10">
          <SlidersHorizontal size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">Search Rules</Text>
        </Pressable>

        {isAdmin && (
          <Pressable onPress={() => navigateTo("/(tabs)/(dashboard)/admin")} className="mt-2 flex-row items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 active:bg-white/10">
            <ShieldAlert size={18} color="#22D3EE" />
            <Text className="ml-3 font-medium text-cyan-400">Admin Kernel</Text>
          </Pressable>
        )}

        <Pressable
          onPress={async () => {
            if (isSigningOut) return;
            setIsSigningOut(true);
            try {
              onClose();
              await signOut();
              router.replace("/(auth)/auth" as any);
            } finally {
              setIsSigningOut(false);
            }
          }}
          disabled={isSigningOut}
          className="mt-2 min-h-[44px] flex-row items-center rounded-lg border-t border-white/10 p-3 pt-4 active:bg-white/10"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
        >
          <LogOut size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">{isSigningOut ? "Disconnecting…" : "Disconnect"}</Text>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
};

export default function ResponsiveNavShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const isDesktop = width >= 1024; // Strict desktop

  const NAV_ITEMS = [
    { id: "discover", label: "Discover", icon: Compass, route: "/(tabs)/(dashboard)" },
    { id: "rules", label: "Rules", icon: SlidersHorizontal, route: "/(tabs)/(dashboard)/rules" },
    { id: "pipeline", label: "Pipeline", icon: Inbox, route: "/(tabs)/(dashboard)/pipeline" },
    { id: "vault", label: "Vault", icon: Home, route: "/(tabs)/(dashboard)/settings/vault" },
  ];

  const isItemActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.id === "discover") {
      return pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/(dashboard)" || pathname === "/(tabs)/(dashboard)/index";
    }
    return pathname.includes(item.id);
  };

  return (
    <View className="flex-1 bg-transparent" style={{ height: "100%" }}>
      
      {/* ── TOP UNIFIED HEADER ── */}
      <BlurView intensity={40} tint="dark" className="z-40 h-20 flex-row items-center justify-between border-b border-white/5 bg-black/40 px-6 pt-4">
        <Pressable
          onPress={() => router.push("/(tabs)/(dashboard)" as any)}
          className="min-h-[44px] flex-row items-center gap-3"
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open Discover"
        >
          <Image source={require("../../assets/icon.png")} style={{ width: 32, height: 32, resizeMode: "contain" }} />
          <Text className="text-xl font-black tracking-tighter text-white">OPUS<Text className="text-cyan-400">HUNTER</Text></Text>
        </Pressable>
        
        {/* Desktop inline nav links */}
        {isDesktop && (
          <View className="flex-row gap-6 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map(item => (
              <Pressable
                key={item.id}
                onPress={() => router.push(item.route as any)}
                className="min-h-[44px] items-center justify-center p-2"
                accessibilityRole="link"
                accessibilityLabel={`Open ${item.label}`}
                accessibilityState={{ selected: isItemActive(item) }}
              >
                 <Text className={`text-sm font-bold tracking-widest ${isItemActive(item) ? "text-cyan-400" : "text-slate-400"}`}>
                   {item.label.toUpperCase()}
                 </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable onPress={() => setProfileOpen(!profileOpen)} className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <User size={20} color="#E2E8F0" />
        </Pressable>
      </BlurView>

      {/* Profile Overlay */}
      {profileOpen && (
        <View className="absolute inset-0 z-50">
          <Pressable className="flex-1 bg-black/20" onPress={() => setProfileOpen(false)}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill} />
          </Pressable>
          <ProfileMenu onClose={() => setProfileOpen(false)} isAdmin={true} />
        </View>
      )}

      {/* ── MAIN CONTENT ── */}
      <View
        className="z-10 flex-1"
        style={{ overflow: "hidden", paddingBottom: isDesktop ? 16 : 120 }}
      >
        {children}
      </View>

      {/* ── BOTTOM FLOATING TAB BAR (Mobile/Tablet Only) ── */}
      {!isDesktop && (
        <View className="absolute bottom-6 left-4 right-4 z-40 h-16">
          <BlurView intensity={80} tint="dark" className="flex-1 flex-row items-center justify-around rounded-2xl border border-white/10 bg-black/80 px-2 overflow-hidden shadow-2xl">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.route as any)}
                  className="h-full min-h-[44px] w-16 items-center justify-center"
                  accessibilityRole="tab"
                  accessibilityLabel={`Open ${item.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Icon size={24} color={active ? "#22D3EE" : "#64748B"} />
                  {active && <View className="absolute bottom-1 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />}
                </Pressable>
              );
            })}
          </BlurView>
        </View>
      )}
    </View>
  );
}