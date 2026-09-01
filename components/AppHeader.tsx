import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { colors, spacing, typography } from "@/constants/theme";

// Os dois slots laterais têm largura fixa e igual para o wordmark ficar
// opticamente centrado. Com `justify-between` ele desloca conforme o conteúdo
// de cada lado, que era o motivo de o wordmark cair fora do centro em cada
// tela. 44px também é o alvo de toque mínimo confortável.
const SLOT_WIDTH = 44;

interface AppHeaderProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * Rótulo da tela. Sem ele, o header mostra a logo — que é o caso das telas
   * principais. Telas com identidade própria (MARCA, EDITAR CARRO, @usuário)
   * passam o texto e não exibem a logo, conforme o handoff.
   */
  title?: string;
  /** Hairline inferior — desligue se a tela já tem divisória própria. */
  bordered?: boolean;
}

export function AppHeader({ left, right, title, bordered = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.sm + spacing.xs,
        paddingHorizontal: spacing.marginMobile,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderBottomWidth: bordered ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: SLOT_WIDTH, alignItems: "flex-start" }}>{left}</View>
      {title ? (
        <Text
          numberOfLines={1}
          style={[
            typography.labelCaps,
            { flex: 1, textAlign: "center", color: colors.primary },
          ]}
        >
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1, alignItems: "center" }}>
          <Logo height={18} />
        </View>
      )}
      <View style={{ width: SLOT_WIDTH, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
