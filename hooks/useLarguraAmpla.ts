import { useCallback } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * A partir desta largura a tela pode sair da moldura de celular.
 *
 * Mesmo número da regra em app/+html.tsx: se os dois divergirem, sobra uma
 * faixa em que a moldura abre e o layout continua de uma coluna só — um
 * celular esticado, que é justamente o que a moldura existe pra evitar.
 */
export const LARGURA_DE_DESKTOP = 1024;

/**
 * Deixa a tela usar a janela inteira no computador.
 *
 * No computador o app vive numa moldura de 460 px (ver +html.tsx), escolha
 * certa pro feed e pra garagem. Mas a página de um rolê é onde chega quem
 * vem do Google pelo computador, e presa na moldura ela vira uma tela de
 * celular no meio de um monitor preto. Esta tela pede pra sair; as outras
 * continuam como estão.
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

  useFocusEffect(
    useCallback(() => {
      if (!larga || typeof document === "undefined") return;
      const html = document.documentElement;
      html.dataset.largura = "ampla";
      return () => {
        delete html.dataset.largura;
      };
    }, [larga])
  );

  return larga;
}
