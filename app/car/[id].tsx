import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Share } from "@/utils/share";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Pencil, Share2, Wrench } from "lucide-react-native";
import { useCarById, useCarPosts } from "@/stores/garageStore";
import { useModsByCar } from "@/stores/projectStore";
import { ImageGallery } from "@/components/ImageGallery";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ModificationCard } from "@/components/cards/ModificationCard";
import { EmptyState } from "@/components/ui/States";
import { PrimaryButton } from "@/components/ui/Button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { carCatalogName, carTitle, carYear } from "@/utils/car";
import { postThumbnail } from "@/utils/post";
import { colors } from "@/constants/theme";

// "Manutenção" existia como aba, prometia "registre trocas de óleo, revisões
// e reparos" e não tinha nada atrás — nem tabela, nem endpoint. Removida em
// vez de fingir: quando existir o domínio de manutenção, a aba volta.
type TabKey = "overview" | "mods" | "history";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "mods", label: "Mods" },
  { key: "history", label: "Histórico" },
];

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text
        className="text-on-surface-variant"
        style={{ fontSize: 10, letterSpacing: 1.2 }}
      >
        {label}
      </Text>
      <Text className="text-on-surface mt-1" style={{ fontSize: 16, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

export default function CarDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("overview");

  const { data: resolvedCar, isLoading } = useCarById(id);
  const { data: mods } = useModsByCar(id);
  const { data: carPostsPage } = useCarPosts(id);
  const carPosts = carPostsPage?.data ?? [];
  // Grade de 3 colunas dentro do padding de 20 da tela.
  const { width } = useWindowDimensions();
  const carThumb = (width - 40 - 6) / 3;
  const { data: me } = useCurrentUser();
  const isOwner = !!me && !!resolvedCar && me.id === resolvedCar.ownerId;

  if (!resolvedCar) {
    return (
      <View className="flex-1 bg-surface items-center justify-center" style={{ paddingTop: insets.top }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <EmptyState title="Carro não encontrado" description="Esse veículo não existe mais na garagem." />
        )}
      </View>
    );
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

  const historyEntries = [
    ...(mods ?? [])
      .slice()
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .map((m) => ({
        key: m.id,
        title: m.name,
        subtitle: [
          m.date ? formatDate(m.date) : null,
          m.category,
          m.cost != null ? `R$ ${m.cost.toLocaleString("pt-BR")}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        highlight: true,
      })),
    {
      key: "created",
      title: "Adicionado à garagem",
      subtitle: formatDate(resolvedCar.createdAt),
      highlight: false,
    },
  ];

  // Texto, e não link: o app ainda não tem endereço público, e um deep link
  // downpipe:// não abre nada pra quem não tem o app.
  const shareCar = async () => {
    const linhas = [
      resolvedCar.owner
        ? `${carTitle(resolvedCar)} de @${resolvedCar.owner.username} — Downpipe`
        : `${carTitle(resolvedCar)} — Downpipe`,
      resolvedCar.power != null ? `${resolvedCar.power} cv` : null,
      `Investido: R$ ${resolvedCar.amountInvested.toLocaleString("pt-BR")}`,
      resolvedCar.description,
    ].filter(Boolean);

    try {
      await Share.share({ message: linhas.join("\n") });
    } catch {
      // Cancelar o menu de compartilhamento não é erro.
    }
  };

  const gallery = resolvedCar.photoUrl ? [resolvedCar.photoUrl] : [];
  const year = carYear(resolvedCar);
  const catalogName = carCatalogName(resolvedCar);
  const engineDisplacement = resolvedCar.engine?.split(" ")[0].replace(/[^\d.]/g, "");
  const projectDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(resolvedCar.createdAt).getTime()) / 86_400_000)
  );

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <ImageGallery images={gallery} height={380} />
          <View
            style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16 }}
            className="flex-row justify-between"
          >
            <Pressable
              onPress={() => router.back()}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.overlayMedium }}
            >
              <ArrowLeft size={18} color={colors.onSurface} />
            </Pressable>
            <View className="flex-row gap-2">
              {/* Editar só pro dono: o backend recusa PATCH de carro alheio
                  (403), então não faz sentido oferecer o botão. */}
              {isOwner && (
                <Pressable
                  onPress={() => router.push(`/edit-car/${resolvedCar.id}`)}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.overlayMedium }}
                >
                  <Pencil size={16} color={colors.onSurface} />
                </Pressable>
              )}
              <Pressable
                onPress={shareCar}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.overlayMedium }}
              >
                <Share2 size={16} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-5 pt-4">
          <Text className="text-on-surface" style={{ fontSize: 22, fontWeight: "600" }}>
            {carTitle(resolvedCar)}
            {year ? ` ${year}` : ""}
            {engineDisplacement ? ` • ${engineDisplacement}` : ""}
          </Text>
          {/* Nome completo da FIPE: some quando é igual ao nome escolhido,
              pra não repetir a mesma linha duas vezes. */}
          {catalogName && catalogName !== carTitle(resolvedCar) && (
            <Text className="text-muted mt-1" style={{ fontSize: 12 }}>
              {catalogName}
            </Text>
          )}

          {resolvedCar.owner && (
            <Pressable
              onPress={() => router.push(`/user/${resolvedCar.owner!.username}`)}
              className="flex-row items-center gap-2 mt-3"
              hitSlop={6}
            >
              <UserAvatar uri={resolvedCar.owner.avatarUrl ?? ""} size={26} />
              <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                de <Text style={{ fontWeight: "600" }}>@{resolvedCar.owner.username}</Text>
              </Text>
            </Pressable>
          )}

          <View className="flex-row border-y border-border my-4 py-3">
            <StatBlock label="POTÊNCIA" value={resolvedCar.power != null ? `${resolvedCar.power} cv` : "—"} />
            <StatBlock
              label="QUILOMETRAGEM"
              value={resolvedCar.mileage != null ? `${resolvedCar.mileage.toLocaleString("pt-BR")} km` : "—"}
            />
            <StatBlock label="INVESTIDO" value={`R$ ${resolvedCar.amountInvested.toLocaleString("pt-BR")}`} />
            {/* Rolês em que o carro apareceu. Derivado das publicações
                marcadas com evento — é o único vínculo que existe entre
                carro e encontro. */}
            <StatBlock label="ROLÊS" value={String(resolvedCar.eventsCount ?? 0)} />
          </View>

          <View className="flex-row border-b border-border mb-4">
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} className="mr-6 pb-3">
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 0.5,
                    color: tab === t.key ? colors.onSurface : colors.muted,
                  }}
                >
                  {t.label.toUpperCase()}
                </Text>
                {tab === t.key && (
                  <View style={{ height: 2, backgroundColor: colors.primaryContainer, marginTop: 8 }} />
                )}
              </Pressable>
            ))}
          </View>

          {tab === "overview" && (
            <View style={{ gap: 20 }} className="mb-8">
              {resolvedCar.description && (
                <Text className="text-on-surface-variant" style={{ fontSize: 14, lineHeight: 22 }}>
                  {resolvedCar.description}
                </Text>
              )}
              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1 border border-border p-4" style={{ minWidth: 140 }}>
                  <Text className="text-on-surface-variant" style={{ fontSize: 10, letterSpacing: 1 }}>
                    TEMPO DE PROJETO
                  </Text>
                  <Text className="text-on-surface mt-1" style={{ fontSize: 18, fontWeight: "600" }}>
                    {projectDays} dias
                  </Text>
                </View>
                <View className="flex-1 border border-border p-4" style={{ minWidth: 140 }}>
                  <Text className="text-on-surface-variant" style={{ fontSize: 10, letterSpacing: 1 }}>
                    VALOR INVESTIDO
                  </Text>
                  <Text className="text-on-surface mt-1" style={{ fontSize: 18, fontWeight: "600" }}>
                    R$ {resolvedCar.amountInvested.toLocaleString("pt-BR")}
                  </Text>
                </View>
              </View>
              <PrimaryButton
                label="Ver projeto completo"
                onPress={() => router.push(`/project/${resolvedCar.id}`)}
              />

              {/* Fotos deste carro, inclusive as tiradas por outras pessoas.
                  O crédito é o que faz valer a pena o fotógrafo postar aqui
                  em vez de só no Instagram dele. */}
              {carPosts.length > 0 && (
                <View className="mt-2">
                  <Text className="text-on-surface mb-3" style={{ fontSize: 14, fontWeight: "600" }}>
                    Fotos deste carro
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: 3 }}>
                    {carPosts.map((post) => {
                      const thumb = postThumbnail(post);
                      if (!thumb) return null;
                      // Foto de outra pessoa ganha o crédito por cima.
                      const deOutro =
                        !!post.author && post.author.username !== resolvedCar.owner?.username;
                      return (
                        <Pressable
                          key={post.id}
                          onPress={() =>
                            post.author &&
                            router.push(`/user-posts/${post.author.username}?postId=${post.id}`)
                          }
                          style={{ width: carThumb, height: carThumb }}
                          className="active:opacity-80"
                        >
                          <Image
                            source={{ uri: thumb }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={150}
                          />
                          {deOutro && (
                            <View
                              className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                              style={{ backgroundColor: colors.overlayStrong }}
                            >
                              <Text
                                className="text-on-surface"
                                style={{ fontSize: 9 }}
                                numberOfLines={1}
                              >
                                por @{post.author!.username}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {tab === "mods" && (
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
                  Modificações
                </Text>
                <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                  {new Date().getFullYear()}
                </Text>
              </View>
              {!mods || mods.length === 0 ? (
                // Só o dono registra modificação (o backend recusa carro
                // alheio com 403) — pra visitante o estado vazio é informativo,
                // sem botão que levaria a erro.
                <EmptyState
                  icon={<Wrench size={28} color={colors.outline} />}
                  title="Sem modificações"
                  description={
                    isOwner
                      ? "Registre a primeira modificação deste projeto."
                      : "Este carro ainda não tem modificações registradas."
                  }
                  actionLabel={isOwner ? "+ Adicionar modificação" : undefined}
                  onAction={
                    isOwner
                      ? () => router.push(`/add-modification?carId=${resolvedCar.id}`)
                      : undefined
                  }
                />
              ) : (
                mods.map((m) => (
                  <ModificationCard
                    key={m.id}
                    mod={m}
                    onPress={
                      isOwner
                        ? () =>
                            router.push(
                              `/add-modification?carId=${resolvedCar.id}&modId=${m.id}`
                            )
                        : undefined
                    }
                  />
                ))
              )}
            </View>
          )}

          {/* Histórico mostrava só a data de cadastro, o que fazia parecer que
              as modificações registradas tinham sumido — elas estavam na aba
              "Mods". Agora é uma linha do tempo de verdade: modificações da
              mais recente pra mais antiga, terminando na entrada na garagem. */}
          {tab === "history" && (
            <View className="mb-8">
              {historyEntries.map((entry, i) => (
                <View key={entry.key} className="flex-row">
                  <View className="items-center mr-3" style={{ width: 12 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        marginTop: 6,
                        backgroundColor: entry.highlight ? colors.primary : colors.outline,
                      }}
                    />
                    {i < historyEntries.length - 1 && (
                      <View
                        style={{
                          width: 1,
                          flex: 1,
                          minHeight: 24,
                          backgroundColor: colors.outlineVariant,
                          marginVertical: 2,
                        }}
                      />
                    )}
                  </View>
                  <View className="flex-1 pb-5">
                    <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "500" }}>
                      {entry.title}
                    </Text>
                    <Text className="text-muted mt-0.5" style={{ fontSize: 12 }}>
                      {entry.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
