/**
 * Encontro sugerido no meio do feed, do tamanho de uma publicação.
 *
 * Entra de vez em quando, na vaga que era dos anúncios — não como "fulano
 * publicou": o que importa é o encontro, não quem cadastrou. A data vem em
 * destaque logo abaixo da arte, porque é o que decide se a pessoa vai.
 *
 * "Eu vou" confirma direto daqui, sem abrir a página; o resto (carro,
 * rota, chat) fica na página do encontro.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarCheck, MapPin, Users } from "lucide-react-native";
import { useToggleAttendance } from "@/stores/eventsStore";
import { eventDateLabel, eventFullDate } from "@/utils/event";
import { colors } from "@/constants/theme";
import type { CarEvent } from "@/types";

export function FeedEventCard({ event }: { event: CarEvent }) {
  const toggle = useToggleAttendance();
  const { weekday, day, month } = eventDateLabel(event.startsAt);
  const vou = !!event.attendingByMe;
  const abrir = () => router.push(`/event/${event.id}`);
  // Quem organiza de verdade: o @ do Instagram quando o encontro veio de
  // fora, ou o perfil de quem criou aqui. Encontro cadastrado pela equipe
  // chega sem organizador (o servidor tira) e o cartão não credita ninguém.
  const credito = event.organizerInstagram
    ? `por @${event.organizerInstagram}`
    : event.organizer
      ? `por @${event.organizer.username}`
      : null;

  return (
    <View className="mb-6 border border-border bg-card">
      <Pressable onPress={abrir} className="flex-row items-center px-4 py-3 gap-3">
        <View
          className="items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceHighest }}
        >
          <CalendarCheck size={18} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
            Encontro em {event.city}
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 12 }} numberOfLines={1}>
            {credito ?? "Sugestão pra você"}
          </Text>
        </View>
      </Pressable>

      <Pressable onPress={abrir} accessibilityRole="link" accessibilityLabel={`Abrir ${event.name}`}>
        {event.photoUrl ? (
          <Image
            source={{ uri: event.photoUrl }}
            recyclingKey={event.id}
            style={{ width: "100%", height: 420 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        <View className="flex-row px-4 pt-4 gap-4">
          {/* Folhinha: o dia é a primeira coisa que se procura num encontro. */}
          <View className="items-center" style={{ minWidth: 48 }}>
            <Text className="text-primary" style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
              {weekday}
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 26, fontWeight: "700", lineHeight: 30 }}>
              {day}
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
              {month}
            </Text>
          </View>
          <View className="flex-1" style={{ gap: 6 }}>
            <Text className="text-on-surface" style={{ fontSize: 17, fontWeight: "700" }} numberOfLines={2}>
              {event.name}
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
              {eventFullDate(event.startsAt)}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <MapPin size={12} color={colors.onSurfaceVariant} />
              <Text className="text-on-surface-variant flex-1" style={{ fontSize: 12.5 }} numberOfLines={1}>
                {event.location} · {event.city}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Users size={12} color={colors.primary} />
              <Text className="text-on-surface" style={{ fontSize: 12.5 }}>
                {event.attendeesCount} {event.attendeesCount === 1 ? "confirmado" : "confirmados"}
                {event.friendsGoing ? ` · ${event.friendsGoing} que você segue` : ""}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View className="flex-row px-4 py-4 gap-2.5">
        <Pressable
          onPress={() => toggle.mutate({ eventId: event.id, attending: vou })}
          disabled={toggle.isPending}
          accessibilityRole="button"
          accessibilityState={{ selected: vou }}
          className="flex-1 items-center justify-center py-3.5 active:opacity-80"
          style={{
            backgroundColor: vou ? "transparent" : colors.primary,
            borderWidth: 1,
            borderColor: vou ? colors.success : colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 1.2,
              color: vou ? colors.success : colors.onPrimaryContainer,
            }}
          >
            {vou ? "VOCÊ VAI" : "EU VOU"}
          </Text>
        </Pressable>
        <Pressable
          onPress={abrir}
          accessibilityRole="button"
          className="flex-1 items-center justify-center py-3.5 border border-outline active:bg-white/5"
        >
          <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>
            VER ENCONTRO
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
