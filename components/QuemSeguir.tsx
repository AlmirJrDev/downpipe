/**
 * Fileira de "quem seguir", no topo do feed.
 *
 * O feed cai no global quando a pessoa não segue ninguém, então ela nunca vê
 * tela vazia — e é justamente por isso que ela não segue ninguém: passa a
 * semana olhando foto de estranho, sem perceber que dá pra acompanhar alguém.
 *
 * Some sozinha quando a pessoa já segue gente suficiente: passado esse ponto,
 * o feed dela é dela, e a fileira só roubaria espaço das fotos.
 */
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToggleFollow } from "@/stores/socialStore";
import { colors, typography } from "@/constants/theme";
import type { Sugestao } from "@/types";

/** A partir daqui a pessoa já tem feed próprio e a fileira sai de cena. */
const JA_SEGUE_GENTE = 5;

function Cartao({ sugestao }: { sugestao: Sugestao }) {
  const seguir = useToggleFollow(sugestao.username);
  // Seguido some da lista no próximo carregamento; até lá, o botão responde
  // na hora pra não parecer que o toque não pegou.
  const [seguindo, setSeguindo] = React.useState(false);

  const resumo = [
    sugestao.carsCount > 0 &&
      `${sugestao.carsCount} ${sugestao.carsCount === 1 ? "carro" : "carros"}`,
    sugestao.postsCount > 0 &&
      `${sugestao.postsCount} ${sugestao.postsCount === 1 ? "foto" : "fotos"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={() => router.push(`/user/${sugestao.username}`)}
      className="border border-border bg-card p-3 mr-2 items-center active:opacity-90"
      style={{ width: 150 }}
    >
      <UserAvatar uri={sugestao.avatarUrl ?? ""} size={56} />
      <Text
        className="text-on-surface mt-2"
        style={{ fontSize: 13, fontWeight: "600" }}
        numberOfLines={1}
      >
        @{sugestao.username}
      </Text>
      <Text className="text-muted mt-0.5" style={{ fontSize: 11 }} numberOfLines={1}>
        {resumo || (sugestao.isOrganizer ? "Organiza rolês" : "Por aqui há pouco")}
      </Text>

      <Pressable
        onPress={() => {
          setSeguindo(true);
          seguir.mutate(
            { userId: sugestao.id, following: false },
            { onError: () => setSeguindo(false) }
          );
        }}
        disabled={seguindo}
        className={`w-full items-center py-2 mt-2.5 ${
          seguindo ? "border border-outline" : "bg-primary-container"
        }`}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
            color: seguindo ? colors.onSurfaceVariant : colors.onPrimaryContainer,
          }}
        >
          {seguindo ? "SEGUINDO" : "SEGUIR"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export function QuemSeguir() {
  const { data: me } = useCurrentUser();
  const jaTemFeedProprio = (me?.followingCount ?? 0) >= JA_SEGUE_GENTE;

  const { data: sugestoes, isPending } = useQuery({
    queryKey: ["sugestoes"],
    queryFn: () => apiService.getSugestoes(),
    enabled: !!me && !jaTemFeedProprio,
    // Não muda de minuto a minuto, e a lista reaparecer diferente a cada
    // volta pro feed só confunde.
    staleTime: 10 * 60_000,
  });

  if (!me || jaTemFeedProprio) return null;
  if (isPending) {
    return (
      <View className="py-6">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!sugestoes || sugestoes.length === 0) return null;

  return (
    <View className="mb-5">
      <Text className="text-on-surface mb-3" style={typography.labelCaps}>
        Quem seguir
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {sugestoes.map((s) => (
          <Cartao key={s.id} sugestao={s} />
        ))}
      </ScrollView>
    </View>
  );
}
