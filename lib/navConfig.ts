/**
 * lib/navConfig.ts
 * OpusHunter — Single Source of Truth for Primary Navigation
 * 2026-07-09
 *
 * WHY THIS EXISTS: AdaptiveLayout.tsx (desktop Sidebar) and
 * app/(tabs)/_layout.tsx (mobile tab bar) each defined their own separate
 * NAV_ITEMS array with the same four screens. Adding Jobs meant editing
 * two files and keeping them in sync by hand — exactly the kind of drift
 * that caused the (admin)/(settings) route-rename bugs earlier. One array,
 * imported by both. Add or reorder a nav item here once; both platforms
 * pick it up automatically.
 *
 * Icons come from lucide-react-native, colors from lib/theme.ts's `C` at
 * the call site (not baked in here) — this file only owns WHICH screens
 * exist in primary nav and WHAT they're labeled, not how they're styled.
 * That split is what makes a future light theme (or any re-skin) a
 * lib/theme.ts change only, never a nav-structure change.
 */

import type { LucideIcon } from 'lucide-react-native';
import { ServerCog, Briefcase, CloudCog, FolderCog } from 'lucide-react-native';

export interface NavItem {
    name: string;
    label: string;
    Icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
    { name: 'dashboard', label: 'HOME', Icon: ServerCog },
    { name: 'jobs', label: 'JOBS', Icon: Briefcase },
    { name: 'configure', label: 'CONFIGURE', Icon: CloudCog },
    { name: 'settings', label: 'SETTINGS', Icon: FolderCog },
] as const;