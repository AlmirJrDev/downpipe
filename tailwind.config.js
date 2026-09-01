/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Espelha constants/theme.ts — mantenha os dois em sincronia.
      colors: {
        surface: "#121212",
        "surface-dim": "#0e0e0e",
        "surface-lowest": "#0a0a0a",
        "surface-low": "#171717",
        "surface-container": "#1a1a1a",
        "surface-high": "#222222",
        "surface-highest": "#2a2a2a",
        "surface-bright": "#333333",
        card: "#1a1a1a",
        "on-surface": "#f0f0f0",
        "on-surface-variant": "#a3a3a3",
        muted: "#8a8a8a",
        border: "#333333",
        "outline-variant": "#2a2a2a",
        outline: "#4d4d4d",
        primary: "#ff4a3d",
        "on-primary": "#ffffff",
        "primary-container": "#da291c",
        "on-primary-container": "#ffffff",
        secondary: "#c4c4c4",
        "secondary-container": "#2e2e2e",
        tertiary: "#c4c4c4",
        error: "#ff6b60",
        "error-container": "#7f1d1d",
        "input-surface": "#ededed",
        "on-input-surface": "#171717",
        success: "#22c55e",
        warning: "#eab308",
      },
      fontFamily: {
        sans: ["Inter"],
      },
      letterSpacing: {
        caps: "0.15em",
      },
    },
  },
  plugins: [],
};
