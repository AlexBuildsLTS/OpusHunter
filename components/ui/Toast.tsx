/**
 * components/ui/Toast.tsx
 * OpusHunter — Refined Toast Notification System.
 * Global toast provider + animated toast component.
 * Variants: success, error, warning, info. Auto-dismiss with timer.
 * Uses Reanimated for smooth slide/fade transitions.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react-native";
import { colors, radius, shadows } from "../../constants/theme";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; icon: React.ElementType; color: string }
> = {
  success: {
    bg: `${colors.accent.green}1A`,
    border: `${colors.accent.green}4D`,
    icon: CheckCircle2,
    color: colors.accent.green,
  },
  error: {
    bg: `${colors.accent.red}1A`,
    border: `${colors.accent.red}4D`,
    icon: AlertCircle,
    color: colors.accent.red,
  },
  warning: {
    bg: `${colors.accent.amber}1A`,
    border: `${colors.accent.amber}4D`,
    icon: AlertTriangle,
    color: colors.accent.amber,
  },
  info: {
    bg: `${colors.accent.cyan}1A`,
    border: `${colors.accent.cyan}4D`,
    icon: Info,
    color: colors.accent.cyan,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      if (timers.current[id]) clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => hideToast(id), duration);
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast Overlay */}
      <View
        style={styles.container}
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon as any;
          return (
            <Animated.View
              key={toast.id}
              entering={FadeInDown.springify().damping(20)}
              exiting={FadeOutUp.duration(200)}
              style={[
                styles.toast,
                { backgroundColor: style.bg, borderColor: style.border },
              ]}
            >
              <Icon size={18} color={style.color} accessible={false} />
              <Text
                style={[styles.message, { color: style.color }]}
                numberOfLines={2}
              >
                {toast.message}
              </Text>
              <Pressable
                onPress={() => hideToast(toast.id)}
                style={styles.dismiss}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
              >
                <X size={16} color={style.color} accessible={false} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 16 : 56,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
    pointerEvents: "box-none",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 400,
    width: "100%",
    marginBottom: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 12,
    marginRight: 8,
  },
  dismiss: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
