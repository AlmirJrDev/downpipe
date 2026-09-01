import React, { useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { EmptyState } from "@/components/ui/States";
import { apiService } from "@/services/apiService";
import { colors, spacing } from "@/constants/theme";
import type { Post } from "@/types";

/**
 * Publicações de um perfil em formato de feed, abertas a partir da grade e
 * já posicionadas na publicação tocada — dá pra continuar rolando pelas
 * outras em vez de voltar pra grade a cada uma.
 */
export default function UserPostsScreen() {
  const { username, postId } = useLocalSearchParams<{ username: string; postId?: string }>();
  const listRef = useRef<FlatList<Post>>(null);

  // Mesma queryKey do perfil: quando se chega pela grade os dados já estão
  // no cache, então a tela abre instantânea, sem spinner.
  const { data, isLoading } = useQuery({
    queryKey: ["posts-by-username", username, 1, 30],
    queryFn: () => apiService.getPostsByUsername(username, 1, 30),
    enabled: !!username,
  });

  const posts = useMemo(() => data?.data ?? [], [data]);
  const initialIndex = useMemo(() => {
    if (!postId) return 0;
    const i = posts.findIndex((p) => p.id === postId);
    return i > 0 ? i : 0;
  }, [posts, postId]);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title={`@${username}`}
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
        <EmptyState title="Nenhuma publicação" description="Este perfil ainda não publicou nada." />
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
          // Os cards têm alturas diferentes (normal, evolução, atualização de
          // projeto), então não dá pra usar getItemLayout: o salto inicial
          // pode falhar e é retentado depois que o layout se resolve.
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 300);
          }}
        />
      )}
    </View>
  );
}
