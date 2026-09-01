import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Users } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { RowSkeleton } from "@/components/ui/States";
import { useEventAttendees } from "@/stores/eventsStore";
import { colors } from "@/constants/theme";
import type { EventAttendee } from "@/types";

/**
 * A lista de presença é o que faz o evento valer pra quem organiza: story
 * de Instagram não diz quem vai, e é isso que decide estrutura e espaço.
 */
export function AttendeesSheet({
  eventId,
  visible,
  onClose,
}: {
  eventId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventAttendees(
    eventId,
    visible
  );

  const attendees = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;

  const renderItem = ({ item }: { item: EventAttendee }) => {
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
      title={total > 0 ? `Confirmados · ${total}` : "Confirmados"}
    >
      <View style={{ maxHeight: 400 }}>
        <FlatList
          data={attendees}
          keyExtractor={(a) => a.userId}
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
                <Users size={28} color={colors.outline} />
                <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                  Ninguém confirmou ainda.
                </Text>
              </View>
            )
          }
        />
      </View>
    </BottomSheet>
  );
}
