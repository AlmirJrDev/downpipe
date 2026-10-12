/**
 * Login, cadastro e senha no computador: a vitrine do Downpipe à esquerda e
 * o formulário num cartão à direita — o desenho da entrada do Instagram web.
 *
 * Antes era a tela de celular, 460 px no meio do monitor. A vitrine mostra
 * os próximos rolês de verdade, com o flyer de cada um: é a primeira coisa
 * que quem chega pelo computador vê, e diz o que tem aqui dentro melhor que
 * qualquer frase.
 *
 * No celular não muda nada: só o formulário, como sempre.
 */
import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { apiService } from "@/services/apiService";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { eventDateLabel } from "@/utils/event";
import { colors } from "@/constants/theme";

const QUANTOS_FLYERS = 6;

function Vitrine() {
  const { data } = useQuery({
    queryKey: ["vitrine-de-entrada"],
    queryFn: () => apiService.getEvents(1, 20),
    staleTime: 5 * 60_000,
  });
  const roles = (data?.data ?? []).filter((e) => !!e.photoUrl).slice(0, QUANTOS_FLYERS);

  return (
    <View style={{ flex: 1, maxWidth: 560, gap: 28 }}>
      <Logo height={34} />
      <View style={{ gap: 12 }}>
        <Text style={{ color: colors.onSurface, fontSize: 40, lineHeight: 44, fontWeight: "800", letterSpacing: -0.8 }}>
          A rede do seu carro{"\n"}
          <Text style={{ color: colors.primaryContainer }}>e dos seus encontros</Text>
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 16, lineHeight: 24, maxWidth: 460 }}>
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {roles.map((r) => {
              const { day, month } = eventDateLabel(r.startsAt);
              return (
                <View
                  key={r.id}
                  style={{ width: "32%", aspectRatio: 4 / 5, backgroundColor: colors.surfaceContainer, overflow: "hidden" }}
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
                      {day} {month}
                    </Text>
                    <Text style={{ color: colors.onSurface, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export function TelaDeEntrada({ children }: { children: React.ReactNode }) {
  const larga = useLarguraAmpla();
  if (!larga) return <>{children}</>;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 72,
        paddingHorizontal: 48,
        backgroundColor: colors.surface,
      }}
    >
      <Vitrine />
      <View
        style={{
          width: 420,
          height: 680,
          maxHeight: "92%",
          backgroundColor: colors.surfaceLow,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}
