import React, { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { colors } from "@/constants/theme";

// Proporção das duas fotos — a mesma usada no recorte, senão a sobreposição
// não alinha.
const ASPECT = 4 / 3;
const DIVIDER_WIDTH = 4;
const HANDLE_SIZE = 60;
// Limites do arraste: sempre deixa uma faixa visível dos dois lados, pra
// nunca parecer que uma das fotos sumiu.
const MIN_POSITION = 8;
const MAX_POSITION = 92;
// Folga em px antes de decidir se o gesto é do divisor ou da rolagem do feed.
// Baixo demais rouba a rolagem; alto demais deixa o divisor "duro" no começo.
const ACTIVATION_SLOP = 10;

function Tag({ label, variant }: { label: string; variant: "before" | "after" }) {
  const isAfter = variant === "after";
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: isAfter ? colors.primaryContainer : colors.overlaySheet,
        borderWidth: isAfter ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.7,
          color: isAfter ? colors.onPrimaryContainer : colors.onSurface,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Comparação antes/depois com divisor arrastável.
 *
 * O "depois" fica numa camada por cima, recortada da posição do divisor até a
 * borda direita. Em React Native não existe clip-path, então o recorte é feito
 * com uma View de `overflow: hidden` cuja largura acompanha o divisor — e a
 * imagem dentro dela é deslocada na direção contrária, pra continuar alinhada
 * com a foto de baixo em vez de "andar" junto com o corte.
 */
export function BeforeAfter({ beforeUri, afterUri }: { beforeUri: string; afterUri: string }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const position = useSharedValue(50);
  const width = useSharedValue(0);

  const pan = Gesture.Pan()
    // Sem estes dois limites o gesto capturava arraste em qualquer direção e
    // travava a rolagem do feed em cima do post: o dedo subindo era lido como
    // "arrastar o divisor". Agora ele só assume o gesto quando o movimento é
    // claramente horizontal, e desiste assim que percebe movimento vertical —
    // deixando a lista rolar normalmente.
    .activeOffsetX([-ACTIVATION_SLOP, ACTIVATION_SLOP])
    .failOffsetY([-ACTIVATION_SLOP, ACTIVATION_SLOP])
    .onChange((e) => {
      if (width.value === 0) return;
      const deltaPercent = (e.changeX / width.value) * 100;
      position.value = Math.min(
        MAX_POSITION,
        Math.max(MIN_POSITION, position.value + deltaPercent)
      );
    });

  const afterClipStyle = useAnimatedStyle(() => ({
    left: `${position.value}%`,
    width: `${100 - position.value}%`,
  }));

  const afterImageStyle = useAnimatedStyle(() => ({
    width: width.value,
    marginLeft: -(width.value * position.value) / 100,
  }));

  const dividerStyle = useAnimatedStyle(() => ({ left: `${position.value}%` }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={{ width: "100%", aspectRatio: ASPECT, overflow: "hidden" }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setContainerWidth(w);
          width.value = w;
        }}
      >
        {/* Camada de baixo: antes */}
        <Image
          source={{ uri: beforeUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
        {/* Escurece levemente o "antes" pra diferenciar do "depois". O mock
            usa filtros CSS (saturate/contrast) que o React Native não tem —
            esta é a aproximação possível sem biblioteca extra. */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(10,10,10,0.35)",
          }}
        />

        {/* Camada de cima: depois, recortada */}
        <Animated.View
          style={[{ position: "absolute", top: 0, bottom: 0, overflow: "hidden" }, afterClipStyle]}
        >
          <Animated.View style={[{ height: "100%" }, afterImageStyle]}>
            {containerWidth > 0 && (
              <Image
                source={{ uri: afterUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            )}
          </Animated.View>
        </Animated.View>

        {/* Divisor + alça */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              width: DIVIDER_WIDTH,
              marginLeft: -DIVIDER_WIDTH / 2,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            },
            dividerStyle,
          ]}
        >
          <View
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              borderRadius: HANDLE_SIZE / 2,
              backgroundColor: colors.primaryContainer,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <ArrowLeft size={20} color={colors.onPrimaryContainer} strokeWidth={2.4} />
            <ArrowRight size={20} color={colors.onPrimaryContainer} strokeWidth={2.4} />
          </View>
        </Animated.View>

        <View style={{ position: "absolute", left: 16, bottom: 16 }} pointerEvents="none">
          <Tag label="ANTES" variant="before" />
        </View>
        <View style={{ position: "absolute", right: 16, bottom: 16 }} pointerEvents="none">
          <Tag label="DEPOIS" variant="after" />
        </View>
      </View>
    </GestureDetector>
  );
}
