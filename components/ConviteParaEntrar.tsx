/**
 * A barra que aparece pra quem chegou por um link e não tem conta.
 *
 * Ela existe porque a pessoa agora *vê* o conteúdo sem entrar: sem um convite
 * visível, ela veria a foto do rolê e iria embora sem saber que dá pra
 * confirmar presença, comentar ou ter a própria garagem. Fica fixa no rodapé
 * porque é onde o polegar está, e some no instante em que ela entra.
 */
import React from "react";
import { Platform, Pressable, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { router, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { caminhoAberto, ehTelaDeConteudo, guardarDestino, useEhVisitante } from "@/utils/visitante";

export function ConviteParaEntrar() {
  const ehVisitante = useEhVisitante();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Mesmo corte da moldura do app no computador (ver +html.tsx).
  const largo = Platform.OS === "web" && width >= 860;

  if (!ehVisitante || !ehTelaDeConteudo(segments[0])) return null;

  const entrar = (para: "/login" | "/register") => {
    // Guarda de onde ela saiu: depois de entrar, volta pra este mesmo
    // conteúdo em vez de cair no feed sem contexto.
    guardarDestino(caminhoAberto());
    router.push(para);
  };

  return (
    <View
      // "fixed" existe no react-native-web e é o que gruda a barra na
      // janela enquanto a página rola; o tipo do RN só conhece os valores
      // nativos, daí o cast. No celular, "absolute" dentro da raiz dá no
      // mesmo, porque a raiz ocupa a tela toda.
      style={{
        position: (Platform.OS === "web" ? "fixed" : "absolute") as ViewStyle["position"],
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom + 12,
        paddingTop: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surfaceContainer,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* No computador a barra atravessa a janela inteira (ela é fixa na
          janela, não na moldura do app). Sem este miolo com largura máxima,
          os dois botões viravam faixas de 700 px cada. */}
      <View
        style={{
          width: "100%",
          maxWidth: largo ? 980 : undefined,
          alignSelf: "center",
          flexDirection: largo ? "row" : "column",
          alignItems: largo ? "center" : "stretch",
          gap: largo ? 24 : 0,
        }}
      >
      <Text
        className={largo ? "text-on-surface-variant flex-1" : "text-on-surface-variant mb-2.5"}
        style={{ fontSize: 12.5, lineHeight: 17 }}
      >
        Você está de visita. Entre pra curtir, comentar, confirmar presença nos
        rolês e montar a sua garagem.
      </Text>
      <View className="flex-row gap-2" style={largo ? { width: 360 } : undefined}>
        <Pressable
          onPress={() => entrar("/register")}
          className="flex-1 bg-primary-container items-center justify-center py-3 active:opacity-80"
        >
          <Text
            className="text-on-primary-container"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2 }}
          >
            CRIAR CONTA
          </Text>
        </Pressable>
        <Pressable
          onPress={() => entrar("/login")}
          className="flex-1 border border-outline items-center justify-center py-3 active:bg-white/5"
        >
          <Text
            className="text-on-surface"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2 }}
          >
            JÁ TENHO CONTA
          </Text>
        </Pressable>
      </View>
      </View>
    </View>
  );
}
