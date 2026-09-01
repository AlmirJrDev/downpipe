import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { CalendarDays, ChevronRight, MapPin, Users, X } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { eventDateLabel, eventFullDate } from "@/utils/event";
import type { CarEvent } from "@/types";

/**
 * Prévia do rolê ao tocar um pino no mapa.
 *
 * Card nativo em vez do popup do MapLibre: só assim dá pra mostrar foto e
 * seguir o visual do resto do app. Tocar nele abre o evento; o X (ou tocar
 * no mapa) fecha.
 */
export function EventPreviewCard({
  event,
  onOpen,
  onClose,
}: {
  event: CarEvent;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { day, month } = eventDateLabel(event.startsAt);

  return (
    <Pressable
      onPress={onOpen}
      className="flex-row border border-border active:opacity-90"
      style={{ backgroundColor: colors.card }}
    >
      {event.photoUrl ? (
        <Image
          source={{ uri: event.photoUrl }}
          style={{ width: 92, height: 92 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        // Sem foto, o bloco de data ocupa o lugar dela: o card mantém a
        // mesma silhueta em vez de encolher e dançar na tela.
        <View
          className="items-center justify-center"
          style={{ width: 92, height: 92, backgroundColor: colors.surfaceContainer }}
        >
          <Text className="text-on-surface" style={{ fontSize: 24, fontWeight: "700" }}>
            {day}
          </Text>
          <Text
            className="text-primary"
            style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}
          >
            {month}
          </Text>
        </View>
      )}

      <View className="flex-1 px-3 py-2.5 justify-center">
        <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {event.name}
        </Text>

        <View className="flex-row items-center gap-1.5 mt-1">
          <CalendarDays size={11} color={colors.primary} />
          <Text className="text-primary flex-1" style={{ fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
            {eventFullDate(event.startsAt)}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 mt-0.5">
          <MapPin size={11} color={colors.onSurfaceVariant} />
          <Text className="text-on-surface-variant flex-1" style={{ fontSize: 11 }} numberOfLines={1}>
            {event.location} · {event.city}
          </Text>
        </View>

        <View className="flex-row items-center gap-3 mt-1.5">
          <View className="flex-row items-center gap-1">
            <Users size={11} color={colors.onSurfaceVariant} />
            <Text className="text-on-surface" style={{ fontSize: 11, fontWeight: "600" }}>
              {event.attendeesCount}
            </Text>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              {event.attendeesCount === 1 ? "confirmado" : "confirmados"}
            </Text>
          </View>

          {event.distanceKm != null && (
            <Text className="text-muted" style={{ fontSize: 11 }}>
              a {event.distanceKm} km
            </Text>
          )}

          {event.attendingByMe && (
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>você vai</Text>
          )}
        </View>
      </View>

      <View className="justify-between items-center py-2 pr-2">
        <Pressable onPress={onClose} hitSlop={10}>
          <X size={16} color={colors.muted} />
        </Pressable>
        <ChevronRight size={18} color={colors.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}
