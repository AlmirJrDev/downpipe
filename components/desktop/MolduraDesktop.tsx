import React, { useEffect } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { MenuLateral } from "@/components/desktop/MenuLateral";
import { PainelDeNotificacoes } from "@/components/desktop/PainelDeNotificacoes";
import { PainelDoVisitante } from "@/components/desktop/PainelDoVisitante";
import { useAuthStore } from "@/stores/authStore";
import { COLUNA_AMPLA, COLUNA_PADRAO, useLayoutStore, useModoDesktop } from "@/hooks/useDesktop";

/**
 * Menu lateral + coluna central, em volta de todas as telas, no computador.
 *
 * A árvore é sempre a mesma — o menu entra num espaço que já existe e a
 * coluna só muda de largura. Trocar a árvore conforme o modo faria a pilha
 * de navegação remontar, e ela seria perdida justo no login, que é quando o
 * modo desktop liga.
 */
export function MolduraDesktop({ children }: { children: React.ReactNode }) {
  const desktop = useModoDesktop();
  const ampla = useLayoutStore((s) => s.larguraAmpla);
  const cheia = useLayoutStore((s) => s.telaCheia);
  const visitante = useAuthStore((s) => s.status !== "signedIn");
  const { width } = useWindowDimensions();
  // Visitante numa tela de coluna estreita e janela larga: a sobra vira o
  // painel dos jogos em vez de bloco preto.
  const comPainel = desktop && visitante && !ampla && !cheia && width >= 1280;

  // Tira a moldura de celular do #root (ver +html.tsx): no desktop quem
  // limita a largura é a coluna central daqui.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const html = document.documentElement;
    if (desktop) html.dataset.app = "desktop";
    else delete html.dataset.app;
  }, [desktop]);

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {desktop && <MenuLateral />}
      {desktop && <PainelDeNotificacoes />}
      <View style={{ flex: 1, flexDirection: "row", justifyContent: desktop ? "center" : "flex-start", gap: comPainel ? 32 : 0 }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: desktop && !cheia ? (ampla ? COLUNA_AMPLA : COLUNA_PADRAO) : undefined,
          }}
        >
          {children}
        </View>
        {comPainel && <PainelDoVisitante />}
      </View>
    </View>
  );
}
