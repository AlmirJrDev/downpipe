import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/constants/theme";

export type ExploreTab = "cars" | "events";

/**
 * Carros e rolês dividem a aba Explorar em vez de virar uma quinta aba: a
 * barra inferior tem um desenho simétrico (duas à esquerda, o botão de
 * adicionar no meio, duas à direita) que um quinto ícone quebraria — e
 * descobrir evento é descoberta, que é justamente o que essa aba faz.
 */
export function ExploreSegment({
  value,
  onChange,
}: {
  value: ExploreTab;
  onChange: (tab: ExploreTab) => void;
}) {
  const options: { key: ExploreTab; label: string }[] = [
    { key: "cars", label: "Carros" },
    { key: "events", label: "Rolês" },
  ];

  return (
    <View className="flex-row border-b border-border mb-4">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} className="mr-6 pb-3">
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 0.5,
                color: active ? colors.onSurface : colors.muted,
              }}
            >
              {option.label.toUpperCase()}
            </Text>
            {active && (
              <View
                style={{ height: 2, backgroundColor: colors.primaryContainer, marginTop: 8 }}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
