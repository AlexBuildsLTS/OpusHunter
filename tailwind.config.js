/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#00D4FF",
          purple: "#7B5EA7",
          pink: "#E8436A",
        },
        surface: {
          bg: "#030608",
          sidebar: "#050A0D",
          card: "rgba(8,14,20,0.92)",
          border: "rgba(255,255,255,0.07)",
        },
        content: {
          primary: "#D8E4EC",
          secondary: "rgba(216,228,236,0.45)",
        },
      },
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
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
