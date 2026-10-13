/**
 * "PULAR" no cabeçalho dos passos do onboarding depois do @ (primeiro
 * carro, encontro, foto, seguir garagens). Todos são opcionais: quem pula
 * cai no feed, e o que faltou fica no "Comece por aqui".
 */
import React from "react";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";

export function PularOnboarding() {
  return (
    <Pressable hitSlop={8} onPress={() => router.replace("/(tabs)")} accessibilityRole="button">
      <Text className="text-on-surface-variant" style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
        PULAR
      </Text>
    </Pressable>
  );
}
