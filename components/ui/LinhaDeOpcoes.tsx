/**
 * Uma fileira de opções (carro, categoria, ícone, rolê) nos formulários.
 *
 * No celular ela rola de lado, que é o gesto natural ali. No computador não
 * existe esse gesto com o mouse: as opções que não cabiam ficavam cortadas
 * na borda ("Freios", "Rodas") e ninguém sabia que havia mais. Lá elas
 * quebram linha e aparecem todas.
 */
import React from "react";
import { ScrollView, View } from "react-native";
import { useModoDesktop } from "@/hooks/useDesktop";

export function LinhaDeOpcoes({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const desktop = useModoDesktop();
  if (desktop) {
    return (
      <View className={`flex-row flex-wrap ${className ?? ""}`} style={{ rowGap: 8 }}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
