import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusChip } from "@/components/ui/Chips";
import { carTitle, carYear } from "@/utils/car";
import type { Car } from "@/types";

export function GarageCard({ car }: { car: Car }) {
  const year = carYear(car);

  return (
    <Pressable
      onPress={() => router.push(`/car/${car.id}`)}
      className="mb-5 border border-border bg-card active:opacity-90"
    >
      <View style={{ height: 220 }}>
        {car.photoUrl && (
          <Image
            source={{ uri: car.photoUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        )}
        <View className="absolute top-3 right-3">
          <StatusChip status={car.status} />
        </View>
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <Text
            className="text-on-surface"
            style={{ fontSize: 20, fontWeight: "600", letterSpacing: 0.3 }}
          >
            {carTitle(car).toUpperCase()}
          </Text>
          {year && (
            <Text className="text-on-surface-variant" style={{ fontSize: 14 }}>
              {year}
            </Text>
          )}
        </View>

        <View className="flex-row mt-3 mb-1">
          <View className="flex-1">
            <Text
              className="text-on-surface-variant"
              style={{ fontSize: 10, letterSpacing: 1.2 }}
            >
              MOTOR
            </Text>
            <Text className="text-on-surface mt-0.5" style={{ fontSize: 14 }}>
              {car.engine ?? "—"}
            </Text>
          </View>
          <View className="flex-1">
            <Text
              className="text-on-surface-variant"
              style={{ fontSize: 10, letterSpacing: 1.2 }}
            >
              QUILOMETRAGEM
            </Text>
            <Text className="text-on-surface mt-0.5" style={{ fontSize: 14 }}>
              {car.mileage != null ? `${car.mileage.toLocaleString("pt-BR")} km` : "—"}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <View className="flex-row justify-between mb-1.5">
            <Text
              className="text-on-surface-variant"
              style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}
            >
              PROGRESSO DO PROJETO
            </Text>
            <Text
              className="text-primary"
              style={{ fontSize: 12, fontWeight: "700" }}
            >
              {car.projectProgress}%
            </Text>
          </View>
          <ProgressBar progress={car.projectProgress} />
        </View>

        <Text className="text-on-surface-variant mt-3" style={{ fontSize: 13 }}>
          R$ {car.amountInvested.toLocaleString("pt-BR")} investidos
        </Text>

        <Pressable
          onPress={() => router.push(`/project/${car.id}`)}
          className="bg-primary-container mt-4 py-3.5 flex-row items-center justify-center gap-2"
        >
          <Text
            className="text-on-primary-container"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
          >
            VER PROJETO
          </Text>
          <ArrowRight size={14} color={colors.onPrimaryContainer} />
        </Pressable>
      </View>
    </Pressable>
  );
}
