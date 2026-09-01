import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, Link2, MapPin, Users } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { eventDateLabel } from "@/utils/event";
import type { CarEvent } from "@/types";

export function EventCard({ event }: { event: CarEvent }) {
  const { weekday, day, month } = eventDateLabel(event.startsAt);

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      className="border border-border bg-card mb-3 active:opacity-90"
    >
      {event.photoUrl && (
        <Image
          source={{ uri: event.photoUrl }}
          style={{ width: "100%", height: 140 }}
          contentFit="cover"
          transition={200}
        />
      )}

      <View className="flex-row p-4 gap-4">
        {/* Bloco de data no estilo folhinha: é o que a pessoa procura
            primeiro numa lista de rolê. */}
        <View className="items-center" style={{ minWidth: 48 }}>
          <Text
            className="text-primary"
            style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}
          >
            {weekday}
          </Text>
          <Text className="text-on-surface" style={{ fontSize: 26, fontWeight: "700", lineHeight: 30 }}>
            {day}
          </Text>
          <Text
            className="text-on-surface-variant"
            style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}
          >
            {month}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "600" }} numberOfLines={2}>
            {event.name}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1.5">
            <MapPin size={12} color={colors.onSurfaceVariant} />
            <Text className="text-on-surface-variant flex-1" style={{ fontSize: 12 }} numberOfLines={1}>
              {event.location} · {event.city}
            </Text>
            {/* Só existe em busca por raio — vira o critério de decisão da
                pessoa ("vale a viagem?"), então fica junto do endereço. */}
            {event.distanceKm != null && (
              <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
                {event.distanceKm} km
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-row items-center gap-1.5">
              <Users size={12} color={colors.primary} />
              <Text className="text-on-surface" style={{ fontSize: 12, fontWeight: "600" }}>
                {event.attendeesCount}
              </Text>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                {event.attendeesCount === 1 ? "confirmado" : "confirmados"}
              </Text>
            </View>

            {/* Marca de "por link" só aparece pro organizador, que é quem vê
                esse evento em listagem — pra mais ninguém ele é listado. */}
            {event.visibility === "link" && (
              <View className="flex-row items-center gap-1">
                <Link2 size={11} color={colors.muted} />
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  por link
                </Text>
              </View>
            )}

            {event.attendingByMe && (
              <View className="flex-row items-center gap-1">
                <CalendarDays size={11} color={colors.success} />
                <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>
                  você vai
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
