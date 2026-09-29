import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { MenuLateral } from "@/components/desktop/MenuLateral";
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
      <View style={{ flex: 1, alignItems: desktop ? "center" : "stretch" }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: desktop ? (ampla ? COLUNA_AMPLA : COLUNA_PADRAO) : undefined,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
