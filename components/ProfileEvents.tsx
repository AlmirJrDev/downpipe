import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CalendarPlus } from "lucide-react-native";
import { EventCard } from "@/components/cards/EventCard";
import { useEventsByOrganizer } from "@/stores/eventsStore";
import { colors, spacing, typography } from "@/constants/theme";

/**
 * Rolês na página do organizador. É a tela que interessa a quem já organiza
 * encontro hoje: uma página que não some em 24h, com o histórico e a lista
 * de confirmados — que é o que o story do Instagram não entrega.
 *
 * Não renderiza nada para quem não marcou o perfil como organizador e não
 * tem evento nenhum, pra não poluir o perfil de quem só tem carro.
 */
export function ProfileEvents({
  username,
  isOrganizer,
  isMe,
}: {
  username: string;
  isOrganizer: boolean;
  isMe: boolean;
}) {
  const { data } = useEventsByOrganizer(username);
  const events = data?.data ?? [];

  if (!isOrganizer && events.length === 0) return null;

  return (
    <View className="mt-8">
      <View
        className="flex-row items-center justify-between mb-3"
        style={{ paddingHorizontal: spacing.marginMobile }}
      >
        <Text className="text-on-surface" style={typography.labelCaps}>
          Rolês
        </Text>
        {isMe && (
          <Pressable
            onPress={() => router.push("/add-event")}
            hitSlop={8}
            className="flex-row items-center gap-1.5"
          >
            <CalendarPlus size={14} color={colors.primary} />
            <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
              Novo
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.marginMobile }}>
        {events.length === 0 ? (
          <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
            {isMe
              ? "Você ainda não marcou nenhum encontro."
              : "Nenhum encontro marcado no momento."}
          </Text>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </View>
    </View>
  );
}
