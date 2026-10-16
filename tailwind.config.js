/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lime: {
          DEFAULT: "#B5FF14",
          hover: "#A3EA0B",
          dark: "#1A2207",
          light: "#F0FFCC",
        },
        nadeeni: {
          bg: "#F9F8F3",
          card: "#FFFFFF",
          dark: "#121517",
          darkSoft: "#1C2024",
          text: "#14171A",
          muted: "#727B83",
          border: "#E9E7DF",
          borderDark: "#2A3036",
        },
        cream: "#F7F1E5",
        espresso: "#2B1E16",
        brass: "#D4AF37",
        ready: "#B5FF14",
        readyGreen: "#22C55E",
      },
      fontFamily: {
        cairo: ["Cairo", "Tajawal", "system-ui", "sans-serif"],
        tajawal: ["Tajawal", "Cairo", "system-ui", "sans-serif"],
        outfit: ["Outfit", "monospace"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
