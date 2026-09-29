/**
 * A coluna à direita do feed, no computador.
 *
 * O papel das "Sugestões para você" do Instagram web: o que no celular
 * disputa espaço no topo do feed — quem seguir e os próximos rolês — mora
 * aqui, ao lado, e o feed fica só com as fotos. É também onde o rolê ganha
 * lugar fixo na tela principal: no celular ele some assim que a pessoa rola.
 */
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEvents } from "@/stores/eventsStore";
import { useToggleFollow } from "@/stores/socialStore";
import { apiService } from "@/services/apiService";
import { eventDateLabel } from "@/utils/event";
import { abrirLegal } from "@/utils/legal";
import { colors } from "@/constants/theme";
import type { CarEvent, Sugestao } from "@/types";

export const LARGURA_DA_COLUNA_DIREITA = 320;

const TITULO = { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: "700" as const, letterSpacing: 1.3 };

function Cabecalho({ titulo, acao, onAcao }: { titulo: string; acao?: string; onAcao?: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <Text style={TITULO}>{titulo}</Text>
      {acao && onAcao && (
        <Pressable onPress={onAcao} hitSlop={6}>
          <Text style={{ color: colors.onSurface, fontSize: 12, fontWeight: "600" }}>{acao}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Role({ evento }: { evento: CarEvent }) {
  const data = eventDateLabel(evento.startsAt);
  const capa = evento.photoThumbUrl ?? evento.photoUrl;
  return (
    <Pressable
      onPress={() => router.push(`/event/${evento.id}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          backgroundColor: colors.surfaceContainer,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {capa ? (
          <Image source={{ uri: capa }} style={{ width: 44, height: 44 }} contentFit="cover" />
        ) : (
          <>
            <Text style={{ color: colors.onSurface, fontSize: 15, fontWeight: "800", lineHeight: 16 }}>{data.day}</Text>
            <Text style={{ color: colors.primary, fontSize: 8, fontWeight: "700", letterSpacing: 1 }}>{data.month}</Text>
          </>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.onSurface, fontSize: 13.5, fontWeight: "600" }} numberOfLines={1}>
          {evento.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
          {data.weekday} {data.day} {data.month} · {evento.city}
        </Text>
      </View>
    </Pressable>
  );
}

function Pessoa({ sugestao }: { sugestao: Sugestao }) {
  const seguir = useToggleFollow(sugestao.username);
  const [seguindo, setSeguindo] = useState(false);
  const resumo =
    sugestao.carsCount > 0
      ? `${sugestao.carsCount} ${sugestao.carsCount === 1 ? "carro" : "carros"} na garagem`
      : sugestao.isOrganizer
        ? "Organiza rolês"
        : "Por aqui há pouco";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>
      <Pressable onPress={() => router.push(`/user/${sugestao.username}`)}>
        <UserAvatar uri={sugestao.avatarUrl ?? ""} size={40} />
      </Pressable>
      <Pressable onPress={() => router.push(`/user/${sugestao.username}`)} style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.onSurface, fontSize: 13.5, fontWeight: "600" }} numberOfLines={1}>
          @{sugestao.username}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
          {resumo}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setSeguindo(true);
          seguir.mutate({ userId: sugestao.id, following: false }, { onError: () => setSeguindo(false) });
        }}
        disabled={seguindo}
        hitSlop={6}
      >
        <Text
          style={{
            color: seguindo ? colors.muted : colors.primary,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
          }}
        >
          {seguindo ? "SEGUINDO" : "SEGUIR"}
        </Text>
      </Pressable>
    </View>
  );
}

export function ColunaDaDireita() {
  const { data: me } = useCurrentUser();
  const { data: paginas } = useEvents({});
  const roles = useMemo(() => (paginas?.pages.flatMap((p) => p.data) ?? []).slice(0, 5), [paginas]);

  // Mesma chave da fileira do celular: é o mesmo dado, vindo do mesmo cache.
  const { data: sugestoes } = useQuery({
    queryKey: ["sugestoes"],
    queryFn: () => apiService.getSugestoes(),
    enabled: !!me,
    staleTime: 10 * 60_000,
  });

  return (
    <View style={{ width: LARGURA_DA_COLUNA_DIREITA, paddingTop: 28, gap: 28 }}>
      {me && (
        <Pressable
          onPress={() => router.navigate("/(tabs)/profile" as never)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <UserAvatar uri={me.avatarUrl ?? ""} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
              @{me.username}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
              {me.displayName}
            </Text>
          </View>
        </Pressable>
      )}

      {roles.length > 0 && (
        <View>
          <Cabecalho titulo="PRÓXIMOS ROLÊS" acao="Ver todos" onAcao={() => router.navigate("/(tabs)/explore" as never)} />
          {roles.map((r) => (
            <Role key={r.id} evento={r} />
          ))}
        </View>
      )}

      {!!sugestoes?.length && (
        <View>
          <Cabecalho titulo="QUEM SEGUIR" />
          {sugestoes.slice(0, 5).map((s) => (
            <Pessoa key={s.id} sugestao={s} />
          ))}
        </View>
      )}

      <Text style={{ color: colors.muted, fontSize: 11.5, lineHeight: 18 }}>
        <Text onPress={() => abrirLegal("privacidade")}>Privacidade</Text>
        {"  ·  "}
        <Text onPress={() => abrirLegal("termos")}>Termos</Text>
        {"\n"}© Downpipe
      </Text>
    </View>
  );
}
