// No celular é a WebView de verdade. O par deste arquivo
// (PlatformWebView.web.tsx) troca por um <iframe> no navegador, e o Metro
// escolhe sozinho pela extensão — nenhuma tela precisa saber em qual das
// duas está rodando.
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

/**
 * O que as telas podem pedir ao mapa.
 *
 * É `chamar(nome, ...args)` e não `injectJavaScript(codigo)` por causa do
 * navegador: lá a injeção era feita com eval, e a CSP do app não permite
 * 'unsafe-eval' — então toda injeção falhava, em silêncio, dentro de um
 * try/catch. Mandar o nome da função e os argumentos separados resolve sem
 * eval nenhum, e continua sendo uma linha só no celular.
 */
export type PlatformWebViewRef = {
  chamar: (nome: string, ...args: (number | string | boolean)[]) => void;
};

interface Props {
  source: { html: string };
  style?: StyleProp<ViewStyle>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
}

export const PlatformWebView = forwardRef<PlatformWebViewRef, Props>((props, ref) => {
  const webRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    chamar: (nome, ...args) => {
      const lista = args.map((a) => JSON.stringify(a)).join(", ");
      webRef.current?.injectJavaScript(`window.${nome}(${lista}); true;`);
    },
  }));

  // O tipo de Props é o recorte que o iframe da web também consegue honrar;
  // prometer goBack/reload aqui seria mentira do outro lado.
  return <WebView ref={webRef} {...(props as React.ComponentProps<typeof WebView>)} />;
});

PlatformWebView.displayName = "PlatformWebView";
