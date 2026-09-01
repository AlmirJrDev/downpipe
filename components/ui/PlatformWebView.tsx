// No celular é a WebView de verdade. O par deste arquivo
// (PlatformWebView.web.tsx) troca por um <iframe> no navegador, e o Metro
// escolhe sozinho pela extensão — nenhuma tela precisa saber em qual das
// duas está rodando.
import type React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

export type PlatformWebViewRef = { injectJavaScript: (code: string) => void };

interface Props {
  source: { html: string };
  style?: StyleProp<ViewStyle>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
  ref?: React.Ref<PlatformWebViewRef>;
}

/**
 * Em runtime é a WebView inteira; o tipo aqui estreita para o punhado de
 * props e para o único método (injectJavaScript) que os mapas realmente
 * usam. É esse recorte que o iframe da web consegue honrar — deixar o tipo
 * completo aqui prometeria goBack/reload, que lá não existem.
 */
export const PlatformWebView = WebView as unknown as React.ComponentType<Props>;
