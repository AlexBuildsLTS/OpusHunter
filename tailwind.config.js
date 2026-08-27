module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#3B82F6",
          purple: "#090A0F",
          pink: "#3B82F6",
          green: "#10B981",
          amber: "#F59E0B",
        },
        surface: {
          bg: "#090A0F",
          core: "#11131F",
          mid: "#1A1D2E",
          card: "rgba(17,19,31,0.75)",
          frost: "rgba(26,29,46,0.8)",
          sidebar: "#07080D",
          border: "rgba(255,255,255,0.08)",
          "border-cyan": "rgba(59,130,246,0.3)",
          "border-purple": "rgba(59,130,246,0.2)",
          "border-pink": "rgba(59,130,246,0.2)",
        },
        content: {
          primary: "#F8FAFC",
          secondary: "rgba(248,250,252,0.65)",
          dim: "rgba(248,250,252,0.4)",
        },
        role: {
          "member-bg": "rgba(59,130,246,0.12)",
          "member-border": "rgba(59,130,246,0.35)",
          "member-text": "#60A5FA",
          "premium-bg": "rgba(245,158,11,0.12)",
          "premium-border": "rgba(245,158,11,0.35)",
          "premium-text": "#FBBF24",
          "admin-bg": "rgba(239,68,68,0.12)",
          "admin-border": "rgba(239,68,68,0.35)",
          "admin-text": "#F87171",
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
          "0%,100%": { borderColor: "rgba(34,211,238,0.15)" },
          "50%": { borderColor: "rgba(34,211,238,0.24)" },
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
          "0 8px 32px rgba(0,0,0,0.45), 0 0 16px rgba(34,211,238,0.25)",
        "glow-purple":
          "0 8px 32px rgba(0,0,0,0.45), 0 0 16px rgba(139,124,246,0.25)",
        "glow-pink":
          "0 8px 32px rgba(0,0,0,0.45), 0 0 16px rgba(240,70,110,0.25)",
        "btn-cyan":
          "0 0 20px rgba(34,211,238,0.30), 0 4px 16px rgba(0,0,0,0.40)",
        card: "0 4px 24px rgba(0,0,0,0.35)",
        "inset-cyan": "inset 0 0 20px rgba(34,211,238,0.04)",
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1B1430 0%, #0A0714 100%)",
        "cyan-gradient": "linear-gradient(135deg, #120D1E 0%, #0A0714 100%)",
        "dark-gradient":
          "radial-gradient(circle at 50% 50%, #120D1E 0%, #0A0714 100%)",
        "ambient-cyan":
          "radial-gradient(ellipse 120% 80% at 15% 0%, rgba(34,211,238,0.07) 0%, transparent 55%)",
        "ambient-purple":
          "radial-gradient(ellipse 80% 60% at 85% 100%, rgba(139,124,246,0.06) 0%, transparent 55%)",
        "progress-shimmer":
          "linear-gradient(90deg, #8B7CF6 0%, #0A0714 50%, #1B1430 80%)",
      },
    },
  },
  plugins: [],
};
