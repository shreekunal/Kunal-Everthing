import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FFFFFF",
        brand: {
          red: "#EF4444",
          redDark: "#DC2626",
          redLight: "#F87171",
          glow: "rgba(239, 68, 68, 0.25)",
        },
        surface: {
          base: "#000000",
          card: "rgba(255, 255, 255, 0.03)",
          elevated: "rgba(255, 255, 255, 0.06)",
          hover: "rgba(255, 255, 255, 0.09)",
          border: "rgba(255, 255, 255, 0.10)",
          borderSubtle: "rgba(255, 255, 255, 0.05)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "glow-red": "0 0 25px -3px rgba(239, 68, 68, 0.35)",
        "glow-red-subtle": "0 0 15px 0 rgba(239, 68, 68, 0.20)",
        "glass-panel": "0 8px 32px 0 rgba(0, 0, 0, 0.80)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
