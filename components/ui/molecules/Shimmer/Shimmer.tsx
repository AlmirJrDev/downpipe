import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { IShimmerEffect } from "./Shimmer.types";
import { SHIMMER_PRESETS } from "./const";

/**
 * Shimmer do Reacticx, adaptado.
 *
 * O original anima com o Animated do React Native e useNativeDriver; no
 * navegador o loop roda uma vez e para no fim. Aqui a faixa de brilho anda
 * com o reanimated (withRepeat), que repete no PWA também. Ficou só o que o
 * app usa: brilho da esquerda pra direita enquanto carrega.
 */
export const ShimmerEffect = memo(
  ({ isLoading = true, shimmerColors, duration = 1500, style, preset = "dark", children }: IShimmerEffect) => {
    const [largura, setLargura] = useState(0);
    const progresso = useSharedValue(0);

    const tema = SHIMMER_PRESETS[preset] ?? SHIMMER_PRESETS.dark;
    const cores = shimmerColors && shimmerColors.length >= 2 ? shimmerColors : tema.colors;
    const faixa = largura * 0.5;

    const onLayout = useCallback((e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width), []);

    useEffect(() => {
      if (!isLoading || !largura) return;
      progresso.value = 0;
      progresso.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
      return () => cancelAnimation(progresso);
    }, [isLoading, largura, duration, progresso]);

    const estiloFaixa = useAnimatedStyle(() => ({
      transform: [{ translateX: -faixa + progresso.value * (largura + 2 * faixa) }],
    }));

    return (
      <View
        onLayout={onLayout}
        style={[
          { overflow: "hidden", backgroundColor: isLoading ? tema.backgroundColor : "transparent" },
          style,
        ]}
      >
        {!isLoading && children}
        {isLoading && largura > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: faixa }, estiloFaixa]}
          >
            <LinearGradient
              colors={cores as [string, string, ...string[]]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </View>
    );
  }
);
