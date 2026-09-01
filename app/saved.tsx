import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Bookmark } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { EmptyState } from "@/components/ui/States";
import { useSavedPosts } from "@/stores/socialStore";
import { colors, spacing } from "@/constants/theme";

export default function SavedPostsScreen() {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSavedPosts();

  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Salvos"
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
      ) : (
        // Cards inteiros em vez de grade: salvo geralmente é referência de
        // build — o valor está na legenda e no custo, não só na foto.
        <FlatList
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
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
          ListEmptyComponent={
            <EmptyState
              icon={<Bookmark size={32} color={colors.outline} />}
              title="Nada salvo ainda"
              description="Toque no marcador de uma publicação pra guardar como referência. Só você vê o que salvou."
            />
          }
        />
      )}
    </View>
  );
}
