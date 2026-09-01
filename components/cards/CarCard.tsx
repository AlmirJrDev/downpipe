import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { carTitle, carYear } from "@/utils/car";
import type { Car } from "@/types";

function formatLikes(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

export function CarCard({ car }: { car: Car }) {
  // Deterministic pseudo-like-count for explore cards so it feels populated.
  const likes = 800 + (car.id.charCodeAt(1) || 0) * 137;
  const year = carYear(car);

  return (
    <Pressable
      onPress={() => router.push(`/car/${car.id}`)}
      className="mb-4 border border-border active:opacity-90"
      style={{ height: 300 }}
    >
      {car.photoUrl && (
        <Image
          source={{ uri: car.photoUrl }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
          transition={200}
        />
      )}
      <View
        className="absolute bottom-0 left-0 right-0 p-4"
        style={{
          backgroundColor: colors.overlayStrong,
          borderTopWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text className="text-on-surface" style={{ fontSize: 19, fontWeight: "600" }}>
          {carTitle(car)}
        </Text>
        <View className="flex-row items-center justify-between mt-1.5">
          {/* Toque no dono abre o perfil dele; o toque no resto do card
              continua indo pro carro. */}
          {car.owner ? (
            <Pressable
              onPress={() => router.push(`/user/${car.owner!.username}`)}
              className="flex-row items-center gap-2 flex-1"
              hitSlop={6}
            >
              <UserAvatar uri={car.owner.avatarUrl ?? ""} size={22} />
              <Text className="text-on-surface-variant" style={{ fontSize: 13 }} numberOfLines={1}>
                @{car.owner.username}
                {year ? ` · ${year}` : ""}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
              {year ?? "—"}
            </Text>
          )}
          <View className="flex-row items-center gap-1">
            <Heart size={13} color={colors.primary} fill={colors.primary} />
            <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
              {formatLikes(likes)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
