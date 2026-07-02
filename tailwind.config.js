/** @type {import('tailwindcss').Config} */
/**
 * tailwind.config.js
 * OpusHunter — NativeWind v4 Tailwind Configuration
 * 2026-07-01 — Repalette: "Obsidian Violet" (purple + deep emerald)
 *
 * IMPORTANT: This is the single source of truth for design tokens.
 * All color keys here mirror lib/theme.ts and the CSS variables in
 * global.css EXACTLY — all three used to hold different hex values for the
 * same conceptual color (e.g. surface.bg here was #19192A while
 * lib/theme.ts's obsidian/bg was #020507 and global.css's --bg-deep was
 * #010107). That drift is fixed — grep for these hexes in either other
 * file before changing just one of them again.
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
      // NOTE: key names are legacy (`cyan`/`purple`) but values are now the
      // new palette — `cyan` = primary violet, `purple` = secondary emerald.
      // See lib/theme.ts header comment for why the keys weren't renamed.
      colors: {
        brand: {
          cyan: "#9B5CFF", // primary violet (was #00D4FF)
          purple: "#12B76A", // secondary emerald (was #7B5EA7)
          pink: "#E8436A",
          green: "#00D98A",
          amber: "#F59E0B",
        },

        // ── SURFACES ────────────────────────────────────────────────────────────
        surface: {
          bg: "#060B08",
          core: "#0A1712",
          mid: "#0D1F17",
          card: "rgba(10,20,16,0.88)",
          sidebar: "#070F0A",
          border: "rgba(255,255,255,0.08)",
          // Tinted borders
          "border-cyan": "rgba(155,92,255,0.12)",
          "border-purple": "rgba(18,183,106,0.12)",
          "border-pink": "rgba(232,67,106,0.12)",
        },

        // ── CONTENT ─────────────────────────────────────────────────────────────
        content: {
          primary: "#D8E4EC",
          secondary: "rgba(216,228,236,0.45)",
          dim: "rgba(216,228,236,0.42)",
        },

        // ── ROLE TINTS (for RBAC badges) ────────────────────────────────────────
        role: {
          "member-bg": "rgba(18,183,106,0.12)",
          "member-border": "rgba(18,183,106,0.35)",
          "member-text": "#12B76A",
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

      // ── LAYOUT GEOMETRY (mirrors lib/theme.ts LAYOUT — keep numerically identical) ──
      spacing: {
        18: "72px",
        88: "352px",
        112: "448px",
        128: "512px",
        sidebar: "72px",
        "sidebar-offset": "120px", // 24 inset + 72 rail + 24 gap — was drifted to 72px in global.css
      },

      // ── MAX WIDTHS ────────────────────────────────────────────────────────────
      maxWidth: {
        auth: "440px",
        panel: "680px",
        content: "1200px",
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
          "0%,100%": { borderColor: "rgba(155,92,255,0.15)" },
          "50%": { borderColor: "rgba(155,92,255,0.20)" },
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

      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg":
          "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glow-cyan":
          "0 0 24px rgba(155,92,255,0.25), 0 0 48px rgba(155,92,255,0.06)",
        "glow-purple":
          "0 0 24px rgba(18,183,106,0.25), 0 0 48px rgba(18,183,106,0.06)",
        "glow-pink":
          "0 0 24px rgba(232,67,106,0.25), 0 0 48px rgba(232,67,106,0.06)",
        "btn-cyan":
          "0 0 20px rgba(155,92,255,0.30), 0 4px 16px rgba(0,0,0,0.40)",
        card: "0 4px 24px rgba(0,0,0,0.30)",
        "inset-cyan": "inset 0 0 20px rgba(155,92,255,0.04)",
        "glow-cyan-hover":
          "0 0 40px rgba(155,92,255,0.35), 0 24px 64px rgba(0,0,0,0.55)",
      },
      // ── GRADIENTS ─────────────────────────────────────────────────────────────
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #9B5CFF 0%, #12B76A 100%)",
        "cyan-gradient": "linear-gradient(135deg, #9B5CFF 0%, #7B3FE4 100%)",
        "dark-gradient":
          "radial-gradient(circle at 50% 50%, #0A1712 0%, #060B08 100%)",
        "ambient-cyan":
          "radial-gradient(ellipse 120% 80% at 15% 0%, rgba(155,92,255,0.06) 0%, transparent 55%)",
        "ambient-purple":
          "radial-gradient(ellipse 80% 60% at 85% 100%, rgba(18,183,106,0.06) 0%, transparent 55%)",
        "progress-shimmer":
          "linear-gradient(90deg, #9B5CFF 0%, #12B76A 50%, #9B5CFF 80%)",
      },
    },
  },
  plugins: [],
};
