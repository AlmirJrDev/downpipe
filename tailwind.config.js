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
        "input-surface": "#222222",
        "on-input-surface": "#f0f0f0",
        success: "#22c55e",
        warning: "#eab308",
      },
      // A pilha do sistema, que é o que o react-native-web já aplica em
      // Text e TextInput. Antes dizia ["Inter"] — mas Inter não é carregada
      // em lugar nenhum do projeto (sem @font-face, sem link), então quem
      // pegava essa família caía em serifa. Medido: "Inter" renderizava com
      // a mesma largura de uma fonte inexistente.
      //
      // Se um dia quiserem Inter de verdade, é carregar a fonte primeiro e
      // só então declarar aqui — declarar sem carregar é pior que não
      // declarar, porque quebra em silêncio.
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        caps: "0.15em",
      },
    },
  },
  plugins: [],
};
