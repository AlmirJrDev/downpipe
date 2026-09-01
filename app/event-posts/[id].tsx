import React, { useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { EmptyState } from "@/components/ui/States";
import { useEventPosts, useEventById } from "@/stores/eventsStore";
import { colors, spacing } from "@/constants/theme";
import type { Post } from "@/types";

/**
 * Feed do rolê: só as publicações marcadas com aquele evento.
 *
 * Existe separado do feed do perfil porque abrir uma foto do encontro e cair
 * nas publicações soltas de quem postou quebra o contexto — quem chegou ali
 * está vendo o rolê, não a pessoa.
 */
export default function EventPostsScreen() {
  const { id, postId } = useLocalSearchParams<{ id: string; postId?: string }>();
  const listRef = useRef<FlatList<Post>>(null);

  const { data: event } = useEventById(id);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventPosts(id);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const initialIndex = useMemo(() => {
    if (!postId) return 0;
    const i = posts.findIndex((p) => p.id === postId);
    return i > 0 ? i : 0;
  }, [posts, postId]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title={event?.name ?? "No rolê"}
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <EmptyState
          title="Nada registrado ainda"
          description="Quem for ao rolê pode marcar o evento na publicação, e as fotos aparecem aqui."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} />}
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingHorizontal: spacing.marginMobile,
            paddingBottom: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
          // Os cards têm alturas diferentes, então não dá pra usar
          // getItemLayout: o salto inicial pode falhar e é retentado depois
          // que o layout se resolve.
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 300);
          }}
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
