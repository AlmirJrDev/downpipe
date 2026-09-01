import React from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { colors } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-surface items-center justify-center px-8">
      <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "600" }}>
        Tela não encontrada
      </Text>
      <Link href="/(tabs)" className="mt-4">
        <Text style={{ color: colors.primary, fontSize: 14 }}>Voltar para o início</Text>
      </Link>
    </View>
  );
}
