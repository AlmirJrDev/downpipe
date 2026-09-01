/**
 * A WebView do navegador é um <iframe>.
 *
 * Os três mapas do app já são MapLibre GL JS escrito em HTML — no celular
 * esse HTML roda dentro de uma WebView porque o MapLibre nativo não existe
 * no Expo Go. No navegador ele roda direto, então aqui não há mapa nenhum
 * pra reescrever: só falta um recipiente.
 *
 * Por isso este arquivo existe em vez de três versões web dos mapas. O HTML
 * continua tendo um dono só, e mudar o mapa continua sendo mexer num lugar.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type PlatformWebViewRef = { injectJavaScript: (code: string) => void };

interface Props {
  source: { html: string };
  style?: StyleProp<ViewStyle>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  /** Aceitos e ignorados: só fazem sentido na WebView nativa. */
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
}

/**
 * O HTML dos mapas chama window.ReactNativeWebView.postMessage — a ponte da
 * WebView nativa. Definimos essa mesma ponte sobre postMessage do iframe,
 * então o HTML atravessa sem uma linha de diferença entre as plataformas.
 */
function comPonte(html: string): string {
  const ponte =
    '<script>window.ReactNativeWebView={postMessage:function(m){parent.postMessage(String(m),"*");}};</script>';
  return html.includes("<head>") ? html.replace("<head>", "<head>" + ponte) : ponte + html;
}

export const PlatformWebView = forwardRef<PlatformWebViewRef, Props>(
  ({ source, style, onMessage }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useImperativeHandle(ref, () => ({
      injectJavaScript: (code: string) => {
        // srcDoc herda a origem da página, então dá pra falar com o
        // documento de dentro sem esbarrar em same-origin.
        try {
          (iframeRef.current?.contentWindow as unknown as { eval?: (c: string) => void })?.eval?.(
            code
          );
        } catch {
          // Iframe ainda não montou: a próxima chamada pega.
        }
      },
    }));

    useEffect(() => {
      if (!onMessage) return;
      const aoReceber = (e: MessageEvent) => {
        // Só o nosso iframe: a página pode receber mensagem de qualquer um.
        if (e.source !== iframeRef.current?.contentWindow) return;
        onMessage({ nativeEvent: { data: String(e.data) } });
      };
      window.addEventListener("message", aoReceber);
      return () => window.removeEventListener("message", aoReceber);
    }, [onMessage]);

    /**
     * blob: em vez de srcDoc.
     *
     * Um iframe com srcDoc vira documento de origem opaca ("null"), e o
     * MapLibre não consegue carregar as tiles de lá — o mapa aparece vazio,
     * com os pinos desenhados por cima, sem erro nenhum no console. A URL
     * blob: herda a origem desta página e o mapa carrega normalmente.
     */
    const url = useMemo(() => {
      const blob = new Blob([comPonte(source.html)], { type: "text/html" });
      return URL.createObjectURL(blob);
    }, [source.html]);

    // Sem revogar, cada remontagem do mapa deixa um blob preso na memória.
    useEffect(() => () => URL.revokeObjectURL(url), [url]);

    return (
      // O style vem no formato do React Native (flex: 1 e afins) e funciona
      // igual aqui, porque o react-native-web resolve para CSS.
      <div style={{ display: "flex", flex: 1, ...(style as object) }}>
        <iframe
          ref={iframeRef}
          src={url}
          style={{ border: "none", width: "100%", height: "100%", flex: 1 }}
          // O mapa pede a localização em uma das telas; sem isto o
          // navegador bloqueia o GPS dentro do iframe.
          allow="geolocation"
          title="mapa"
        />
      </div>
    );
  }
);

PlatformWebView.displayName = "PlatformWebView";
