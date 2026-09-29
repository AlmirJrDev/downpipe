/**
 * As notificações num painel ao lado do menu, no computador.
 *
 * É o do Instagram web: o sino abre uma gaveta por cima da página, e a
 * pessoa confere o que chegou sem perder o feed ou o perfil onde estava.
 * Clicar fora, apertar Esc ou trocar de tela fecha.
 */
import React, { useEffect, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { usePathname } from "expo-router";
import { ListaDeNotificacoes } from "@/components/ListaDeNotificacoes";
import { LARGURA_DO_MENU, useLayoutStore } from "@/hooks/useDesktop";
import { colors } from "@/constants/theme";

const LARGURA_DO_PAINEL = 400;

export function PainelDeNotificacoes() {
  const aberto = useLayoutStore((s) => s.notificacoesAbertas);
  const setAberto = useLayoutStore((s) => s.setNotificacoesAbertas);
  const fechar = () => setAberto(false);

  const caminho = usePathname();
  const anterior = useRef(caminho);
  useEffect(() => {
    if (anterior.current !== caminho) setAberto(false);
    anterior.current = caminho;
  }, [caminho, setAberto]);

  useEffect(() => {
    if (!aberto || Platform.OS !== "web") return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, setAberto]);

  if (!aberto) return null;

  return (
    <>
      {/* O resto da página continua à vista, mas um clique nele só fecha o
          painel — como no Instagram, não atravessa pro que está embaixo. */}
      <Pressable
        onPress={fechar}
        accessibilityLabel="Fechar notificações"
        style={{ position: "absolute", top: 0, bottom: 0, right: 0, left: LARGURA_DO_MENU, zIndex: 20 }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: LARGURA_DO_MENU,
          width: LARGURA_DO_PAINEL,
          zIndex: 21,
          backgroundColor: colors.surface,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          // Sombra só pra descolar o painel da página de trás, que tem a
          // mesma cor.
          ...(Platform.OS === "web" ? ({ boxShadow: "8px 0 32px rgba(0,0,0,0.45)" } as object) : null),
        }}
      >
        <Text
          className="text-on-surface"
          style={{ fontSize: 22, fontWeight: "700", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}
        >
          Notificações
        </Text>
        <ListaDeNotificacoes onAbrir={fechar} postPorCima />
      </View>
    </>
  );
}
