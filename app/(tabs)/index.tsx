import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
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
