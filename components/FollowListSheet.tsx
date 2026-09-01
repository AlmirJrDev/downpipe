import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Users } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CategoryChip } from "@/components/ui/Chips";
import { RowSkeleton } from "@/components/ui/States";
import { useFollowers, useFollowing } from "@/stores/socialStore";
import { colors } from "@/constants/theme";
import type { FollowProfile } from "@/types";

export type FollowTab = "followers" | "following";

/**
 * As duas listas numa folha só, com as abas em cima: quem abre "Seguidores"
 * quase sempre quer conferir "Seguindo" logo em seguida, e fechar/reabrir
 * pra isso seria atrito à toa.
 */
export function FollowListSheet({
  userId,
  tab,
  onTabChange,
  visible,
  onClose,
}: {
  userId: string;
  tab: FollowTab;
  onTabChange: (tab: FollowTab) => void;
  visible: boolean;
  onClose: () => void;
}) {
  // Só a aba visível busca — abrir uma folha não deve disparar dois
  // requests, sendo que um deles pode nunca ser visto.
  const followers = useFollowers(userId, visible && tab === "followers");
  const following = useFollowing(userId, visible && tab === "following");
  const query = tab === "followers" ? followers : following;

  const people = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data]
  );
  const total = query.data?.pages[0]?.pagination.total ?? 0;

  const renderItem = ({ item }: { item: FollowProfile }) => {
    // username null = perfil apagado; a linha vira só informativa.
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
      title={tab === "followers" ? "Seguidores" : "Seguindo"}
    >
      <View className="flex-row px-5 pb-3 pt-1">
        <CategoryChip
          label="Seguidores"
          active={tab === "followers"}
          onPress={() => onTabChange("followers")}
        />
        <CategoryChip
          label="Seguindo"
          active={tab === "following"}
          onPress={() => onTabChange("following")}
        />
      </View>

      <View style={{ maxHeight: 380 }}>
        <FlatList
          data={people}
          keyExtractor={(p) => `${p.id ?? "removido"}-${p.followedAt}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={query.isFetchingNextPage ? <RowSkeleton /> : null}
          ListEmptyComponent={
            query.isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View className="py-8 items-center gap-2">
                <Users size={28} color={colors.outline} />
                <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                  {tab === "followers" ? "Ninguém segue ainda." : "Não segue ninguém ainda."}
                </Text>
              </View>
            )
          }
        />
      </View>

      {total > 0 && (
        <Text className="text-muted text-center pt-2" style={{ fontSize: 12 }}>
          {total} {total === 1 ? "pessoa" : "pessoas"}
        </Text>
      )}
    </BottomSheet>
  );
}
