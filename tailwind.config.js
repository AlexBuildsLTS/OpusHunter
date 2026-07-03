/** @type {import('tailwindcss').Config} */
/**
 * tailwind.config.js
 * OpusHunter — NativeWind v4 Tailwind Configuration (targets Tailwind CSS v3 —
 * NativeWind v4 does not support Tailwind v4; see OPUSHUNTER_ANALYSIS.md §2)
 * 2026-07-02 — Repalette #2: "Frosted Obsidian Violet"
 *
 * Mirrors lib/theme.ts and global.css exactly. `purple` is true indigo-violet
 * now, not the emerald-green used in the previous pass — do not reintroduce
 * green as a card-background color; it's reserved for small success accents.
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#9B6BFF", // primary violet
          purple: "#6C5CE0", // secondary indigo — NOT green
          pink: "#F0466E",
          green: "#34D399", // success accents only
          amber: "#F5A623",
        },
        surface: {
          bg: "#0A0714",
          core: "#120D1E",
          mid: "#170F26",
          card: "rgba(20,14,32,0.68)",
          sidebar: "#0D0918",
          border: "rgba(255,255,255,0.08)",
          "border-cyan": "rgba(155,107,255,0.14)",
          "border-purple": "rgba(108,92,224,0.14)",
          "border-pink": "rgba(240,70,110,0.14)",
        },
        content: {
          primary: "#EDEAF7",
          secondary: "rgba(237,234,247,0.46)",
          dim: "rgba(237,234,247,0.42)",
        },
        role: {
          "member-bg": "rgba(108,92,224,0.12)",
          "member-border": "rgba(108,92,224,0.35)",
          "member-text": "#6C5CE0",
          "premium-bg": "rgba(245,166,35,0.12)",
          "premium-border": "rgba(245,166,35,0.35)",
          "premium-text": "#F5A623",
          "admin-bg": "rgba(240,70,110,0.12)",
          "admin-border": "rgba(240,70,110,0.35)",
          "admin-text": "#F0466E",
        },
      },

      borderRadius: { "2xl": "16px", "3xl": "20px", "4xl": "28px" },

      fontFamily: {
        sans: [
          "System",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["Menlo", "Monaco", "Courier New", "monospace"],
      },

      spacing: { 18: "72px", 88: "352px", 112: "448px", 128: "512px" },
      maxWidth: { auth: "440px", panel: "680px", content: "1200px" },
      backdropBlur: { xs: "4px", "2xl": "32px", "3xl": "48px" },

      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-down": "fadeInDown 0.4s ease-out forwards",
        "border-pulse": "borderPulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        float: "float 4s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        fadeInDown: {
          from: { opacity: 0, transform: "translateY(-10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        borderPulse: {
          "0%,100%": { borderColor: "rgba(155,107,255,0.15)" },
          "50%": { borderColor: "rgba(155,107,255,0.22)" },
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
      },

      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-lg":
          "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
        "glow-cyan":
          "0 0 24px rgba(155,107,255,0.25), 0 0 48px rgba(155,107,255,0.06)",
        "glow-purple":
          "0 0 24px rgba(108,92,224,0.25), 0 0 48px rgba(108,92,224,0.06)",
        "glow-pink":
          "0 0 24px rgba(240,70,110,0.25), 0 0 48px rgba(240,70,110,0.06)",
        "btn-cyan":
          "0 0 20px rgba(155,107,255,0.30), 0 4px 16px rgba(0,0,0,0.40)",
        card: "0 4px 24px rgba(0,0,0,0.35)",
        "inset-cyan": "inset 0 0 20px rgba(155,107,255,0.04)",
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #9B6BFF 0%, #6C5CE0 100%)",
        "cyan-gradient": "linear-gradient(135deg, #9B6BFF 0%, #7C4FE8 100%)",
        "dark-gradient":
          "radial-gradient(circle at 50% 50%, #120D1E 0%, #0A0714 100%)",
        "ambient-cyan":
          "radial-gradient(ellipse 120% 80% at 15% 0%, rgba(155,107,255,0.07) 0%, transparent 55%)",
        "ambient-purple":
          "radial-gradient(ellipse 80% 60% at 85% 100%, rgba(108,92,224,0.06) 0%, transparent 55%)",
        "progress-shimmer":
          "linear-gradient(90deg, #9B6BFF 0%, #6C5CE0 50%, #9B6BFF 80%)",
      },
    },
  },
  plugins: [],
};
