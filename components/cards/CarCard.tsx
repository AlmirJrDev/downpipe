import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Gauge, Heart, Wallet } from "lucide-react-native";
import { colors, statusMeta } from "@/constants/theme";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { carTitle, carYear } from "@/utils/car";
import type { Car } from "@/types";

/**
 * O número do canto do card.
 *
 * Ali ficava uma contagem de curtidas inventada a partir do id ("pra parecer
 * populado", dizia o comentário). Agora é a soma real das curtidas das fotos
 * do carro: carro não tem curtida própria, mas as fotos dele têm, e o que a
 * galera curte é o carro.
 *
 * Carro novo, ou sem foto curtida ainda, cai no dado mais forte que ele tem —
 * potência, investido, status —, porque "0 curtidas" não convida ninguém a
 * tocar no card.
 */
function destaqueDoCarro(car: Car): { texto: string; icone: "cv" | "grana" | "curtidas" | null } | null {
  if (car.photosLikes) return { texto: formatarCurtidas(car.photosLikes), icone: "curtidas" };
  if (car.power != null) return { texto: `${car.power} cv`, icone: "cv" };
  if (car.amountInvested > 0) {
    return { texto: `R$ ${car.amountInvested.toLocaleString("pt-BR")}`, icone: "grana" };
  }
  // Sem número preenchido, o status ainda diz algo: é um projeto vivo.
  return car.status ? { texto: statusMeta[car.status].label, icone: null } : null;
}

/** 1.200 vira "1,2K" — o card é estreito e o número exato não muda nada ali. */
function formatarCurtidas(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(".0", "").replace(".", ",")}K`;
}

export function CarCard({ car }: { car: Car }) {
  const destaque = destaqueDoCarro(car);
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
          {destaque && (
            <View className="flex-row items-center gap-1">
              {destaque.icone === "curtidas" && (
                <Heart size={13} color={colors.primary} fill={colors.primary} />
              )}
              {destaque.icone === "cv" && <Gauge size={13} color={colors.primary} />}
              {destaque.icone === "grana" && <Wallet size={13} color={colors.primary} />}
              <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
                {destaque.texto}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
