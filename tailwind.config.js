/** @type {import('tailwindcss').Config} */
/**
 * tailwind.config.js
 * OpusHunter — NativeWind v4 Tailwind Configuration
 * 2026-06-29
 *
 * IMPORTANT: This is the single source of truth for design tokens.
 * All color keys here mirror the CSS variables in global.css.
 * NativeWind v4 uses this at build time via Metro — no Babel preset needed.
 *
 * Web constraint strategy:
 *   - Never use w-full on desktop without max-w-* + mx-auto
 *   - Auth cards: max-w-[440px] mx-auto
 *   - Content pages: max-w-5xl mx-auto
 *   - Panels: max-w-2xl mx-auto
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // ── BRAND COLORS ──────────────────────────────────────────────────────────
      colors: {
        brand: {
          cyan: "#00D4FF",
          purple: "#7B5EA7",
          pink: "#E8436A",
          green: "#00C67D",
          amber: "#F59E0B",
        },

        // ── SURFACES ────────────────────────────────────────────────────────────
        surface: {
          bg: "#020507",
          core: "#040C14",
          mid: "#071220",
          card: "rgba(8,16,24,0.88)",
          sidebar: "#050A0D",
          border: "rgba(255,255,255,0.065)",
          // Tinted borders
          "border-cyan": "rgba(0,212,255,0.12)",
          "border-purple": "rgba(123,94,167,0.12)",
          "border-pink": "rgba(232,67,106,0.12)",
        },

        // ── CONTENT ─────────────────────────────────────────────────────────────
        content: {
          primary: "#D8E4EC",
          secondary: "rgba(216,228,236,0.45)",
          dim: "rgba(216,228,236,0.22)",
        },

        // ── ROLE TINTS (for RBAC badges) ────────────────────────────────────────
        role: {
          "member-bg": "rgba(123,94,167,0.12)",
          "member-border": "rgba(123,94,167,0.35)",
          "member-text": "#7B5EA7",
          "premium-bg": "rgba(245,158,11,0.12)",
          "premium-border": "rgba(245,158,11,0.35)",
          "premium-text": "#F59E0B",
          "admin-bg": "rgba(232,67,106,0.12)",
          "admin-border": "rgba(232,67,106,0.35)",
          "admin-text": "#E8436A",
        },
      },

      // ── BORDER RADIUS ─────────────────────────────────────────────────────────
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "28px",
      },

      // ── FONT FAMILIES ─────────────────────────────────────────────────────────
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

      // ── SPACING SCALE EXTENSIONS ──────────────────────────────────────────────
      spacing: {
        18: "72px",
        88: "352px",
        112: "448px",
        128: "512px",
      },

      // ── MAX WIDTHS ────────────────────────────────────────────────────────────
      maxWidth: {
        auth: "440px", // Auth card
        panel: "680px", // Narrow panels
        content: "1200px", // Full content pages
      },

      // ── BACKDROP BLUR ─────────────────────────────────────────────────────────
      backdropBlur: {
        xs: "4px",
        "2xl": "32px",
        "3xl": "48px",
      },

      // ── ANIMATIONS ────────────────────────────────────────────────────────────
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-down": "fadeInDown 0.4s ease-out forwards",
        "border-pulse": "borderPulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        fadeInDown: {
          from: { opacity: 0, transform: "translateY(-10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        borderPulse: {
          "0%,100%": { borderColor: "rgba(0,212,255,0.15)" },
          "50%": { borderColor: "rgba(0,212,255,0.40)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },

      // ── SHADOWS ───────────────────────────────────────────────────────────────
      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg":
          "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glow-cyan":
          "0 0 24px rgba(0,212,255,0.25), 0 0 48px rgba(0,212,255,0.06)",
        "glow-purple":
          "0 0 24px rgba(123,94,167,0.25), 0 0 48px rgba(123,94,167,0.06)",
        "glow-pink":
          "0 0 24px rgba(232,67,106,0.25), 0 0 48px rgba(232,67,106,0.06)",
        "btn-cyan":
          "0 0 20px rgba(0,212,255,0.30), 0 4px 16px rgba(0,0,0,0.40)",
        card: "0 4px 24px rgba(0,0,0,0.30)",
        "inset-cyan": "inset 0 0 20px rgba(0,212,255,0.04)",
      },

      // ── GRADIENTS ─────────────────────────────────────────────────────────────
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #00D4FF 0%, #7B5EA7 100%)",
        "cyan-gradient": "linear-gradient(135deg, #00D4FF 0%, #00A8CC 100%)",
        "dark-gradient":
          "radial-gradient(circle at 50% 50%, #040C14 0%, #020507 100%)",
        "ambient-cyan":
          "radial-gradient(ellipse 120% 80% at 15% 0%, rgba(0,212,255,0.05) 0%, transparent 55%)",
        "ambient-purple":
          "radial-gradient(ellipse 80% 60% at 85% 100%, rgba(123,94,167,0.05) 0%, transparent 55%)",
        "progress-shimmer":
          "linear-gradient(90deg, #00D4FF 0%, #7B5EA7 50%, #00D4FF 100%)",
      },
    },
  },
  plugins: [],
};
