import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Home,
  Compass,
  Inbox,
  SlidersHorizontal,
  Bot,
  User,
  Settings,
  ShieldAlert,
  LogOut,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";

const ProfileMenu = ({
  onClose,
  isAdmin,
}: {
  onClose: () => void;
  isAdmin: boolean;
}) => {
  const router = useRouter();

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Animated.View
      entering={SlideInRight.springify().damping(20)}
      exiting={SlideOutRight}
      className="absolute right-4 top-16 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 100}
        tint="dark"
        className="p-2"
      >
        <View className="mb-2 border-b border-white/10 px-4 py-3">
          <Text className="font-semibold text-white">System Operator</Text>
          <Text className="text-xs text-slate-400">dev@opushunter.io</Text>
        </View>

        <Pressable
          onPress={() => navigateTo("/(tabs)/settings")}
          className="flex-row items-center rounded-lg p-3 active:bg-white/10"
        >
          <Settings size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">Settings</Text>
        </Pressable>

        <Pressable
          onPress={() => navigateTo("/(tabs)/settings/profile")}
          className="flex-row items-center rounded-lg p-3 active:bg-white/10"
        >
          <Settings size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">
            System Preferences
          </Text>
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={() => navigateTo("/(tabs)/admin")}
            className="mt-2 flex-row items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 active:bg-white/10"
          >
            <ShieldAlert size={18} color="#22D3EE" />
            <Text className="ml-3 font-medium text-cyan-400">
              Admin Terminal
            </Text>
          </Pressable>
        )}

        <Pressable className="mt-2 flex-row items-center rounded-lg border-t border-white/10 p-3 pt-4 active:bg-white/10">
          <LogOut size={18} color="#94A3B8" />
          <Text className="ml-3 font-medium text-slate-200">Disconnect</Text>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
};

export default function ResponsiveNavShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = width >= 768;
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = true;

  const NAV_ITEMS = [
    {
      id: "discover",
      label: "Discover",
      icon: Compass,
      route: "/(tabs)/index",
    },
    {
      id: "rules",
      label: "Rules",
      icon: SlidersHorizontal,
      route: "/(tabs)/rules",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: Inbox,
      route: "/(tabs)/pipeline",
    },
    {
      id: "vault",
      label: "Vault",
      icon: Home,
      route: "/(tabs)/settings/vault",
    },
  ];

  const isItemActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.id === "discover") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/index" ||
        pathname === "/(tabs)/(dashboard)" ||
        pathname === "/(tabs)/(dashboard)/index"
      );
    }
    return pathname.includes(item.id) || pathname.startsWith(item.route);
  };

  return (
    <View
      className="flex-1 bg-transparent"
      style={{ height: "100%", minHeight: 0 }}
    >
      <View
        className={`flex-1 ${isDesktop ? "flex-row" : "flex-col"}`}
        style={{ height: "100%", minHeight: 0 }}
      >
        {/* Desktop Sidebar */}
        {isDesktop && (
          <BlurView
            intensity={20}
            tint="dark"
            className="w-72 justify-between border-r border-white/5 bg-black/20 px-6 pb-8 pt-10"
          >
            <View>
              <Pressable
                onPress={() => router.push("/(tabs)/index" as any)}
                className="mb-12 cursor-pointer flex-row items-center px-2"
              >
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  <Text className="text-lg font-bold text-cyan-400">O</Text>
                </View>
                <Text className="text-2xl font-black tracking-tighter text-white">
                  OPUS<Text className="text-cyan-400">HUNTER</Text>
                </Text>
              </Pressable>

              <View className="gap-y-2">
                {NAV_ITEMS.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(item.route as any)}
                      className={`flex-row items-center rounded-xl px-4 py-3.5 transition-all ${active ? "border border-cyan-500/30 bg-cyan-500/10 shadow-sm" : "active:bg-white/5"}`}
                    >
                      <Icon size={22} color={active ? "#22D3EE" : "#64748B"} />
                      <Text
                        className={`ml-4 text-base font-bold ${active ? "text-cyan-400" : "text-slate-400"}`}
                      >
                        {item.label.toUpperCase()}
                      </Text>
                      {active && (
                        <View className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={() => setProfileOpen(!profileOpen)}
              className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 p-4 active:bg-white/10"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                <User size={20} color="#CBD5E1" />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-bold text-slate-200">
                  SYSTEM ADMIN
                </Text>
                <View className="flex-row items-center">
                  <View className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <Text className="text-[10px] font-medium tracking-widest text-slate-500">
                    READY
                  </Text>
                </View>
              </View>
            </Pressable>
          </BlurView>
        )}

        {/* Main Content Area */}
        <View
          className="relative flex-1"
          style={{ minHeight: 0, height: "100%", overflow: "hidden" }}
        >
          {/* Mobile Header */}
          {!isDesktop && (
            <BlurView
              intensity={40}
              tint="dark"
              className="z-40 h-16 flex-row items-center justify-between border-b border-white/5 bg-black/40 px-4"
            >
              <Pressable
                onPress={() => router.push("/(tabs)/index" as any)}
                className="cursor-pointer flex-row items-center gap-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/50 bg-cyan-500/20">
                  <Text className="text-sm font-bold text-cyan-400">O</Text>
                </View>
                <Text className="text-lg font-black tracking-tighter text-white">
                  OPUSHUNTER
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setProfileOpen(!profileOpen)}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 active:bg-white/20"
              >
                <User size={20} color="#E2E8F0" />
              </Pressable>
            </BlurView>
          )}

          {/* Profile Overlay */}
          {profileOpen && (
            <View className="absolute inset-0 z-50">
              <Pressable
                className="flex-1 bg-black/20"
                onPress={() => setProfileOpen(false)}
              >
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={StyleSheet.absoluteFill}
                />
              </Pressable>
              <ProfileMenu
                onClose={() => setProfileOpen(false)}
                isAdmin={isAdmin}
              />
            </View>
          )}

          {/* Content Slot */}
          <View
            className="z-10 flex-1"
            style={{ minHeight: 0, height: "100%" }}
          >
            {children}
          </View>
        </View>

        {/* Mobile Bottom Tab Bar */}
        {!isDesktop && (
          <BlurView
            intensity={60}
            tint="dark"
            className="z-40 h-20 flex-row items-center justify-around border-t border-white/5 bg-black/60 px-2 pb-4 pt-2"
          >
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.route as any)}
                  className="w-16 items-center justify-center"
                >
                  <View
                    className={`rounded-xl p-2 ${active ? "bg-cyan-500/20" : "active:bg-white/5"}`}
                  >
                    <Icon size={24} color={active ? "#22D3EE" : "#64748B"} />
                  </View>
                  <Text
                    className={`mt-1 text-[10px] font-bold tracking-widest ${active ? "text-cyan-400" : "text-slate-500"}`}
                  >
                    {item.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </BlurView>
        )}
      </View>
    </View>
  );
}
