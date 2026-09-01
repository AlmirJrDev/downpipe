// Design tokens do Downpipe — mirrors DESIGN.md, used wherever inline style
// values are needed (charts, SVG, native components without NativeWind).

import type { TextStyle } from "react-native";

// Carbono neutro + vermelho de acento. Os neutros são cinzas puros de
// propósito: qualquer tingimento (rosa/marrom) empurra a interface para um
// look "Material genérico" em vez de oficina. O vermelho só entra em CTA,
// progresso, status e no wordmark.
export const colors = {
  // Elevação por camada tonal (o design system não usa sombra difusa):
  // canvas #121212 -> cartão #1a1a1a -> elevado #222222.
  surface: "#121212",
  surfaceDim: "#0e0e0e",
  surfaceLowest: "#0a0a0a",
  surfaceLow: "#171717",
  surfaceContainer: "#1a1a1a",
  surfaceHigh: "#222222",
  surfaceHighest: "#2a2a2a",
  surfaceBright: "#333333",
  card: "#1a1a1a",

  // Texto: primário, secundário, terciário.
  onSurface: "#f0f0f0",
  onSurfaceVariant: "#a3a3a3",
  muted: "#8a8a8a",

  // Bordas. `border` é a definição estrutural de 1px que o design system
  // especifica; `outlineVariant` é divisória mais discreta; `outline` é
  // borda de controle (botão secundário, campo, tracejado).
  border: "#333333",
  outlineVariant: "#2a2a2a",
  outline: "#4d4d4d",

  // Acento.
  primary: "#ff4a3d",
  onPrimary: "#ffffff",
  primaryContainer: "#da291c",
  onPrimaryContainer: "#ffffff",

  secondary: "#c4c4c4",
  secondaryContainer: "#2e2e2e",
  tertiary: "#c4c4c4",

  error: "#ff6b60",
  errorContainer: "#7f1d1d",

  // Campos de formulário claros sobre fundo escuro.
  inputSurface: "#ededed",
  onInputSurface: "#171717",
  inputPlaceholder: "#6b6b6b",

  // Sobreposições: legibilidade de texto sobre foto e backdrop de modal.
  overlaySheet: "rgba(10,10,10,0.95)",
  overlayStrong: "rgba(18,18,18,0.78)",
  overlayMedium: "rgba(18,18,18,0.62)",
  scrim: "rgba(0,0,0,0.7)",

  success: "#22c55e",
  warning: "#eab308",
} as const;

// Escala tipográfica do design system. O `lineHeight` do doc é razão; aqui já
// vai resolvido em px porque React Native não aceita unitless.
export const typography = {
  displayLg: { fontSize: 32, fontWeight: "500", lineHeight: 35, letterSpacing: -0.64 },
  headlineMd: { fontSize: 32, fontWeight: "500", lineHeight: 38, letterSpacing: -0.32 },
  headlineSm: { fontSize: 24, fontWeight: "500", lineHeight: 29 },
  bodyLg: { fontSize: 18, fontWeight: "400", lineHeight: 29 },
  bodyMd: { fontSize: 16, fontWeight: "400", lineHeight: 26 },
  // Instrumentação: rótulos, navegação e wordmark. 0.15em a 12px = 1.8px.
  labelCaps: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 80,
  gutter: 24,
  marginMobile: 16,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
} as const;

// Só 3 valores: é o enum real de cars.status no backend (carStatusEnum) —
// "paused" não existe lá, então tirei daqui também.
export const statusMeta: Record<
  "planning" | "building" | "complete",
  { label: string; color: string }
> = {
  planning: { label: "PLANEJAMENTO", color: colors.warning },
  building: { label: "EM BUILDING", color: colors.success },
  complete: { label: "COMPLETO", color: colors.primary },
};
