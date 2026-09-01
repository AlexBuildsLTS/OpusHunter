/**
 * lib/navConfig.ts
 * OpusHunter — Single Source of Truth for Navigation.
 * Drives adaptive layouts: Desktop Sidebar / Mobile Floating Tabs / Tablet Collapsible.
 * Synced 2026-08-27. Works for iOS, Android, Web (Vercel).
 */

import {
  Search,
  SlidersHorizontal,
  Kanban,
  FolderOpen,
  User,
  Settings,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react-native";

/** Navigation item keys */
export type NavItemKey =
  | "discover"
  | "rules"
  | "pipeline"
  | "vault"
  | "profile"
  | "settings"
  | "admin";

/** Navigation item interface */
export interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<any>;
  route: string;
  adminOnly?: boolean;
}

/** Main navigation items — strictly core workflows (Profile/Settings/Admin belong in ProfileDropdown) */
export const NAV_ITEMS: NavItem[] = [
  { key: "discover", label: "Discover", icon: Search, route: "/(tabs)" },
  {
    key: "rules",
    label: "Rules",
    icon: SlidersHorizontal,
    route: "/(tabs)/rules",
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: Kanban,
    route: "/(tabs)/pipeline",
  },
  {
    key: "vault",
    label: "Vault",
    icon: FolderOpen,
    route: "/(tabs)/settings/vault",
  },
];

/** Responsive breakpoints (Web) — matches theme.ts */
export const BREAKPOINTS = {
  mobile: 767, // < 768px — Floating tab bar
  tablet: 1023, // 768–1023px — Collapsible sidebar
  desktop: 1024, // ≥ 1024px — Fixed sidebar
} as const;

/** Layout constants for adaptive navigation */
export const TAB_BAR_HEIGHT = 80;
export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const TAB_BAR_BLUR_RADIUS = 20;
export const SIDEBAR_CONTENT_OFFSET = 120; // 24 + 72 + 24

/** Auth routes */
export const AUTH_ROUTES = {
  onboarding: "/(auth)/onboarding",
  auth: "/(auth)/auth",
  profileSetup: "/(auth)/profile-setup",
} as const;

/** App routes */
export const APP_ROUTES = {
  discover: "/(tabs)",
  rules: "/(tabs)/rules",
  pipeline: "/(tabs)/pipeline",
  vault: "/(tabs)/settings/vault",
  profile: "/(tabs)/settings/profile",
  settings: "/(tabs)/settings",
  jobDetail: "/job/[id]",
  coverLetter: "/cover-letter/[id]",
} as const;

/** Admin routes */
export const ADMIN_ROUTES = {
  dashboard: "/(tabs)/admin",
  users: "/(tabs)/admin/users",
  apiKeys: "/(tabs)/admin/api-keys",
  usageLogs: "/(tabs)/admin/usage-logs",
} as const;
