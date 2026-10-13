/**
 * Chamada pros jogos no topo do feed: o do dia em destaque e o atalho pro
 * outro. Uma faixa só — é um extra, não pode empurrar as publicações.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Gamepad2 } from "lucide-react-native";
import { numeroDoDia } from "@/utils/naveDoDia";
import { colors } from "@/constants/theme";

export function ChamadaNaveDoDia() {
  return (
    <View className="flex-row border border-border mb-5">
      <Pressable
        onPress={() => router.push("/nave-do-dia")}
        className="flex-row items-center px-4 py-3 active:bg-white/5"
        style={{ gap: 12, flex: 1 }}
        accessibilityRole="link"
      >
        <Gamepad2 size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "700" }}>
            Nave do Dia #{numeroDoDia()}
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
            Adivinhe o carro de hoje
          </Text>
        </View>
        <ChevronRight size={18} color={colors.outline} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/jogos")}
        className="items-center justify-center px-4 border-l border-border active:bg-white/5"
        accessibilityRole="link"
        accessibilityLabel="Ver todos os jogos"
      >
        <Text className="text-on-surface-variant" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>
          + JOGOS
        </Text>
      </Pressable>
    </View>
  );
}
