/**
 * stores/uiStore.ts
 * OpusHunter — UI State Management (Zustand) (Refined & Verified).
 * Manages: active modal, toasts, filter panel, sidebar expansion.
 * Lightweight ephemeral state for UI interactions.
 */

import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface UIStore {
  // State
  activeModal: string | null;
  toasts: ToastItem[];
  isFilterPanelOpen: boolean;
  isSidebarExpanded: boolean;
  isMobileTabBarVisible: boolean;

  // Actions
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: ToastItem) => void;
  removeToast: (id: string) => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setMobileTabBarVisible: (visible: boolean) => void;
  resetUI: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial State
  activeModal: null,
  toasts: [],
  isFilterPanelOpen: false,
  isSidebarExpanded: true,
  isMobileTabBarVisible: true,

  // Actions
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  toggleFilterPanel: () =>
    set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen })),
  setFilterPanelOpen: (open) => set({ isFilterPanelOpen: open }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
  setMobileTabBarVisible: (visible) => set({ isMobileTabBarVisible: visible }),
  resetUI: () =>
    set({
      activeModal: null,
      toasts: [],
      isFilterPanelOpen: false,
      isSidebarExpanded: true,
      isMobileTabBarVisible: true,
    }),
}));
