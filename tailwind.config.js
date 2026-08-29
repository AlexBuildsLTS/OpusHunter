/**
 * OpusHunter — Tailwind Config (NativeWind 4.2.5 + Tailwind 3.4.19)
 * Aerospace / Cyan / Blue / Grey palette. No purple.
 * Synced 2026-08-27 with constants/theme.ts + global.css.
 */

const {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  gradients,
} = require("./constants/theme");

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ── Brand Accents ─────────────────────────────── */
        brand: {
          cyan: "#00D2FF",
          blue: "#3B82F6",
          green: "#10B981",
          amber: "#F59E0B",
          red: "#F87171",
        },

        /* ── Surfaces (Glass morphism) ─────────────────── */
        surface: {
          bg: "#050811",
          core: "#0A0F1D",
          mid: "#111A30",
          elevated: "#0D1426",
          sidebar: "#060913",
          card: "rgba(13, 20, 38, 0.75)",
          frost: "rgba(26, 29, 46, 0.8)",
          glass: "rgba(255, 255, 255, 0.04)",
          border: "rgba(30, 45, 75, 0.6)",
          "border-cyan": "rgba(0, 210, 255, 0.2)",
          "border-blue": "rgba(59, 130, 246, 0.3)",
        },

        /* ── Text Hierarchy ────────────────────────────── */
        content: {
          primary: "#F1F5F9",
          secondary: "rgba(241, 245, 249, 0.65)",
          dim: "rgba(241, 245, 249, 0.4)",
          inverse: "#050811",
        },

        /* ── Role Badges (Member=Green, Premium=Gold, Admin=Red) ── */
        role: {
          "member-bg": "rgba(16, 185, 129, 0.15)",
          "member-border": "rgba(16, 185, 129, 0.35)",
          "member-text": "#34D399",
          "premium-bg": "rgba(245, 158, 11, 0.15)",
          "premium-border": "rgba(245, 158, 11, 0.35)",
          "premium-text": "#FBBF24",
          "admin-bg": "rgba(248, 113, 113, 0.15)",
          "admin-border": "rgba(248, 113, 113, 0.35)",
          "admin-text": "#F87171",
        },

        /* ── Application Status (Kanban) ───────────────── */
        status: {
          discovered: "#3B82F6",
          saved: "#8B5CF6",
          applied: "#F59E0B",
          interview: "#06B6D4",
          offer: "#10B981",
          rejected: "#EF4444",
          withdrawn: "#64748B",
        },
      },

      /* ── Border Radius ───────────────────────────────── */
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        full: "9999px",
      },

      /* ── Font Family ─────────────────────────────────── */
      fontFamily: {
        sans: [
          "Inter-Regular",
          "Inter-Medium",
          "Inter-SemiBold",
          "Inter-Bold",
          "system-ui",
          "sans-serif",
        ],
        mono: ["Menlo", "Monaco", "Courier New", "monospace"],
      },

      /* ── Spacing ─────────────────────────────────────── */
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "64px",
        18: "72px",
        88: "352px",
        112: "448px",
        128: "512px",
      },

      /* ── Max Widths ──────────────────────────────────── */
      maxWidth: {
        auth: "420px",
        panel: "680px",
        content: "1200px",
      },

      /* ── Backdrop Blur ───────────────────────────────── */
      backdropBlur: {
        xs: "4px",
        "2xl": "32px",
        "3xl": "48px",
      },

      /* ── Animations (Subtle & Professional) ──────────── */
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-down": "fadeInDown 0.4s ease-out forwards",
        "border-pulse": "borderPulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        float: "float 4s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite",
        "radar-sweep": "radarSweep 18s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeInDown: {
          from: { opacity: 0, transform: "translateY(-10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        borderPulse: {
          "0%,100%": { borderColor: "rgba(0, 210, 255, 0.2)" },
          "50%": { borderColor: "rgba(0, 210, 255, 0.5)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        drift: {
          "0%,100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(20px, -30px) scale(1.05)" },
        },
        radarSweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },

      /* ── Box Shadows (Glass + Glow) ──────────────────── */
      boxShadow: {
        glass:
          "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "glass-lg":
          "0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07)",
        "glow-cyan":
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(0, 210, 255, 0.25)",
        "glow-blue":
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(59, 130, 246, 0.25)",
        "glow-green":
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(16, 185, 129, 0.25)",
        "glow-amber":
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(245, 158, 11, 0.25)",
        "glow-red":
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(248, 113, 113, 0.25)",
        "btn-cyan":
          "0 0 20px rgba(0, 210, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)",
        card: "0 4px 24px rgba(0, 0, 0, 0.35)",
        "inset-cyan": "inset 0 0 20px rgba(0, 210, 255, 0.04)",
      },

      /* ── Background Images (Gradients) ───────────────── */
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1B1430 0%, #0A0714 100%)",
        "accent-gradient": "linear-gradient(135deg, #00D2FF 0%, #3B82F6 100%)",
        "cyan-gradient": "linear-gradient(135deg, #120D1E 0%, #0A0714 100%)",
        "dark-gradient":
          "radial-gradient(circle at 50% 50%, #120D1E 0%, #0A0714 100%)",
        "ambient-cyan":
          "radial-gradient(ellipse 120% 80% at 15% 0%, rgba(0, 210, 255, 0.07) 0%, transparent 55%)",
        "ambient-blue":
          "radial-gradient(ellipse 80% 60% at 85% 100%, rgba(59, 130, 246, 0.06) 0%, transparent 55%)",
        "progress-shimmer":
          "linear-gradient(90deg, #3B82F6 0%, #00D2FF 50%, #3B82F6 80%)",
      },
    },
  },
  plugins: [],
};
