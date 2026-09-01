import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Car,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  Wrench,
} from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/States";
import { CategoryChip } from "@/components/ui/Chips";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/stores/notificationsStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { colors, spacing, typography } from "@/constants/theme";
import { timeAgo } from "@/utils/time";
import type { AppNotification, NotificationType } from "@/types";

const ICONS: Record<NotificationType, React.ComponentType<any>> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  project_update: Wrench,
  event_attend: CalendarDays,
  car_tag: Car,
};

function actionText(type: NotificationType): string {
  switch (type) {
    case "like":
      return "curtiu sua publicação";
    case "comment":
      return "comentou na sua publicação";
    case "follow":
      return "começou a seguir você";
    case "project_update":
      return "publicou uma atualização do projeto";
    case "event_attend":
      return "vai num rolê";
    case "car_tag":
      return "marcou seu carro numa foto";
  }
}

export default function NotificationsScreen() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: me } = useCurrentUser();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(unreadOnly);

  const notifications = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const hasUnread = notifications.some((n) => !n.readAt);

  /**
   * Para onde cada tipo leva. Curtida e comentário são sobre uma publicação
   * MINHA, então abrem no meu perfil; atualização de projeto é do outro, e
   * abre no perfil dele. Seguir vai direto pro perfil de quem seguiu.
   */
  const open = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);

    if (n.type === "follow") {
      if (n.actor) router.push(`/user/${n.actor.username}`);
      return;
    }

    // Presença em evento leva ao evento, não ao perfil de quem confirmou:
    // o interesse é "onde é esse rolê", não "quem é essa pessoa".
    if (n.type === "event_attend") {
      if (n.eventId) router.push(`/event/${n.eventId}`);
      return;
    }

    // A publicação é de quem marcou, não minha — abrir no meu perfil não
    // acharia a foto. Aqui o dono aceita ou recusa a marcação.
    const owner =
      n.type === "project_update" || n.type === "car_tag" ? n.actor?.username : me?.username;
    if (owner && n.postId) router.push(`/user-posts/${owner}?postId=${n.postId}`);
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const Icon = ICONS[item.type];
    const unread = !item.readAt;

    return (
      <Pressable
        onPress={() => open(item)}
        className="flex-row items-center gap-3 px-4 py-4 border-b border-outline-variant active:bg-white/5"
        // Fundo levemente destacado sinaliza não lida sem depender só do
        // ponto vermelho, que é pequeno.
        style={{ backgroundColor: unread ? colors.surfaceLow : "transparent" }}
      >
        <View>
          <UserAvatar uri={item.actor?.avatarUrl ?? ""} size={44} />
          <View
            className="absolute items-center justify-center"
            style={{
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon size={11} color={colors.primary} />
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 14, lineHeight: 20 }}>
            <Text style={{ fontWeight: "700" }}>@{item.actor?.username ?? "alguém"}</Text>{" "}
            {actionText(item.type)}
          </Text>
          <Text className="text-muted mt-0.5" style={{ fontSize: 12 }}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>

        {unread && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Notificações"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
        right={
          hasUnread ? (
            <Pressable hitSlop={8} onPress={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck size={20} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />

      <View className="flex-row px-4 py-3 border-b border-border">
        <CategoryChip label="Todas" active={!unreadOnly} onPress={() => setUnreadOnly(false)} />
        <CategoryChip label="Não lidas" active={unreadOnly} onPress={() => setUnreadOnly(true)} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
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
              icon={<Bell size={32} color={colors.outline} />}
              title={unreadOnly ? "Nada não lido" : "Sem notificações"}
              description={
                unreadOnly
                  ? "Você já viu tudo por aqui."
                  : "Quando curtirem, comentarem ou seguirem você, aparece aqui."
              }
            />
          }
        />
      )}
    </View>
  );
}
