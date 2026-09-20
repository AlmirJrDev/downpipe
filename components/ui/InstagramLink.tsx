import React from "react";
import { Linking, Pressable, Text } from "react-native";
import { Instagram } from "lucide-react-native";
import { colors } from "@/constants/theme";

/**
 * O @ do Instagram do carro ou da pessoa, clicável.
 *
 * Fica guardado puro no banco; o link é montado aqui. Abre em aba/app de
 * fora — é pra levar a pessoa pro Instagram mesmo, não pra segurar ela.
 */
export function InstagramLink({
  handle,
  size = 13,
}: {
  handle: string | null | undefined;
  size?: number;
}) {
  if (!handle) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(`https://instagram.com/${handle}`)}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel={`Abrir @${handle} no Instagram`}
      className="flex-row items-center gap-1.5 active:opacity-60"
    >
      <Instagram size={size + 1} color={colors.onSurfaceVariant} />
      <Text className="text-on-surface-variant" style={{ fontSize: size }}>
        @{handle}
      </Text>
    </Pressable>
  );
}
