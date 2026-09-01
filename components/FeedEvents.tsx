import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, Check, Users } from "lucide-react-native";
import { useEvents, useToggleAttendance } from "@/stores/eventsStore";
import { eventDateLabel } from "@/utils/event";
import { colors, spacing, typography } from "@/constants/theme";
import type { CarEvent } from "@/types";

/**
 * Próximos rolês no topo do feed, com "eu vou" ali mesmo.
 *
 * Faixa horizontal em vez de intercalar cards no meio das publicações:
 * evento é sensível ao tempo, então precisa estar sempre visível no topo —
 * e intercalado ele apareceria em posição aleatória, às vezes só depois de
 * muita rolagem. Do jeito que ficou, é a primeira coisa que se vê.
 */
export function FeedEvents() {
  const { data, isLoading } = useEvents({});
  const toggleAttendance = useToggleAttendance();

  const events = useMemo(() => (data?.pages.flatMap((p) => p.data) ?? []).slice(0, 10), [data]);

  // Nada marcado ainda: some em vez de mostrar um trilho vazio.
  if (!isLoading && events.length === 0) return null;

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-on-surface" style={typography.labelCaps}>
          Próximos rolês
        </Text>
        <Pressable onPress={() => router.push("/(tabs)/explore")} hitSlop={8}>
          <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
            Ver todos
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {events.map((event) => (
            <EventStripCard
              key={event.id}
              event={event}
              onToggle={() =>
                toggleAttendance.mutate({
                  eventId: event.id,
                  attending: !!event.attendingByMe,
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EventStripCard({ event, onToggle }: { event: CarEvent; onToggle: () => void }) {
  const { weekday, day, month } = eventDateLabel(event.startsAt);
  const going = !!event.attendingByMe;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      className="border border-border bg-card overflow-hidden active:opacity-90"
      style={{ width: 190 }}
    >
      <View style={{ height: 84 }}>
        {event.photoUrl ? (
          <Image
            source={{ uri: event.photoUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="flex-1" style={{ backgroundColor: colors.surfaceContainer }} />
        )}

        {/* Data sobre a foto: é o dado que decide se a pessoa pode ir. */}
        <View
          className="absolute items-center px-2 py-1"
          style={{ top: 6, left: 6, backgroundColor: colors.overlayStrong }}
        >
          <Text className="text-primary" style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1 }}>
            {weekday}
          </Text>
          <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "700", lineHeight: 18 }}>
            {day}
          </Text>
          <Text
            className="text-on-surface-variant"
            style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
          >
            {month}
          </Text>
        </View>
      </View>

      <View className="px-3 pt-2 pb-3" style={{ gap: 6 }}>
        <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
          {event.name}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <Users size={11} color={colors.onSurfaceVariant} />
          <Text className="text-muted flex-1" style={{ fontSize: 11 }} numberOfLines={1}>
            {event.attendeesCount} · {event.city}
          </Text>
        </View>

        {/* O "eu vou" fica aqui mesmo: decidir ir não deveria custar abrir
            outra tela. */}
        <Pressable
          onPress={onToggle}
          hitSlop={4}
          className={`flex-row items-center justify-center gap-1.5 py-2 ${
            going ? "border border-outline" : "bg-primary-container"
          }`}
        >
          {going ? (
            <>
              <Check size={12} color={colors.success} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success, letterSpacing: 1 }}>
                VOU
              </Text>
            </>
          ) : (
            <>
              <CalendarDays size={12} color={colors.onPrimaryContainer} />
              <Text
                className="text-on-primary-container"
                style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}
              >
                EU VOU
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}
