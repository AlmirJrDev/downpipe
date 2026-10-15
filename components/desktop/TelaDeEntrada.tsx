/**
 * Login, cadastro e senha no computador: a vitrine do Downpipe à esquerda e
 * o formulário num painel de altura cheia à direita.
 *
 * Antes era um cartão dentro de uma moldura de 1180 px no meio do monitor:
 * em tela larga sobravam duas faixas pretas dos lados. Agora a tela ocupa a
 * janela inteira (o atributo data-tela abre a moldura, ver +html.tsx) e a
 * vitrine cresce com ela: mais flyers dos próximos rolês de verdade e os
 * jogos, que dá pra jogar sem conta.
 *
 * No celular não muda nada: só o formulário, como sempre.
 */
import React, { useCallback, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Flag, Gamepad2, TrendingUp, Wrench, type LucideIcon } from "lucide-react-native";
import { Logo } from "@/components/Logo";
import { apiService } from "@/services/apiService";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { eventDateLabel } from "@/utils/event";
import { colors } from "@/constants/theme";

const LARGURA_DO_PAINEL = 480;

const JOGOS: { nome: string; destino: string; Icone: LucideIcon }[] = [
  { nome: "Nave do Dia", destino: "/nave-do-dia", Icone: Gamepad2 },
  { nome: "Nave do Dia Brasil", destino: "/nave-do-dia-brasil", Icone: Flag },
  { nome: "Frankenstein", destino: "/frankenstein", Icone: Wrench },
  { nome: "Mais Caro ou Mais Barato?", destino: "/mais-caro", Icone: TrendingUp },
];

function Vitrine({ colunas }: { colunas: number }) {
  const { data } = useQuery({
    queryKey: ["vitrine-de-entrada"],
    queryFn: () => apiService.getEvents(1, 30),
    staleTime: 5 * 60_000,
  });
  // Duas fileiras de flyers, quantas colunas couberem.
  const roles = (data?.data ?? []).filter((e) => !!e.photoUrl).slice(0, colunas * 2);
  const [grade, setGrade] = useState(0);
  const VAO = 10;
  const lado = grade > 0 ? Math.floor((grade - VAO * (colunas - 1)) / colunas) : 0;

  return (
    <View style={{ width: "100%", maxWidth: 860, gap: 30 }}>
      <Logo height={34} />
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.onSurface, fontSize: 44, lineHeight: 48, fontWeight: "800", letterSpacing: -0.8 }}>
          A rede do seu carro{"\n"}
          <Text style={{ color: colors.primaryContainer }}>e dos seus encontros</Text>
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 16, lineHeight: 24, maxWidth: 520 }}>
          Sua garagem, os encontros perto de você e as fotos de quem esteve lá.
        </Text>
      </View>

      {/* Sem rolê com flyer, a vitrine fica só com o texto — nada de
          imagem de exemplo fingindo ser encontro. */}
      {roles.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 }}>
            PRÓXIMOS ENCONTROS
          </Text>
          <View
            onLayout={(e) => setGrade(e.nativeEvent.layout.width)}
            style={{ flexDirection: "row", flexWrap: "wrap", gap: VAO }}
          >
            {lado > 0 && roles.map((r) => {
              const { day, month } = eventDateLabel(r.startsAt);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/event/${r.id}`)}
                  accessibilityRole="link"
                  accessibilityLabel={r.name}
                  style={{ width: lado, aspectRatio: 4 / 5, backgroundColor: colors.surfaceContainer, overflow: "hidden" }}
                >
                  <Image source={{ uri: r.photoUrl! }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor: "rgba(10,10,10,0.78)",
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                      {day} {month} · {r.city}
                    </Text>
                    <Text style={{ color: colors.onSurface, fontSize: 11.5, fontWeight: "600" }} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 }}>
          JOGUE SEM CONTA
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {JOGOS.map(({ nome, destino, Icone }) => (
            <Pressable
              key={destino}
              onPress={() => router.push(destino as never)}
              accessibilityRole="link"
              style={(estado) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: (estado as unknown as { hovered?: boolean }).hovered ? colors.surfaceHigh : colors.surfaceContainer,
              })}
            >
              <Icone size={16} color={colors.primary} />
              <Text style={{ color: colors.onSurface, fontSize: 13.5, fontWeight: "700" }}>{nome}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export function TelaDeEntrada({ children }: { children: React.ReactNode }) {
  const larga = useLarguraAmpla();
  const { width } = useWindowDimensions();

  // Abre a moldura de vez enquanto a tela de entrada está à vista.
  useFocusEffect(
    useCallback(() => {
      if (!larga || typeof document === "undefined") return;
      const html = document.documentElement;
      html.dataset.tela = "entrada";
      return () => {
        delete html.dataset.tela;
      };
    }, [larga])
  );

  if (!larga) return <>{children}</>;

  const sobra = width - LARGURA_DO_PAINEL - 128;
  const colunas = sobra >= 980 ? 5 : sobra >= 760 ? 4 : 3;

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.surfaceLowest }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 64, paddingVertical: 40 }}>
        <Vitrine colunas={colunas} />
      </View>
      <View
        style={{
          width: LARGURA_DO_PAINEL,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderLeftWidth: 1,
          borderLeftColor: colors.border,
        }}
      >
        <View style={{ width: "100%", maxWidth: 420, height: "100%", maxHeight: 760 }}>{children}</View>
      </View>
    </View>
  );
}
