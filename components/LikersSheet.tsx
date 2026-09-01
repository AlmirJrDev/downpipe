import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { RowSkeleton } from "@/components/ui/States";
import { usePostLikers } from "@/stores/socialStore";
import { colors } from "@/constants/theme";
import type { PostLiker } from "@/types";

export function LikersSheet({
  postId,
  visible,
  onClose,
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePostLikers(
    postId,
    visible
  );

  const likers = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;

  const renderItem = ({ item }: { item: PostLiker }) => {
    // O backend devolve username null se o perfil sumiu — sem isso a linha
    // viraria "@null" e navegaria pra lugar nenhum.
    const hasProfile = !!item.username;
    return (
      <Pressable
        onPress={() => {
          if (!hasProfile) return;
          onClose();
          router.push(`/user/${item.username}`);
        }}
        disabled={!hasProfile}
        className="flex-row items-center gap-3 px-5 py-3 active:opacity-60"
      >
        <UserAvatar uri={item.avatarUrl ?? ""} size={38} />
        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
            {hasProfile ? `@${item.username}` : "Perfil removido"}
          </Text>
          {item.displayName ? (
            <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
              {item.displayName}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={total > 0 ? `Curtidas · ${total}` : "Curtidas"}
    >
      <View style={{ maxHeight: 400 }}>
        <FlatList
          data={likers}
          keyExtractor={(l) => l.userId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <RowSkeleton /> : null}
          ListEmptyComponent={
            isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View className="py-8 items-center gap-2">
                <Heart size={28} color={colors.outline} />
                <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                  Ninguém curtiu ainda.
                </Text>
              </View>
            )
          }
        />
      </View>
    </BottomSheet>
  );
}
