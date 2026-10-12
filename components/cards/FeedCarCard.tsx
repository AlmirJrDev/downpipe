/**
 * Carro novo na garagem de alguém, no meio do feed, do tamanho de um post.
 *
 * É o Explorar vindo até a pessoa: entra na linha do tempo pela hora em que
 * o carro foi cadastrado, como "fulano colocou um carro na garagem". A foto
 * é o cartão inteiro; embaixo, o nome do carro e os números que o dono
 * preencheu (potência, investido, status), que é o que faz alguém tocar.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Gauge, Heart, Wallet } from "lucide-react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StatusChip } from "@/components/ui/Chips";
import { carCatalogName, carTitle, carYear } from "@/utils/car";
import { timeAgo } from "@/utils/time";
import { colors } from "@/constants/theme";
import type { Car } from "@/types";

function Numero({ icone, texto }: { icone: React.ReactNode; texto: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      {icone}
      <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "600" }}>
        {texto}
      </Text>
    </View>
  );
}

export function FeedCarCard({ car }: { car: Car }) {
  const dono = car.owner;
  const abrir = () => router.push(`/car/${car.id}`);
  const catalogo = carCatalogName(car);
  const ano = carYear(car);
  const subtitulo = [catalogo !== carTitle(car) ? catalogo : null, ano].filter(Boolean).join(" · ");

  return (
    <View className="mb-6 border border-border bg-card">
      <View className="flex-row items-center px-4 py-3 gap-3">
        <Pressable
          onPress={() => dono && router.push(`/user/${dono.username}`)}
          className="flex-row items-center gap-3 flex-1"
          hitSlop={4}
        >
          <UserAvatar uri={dono?.avatarUrl ?? ""} size={38} />
          <View className="flex-1">
            <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
              {dono ? `@${dono.username}` : "Garagem"}
            </Text>
            <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
              colocou um carro na garagem
            </Text>
          </View>
        </Pressable>
        <Text className="text-muted" style={{ fontSize: 12 }}>
          {timeAgo(car.createdAt)}
        </Text>
      </View>

      <Pressable onPress={abrir} accessibilityRole="link" accessibilityLabel={`Abrir ${carTitle(car)}`}>
        {car.photoUrl ? (
          <Image
            source={{ uri: car.photoUrl }}
            recyclingKey={car.id}
            style={{ width: "100%", height: 420 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        <View className="px-4 pt-4" style={{ gap: 4 }}>
          <Text className="text-on-surface" style={{ fontSize: 18, fontWeight: "700" }} numberOfLines={2}>
            {carTitle(car)}
          </Text>
          {!!subtitulo && (
            <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
              {subtitulo}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap items-center px-4 pt-3" style={{ gap: 14 }}>
          {car.status && <StatusChip status={car.status} />}
          {car.power != null && <Numero icone={<Gauge size={14} color={colors.primary} />} texto={`${car.power} cv`} />}
          {car.amountInvested > 0 && (
            <Numero
              icone={<Wallet size={14} color={colors.primary} />}
              texto={`R$ ${car.amountInvested.toLocaleString("pt-BR")}`}
            />
          )}
          {!!car.photosLikes && (
            <Numero
              icone={<Heart size={14} color={colors.primary} fill={colors.primary} />}
              texto={`${car.photosLikes} curtidas`}
            />
          )}
        </View>
      </Pressable>

      <View className="px-4 py-4">
        <Pressable
          onPress={abrir}
          accessibilityRole="button"
          className="items-center justify-center py-3.5 border border-outline active:bg-white/5"
        >
          <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>
            VER CARRO
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
