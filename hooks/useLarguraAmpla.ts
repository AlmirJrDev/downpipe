import { useCallback } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { LARGURA_DE_DESKTOP, useLayoutStore } from "@/hooks/useDesktop";

export { LARGURA_DE_DESKTOP };

/**
 * Deixa a tela usar mais largura no computador.
 *
 * Vale pros dois jeitos de estar no desktop:
 * - de visita, o app vive numa moldura de 460 px (ver +html.tsx), e a tela
 *   que pede largura sai dela — o atributo no <html> é o que abre a moldura;
 * - logado, o conteúdo mora numa coluna de 600 px ao lado do menu lateral, e
 *   a tela que pede largura abre essa coluna até 1120 — isso é o store.
 *
 * É por foco, e não por montagem: a pilha de navegação mantém a tela de
 * trás montada, e com useEffect a próxima tela aberta por cima herdaria a
 * largura sem ter pedido.
 *
 * Devolve se a tela está larga, pra ela escolher o layout de duas colunas.
 */
export function useLarguraAmpla(): boolean {
  const { width } = useWindowDimensions();
  const larga = Platform.OS === "web" && width >= LARGURA_DE_DESKTOP;
  const setLarguraAmpla = useLayoutStore((s) => s.setLarguraAmpla);

  useFocusEffect(
    useCallback(() => {
      if (!larga || typeof document === "undefined") return;
      const html = document.documentElement;
      html.dataset.largura = "ampla";
      setLarguraAmpla(true);
      return () => {
        delete html.dataset.largura;
        setLarguraAmpla(false);
      };
    }, [larga, setLarguraAmpla])
  );

  return larga;
}
