import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiService } from "@/services/apiService";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { GettingStarted } from "@/components/GettingStarted";
import { FeedEvents } from "@/components/FeedEvents";
import { FeedSkeleton } from "@/components/ui/States";
import { EmptyState } from "@/components/ui/States";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { colors, spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadCount } from "@/stores/notificationsStore";
import { Bell } from "lucide-react-native";

/** Quantas publicações à frente já começam a baixar a foto. */
const ADIANTAR = 4;

// Conta como visível a partir de 30% do card na tela. Esperar o card inteiro
// avisaria tarde demais pra adiantar alguma coisa.
const VISIBILIDADE = { itemVisiblePercentThreshold: 30 };

export default function HomeScreen() {
  const { data: me } = useCurrentUser();
  const { data: unreadCount = 0 } = useUnreadCount();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => apiService.getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });

  // likesCount/likedByMe já são atualizados direto no cache dessa query
  // (useToggleLike faz optimistic update aqui) — não precisa mais mesclar
  // com nenhuma store local.
  const feed = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  /**
   * Começa a baixar as fotos das próximas publicações antes de elas entrarem
   * na tela.
   *
   * O feed é foto grande. Esperar o card aparecer pra só então pedir a imagem
   * é o que faz a rolagem parecer lenta: a pessoa chega antes do arquivo. Com
   * isso, o download começa enquanto ela ainda está lendo o card de cima.
   *
   * Só as ADIANTAR seguintes, e cada uma uma vez só, pra não puxar o feed
   * inteiro no plano de dados de quem parou de rolar.
   */
  const feedRef = useRef(feed);
  feedRef.current = feed;
  const jaPedidas = useRef(new Set<string>());

  const adiantarProximasFotos = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const ultimoVisivel = viewableItems[viewableItems.length - 1]?.index;
      if (ultimoVisivel == null) return;

      const proximas = feedRef.current
        .slice(ultimoVisivel + 1, ultimoVisivel + 1 + ADIANTAR)
        .map((p) => p.imageUrl)
        .filter((url): url is string => !!url && !jaPedidas.current.has(url));

      if (proximas.length === 0) return;
      proximas.forEach((url) => jaPedidas.current.add(url));
      // Sem await: é adiantamento, e falhar aqui não muda nada — a imagem
      // será pedida de novo quando o card aparecer.
      void Image.prefetch(proximas);
    }
  ).current;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        left={
          <Pressable hitSlop={8} onPress={() => router.push("/notifications")}>
            <Bell size={20} color={colors.onSurfaceVariant} />
            {/* Badge com o número; vira "9+" pra não estourar o círculo. */}
            {unreadCount > 0 && (
              <View
                className="absolute items-center justify-center"
                style={{
                  top: -5,
                  right: -6,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor: colors.primaryContainer,
                }}
              >
                <Text
                  className="text-on-primary-container"
                  style={{ fontSize: 9, fontWeight: "700" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        }
        right={
          <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/profile")}>
            <UserAvatar uri={me?.avatarUrl ?? ""} size={28} />
          </Pressable>
        }
      />

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <EmptyState title="Erro ao carregar feed" description="Tente novamente em instantes." />
      ) : (
        // Feed vazio vira ListEmptyComponent em vez de um branch separado:
        // assim o checklist de primeiros passos (ListHeaderComponent) aparece
        // também pra quem ainda não tem nada no feed — justamente o usuário
        // novo, que é quem mais precisa dele.
        <FlatList
          data={feed}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} />}
          // Fundo explícito: é o que aparece na área de overscroll do
          // pull-to-refresh, que não é coberta pelo contentContainer.
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingHorizontal: spacing.marginMobile,
            paddingBottom: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <GettingStarted />
              <FeedEvents />
            </>
          }
          ListEmptyComponent={
            <EmptyState
              title="Feed vazio"
              description="Siga outros gearheads ou publique o primeiro post do seu build."
            />
          }
          onViewableItemsChanged={adiantarProximasFotos}
          viewabilityConfig={VISIBILIDADE}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
