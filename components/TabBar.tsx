import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Home, Compass, Warehouse, User, SquarePlus } from "lucide-react-native";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, spacing } from "@/constants/theme";

const icons: Record<string, React.ComponentType<any>> = {
  index: Home,
  explore: Compass,
  garage: Warehouse,
  profile: User,
};

// Fixed visual order of the bottom nav: Home, Explorar, [Adicionar], Garagem, Perfil.
const LEFT_ROUTES = ["index", "explore"];
const RIGHT_ROUTES = ["garage", "profile"];

const ICON_SIZE = 22;
const INDICATOR_WIDTH = 24;
// Todos os cinco slots usam este padding para os ícones alinharem na mesma
// linha de base e o indicador encostar na borda superior sem sair do pai.
const SLOT_PADDING_TOP = 10;

/**
 * Espaço reservado embaixo da barra.
 *
 * O maior indicador de gestos que existe é o do iPhone, com 34pt — então
 * nenhum aparelho precisa de mais que isso. No PWA o insets.bottom voltava
 * bem acima disso e a barra ganhava uns 90px de vazio preto embaixo dos
 * ícones, com cara de layout quebrado.
 *
 * O teto de 34 não muda nada no app nativo (lá o valor nunca passa disso) e
 * corta só o exagero do navegador. O piso de 8 evita os ícones encostando na
 * borda em aparelho sem indicador nenhum.
 */
function espacoDeBaixo(inset: number): number {
  return Math.min(Math.max(inset, spacing.sm), 34);
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const renderTab = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return null;
    const Icon = icons[routeName];
    const isFocused = state.routes[state.index].name === routeName;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate(route.name);
        }}
        className="flex-1 items-center"
        style={{ paddingTop: SLOT_PADDING_TOP, paddingBottom: spacing.xs }}
      >
        {/* Indicador de aresta dura encostado na borda superior da barra.
            `top: 0` mantém ele dentro dos limites do Pressable — deslocamento
            negativo é cortado no Android. */}
        <View
          style={{
            position: "absolute",
            top: 0,
            width: INDICATOR_WIDTH,
            height: 2,
            backgroundColor: isFocused ? colors.primary : "transparent",
          }}
        />
        <Icon
          size={ICON_SIZE}
          color={isFocused ? colors.primary : colors.muted}
          strokeWidth={isFocused ? 2.2 : 1.8}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        // Sem paddingTop: cada slot traz o seu, para o indicador poder
        // encostar na borda de cima.
        paddingBottom: espacoDeBaixo(insets.bottom),
      }}
    >
      {LEFT_ROUTES.map(renderTab)}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-action");
        }}
        className="flex-1 items-center"
        style={{ paddingTop: SLOT_PADDING_TOP, paddingBottom: spacing.xs }}
      >
        <SquarePlus size={ICON_SIZE + 2} color={colors.onSurface} strokeWidth={1.8} />
      </Pressable>

      {RIGHT_ROUTES.map(renderTab)}
    </View>
  );
}
