/**
 * Foto em tela cheia, com zoom.
 *
 * Pinça amplia, arrastar move a foto ampliada, e toque duplo alterna entre
 * ampliada e inteira — o mesmo par de gestos das galerias de foto do
 * celular, pra ninguém precisar aprender nada. No computador, sem pinça, o
 * clique duplo faz o papel.
 *
 * No card do feed, toque duplo é curtir. Aqui dentro ele é zoom: a tela
 * cheia existe pra olhar detalhe (a solda, o número do motor), e curtir já
 * está a um toque de distância no card.
 */
import React, { useEffect } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors } from "@/constants/theme";

const ZOOM_MAXIMO = 4;
const ZOOM_DO_TOQUE_DUPLO = 2.5;

export function VisualizadorDeFoto({ url, onClose }: { url: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const escala = useSharedValue(1);
  const escalaInicial = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xInicial = useSharedValue(0);
  const yInicial = useSharedValue(0);

  // Cada foto abre inteira e centralizada, não do jeito que a anterior ficou.
  useEffect(() => {
    if (!url) return;
    escala.value = 1;
    escalaInicial.value = 1;
    x.value = 0;
    y.value = 0;
    xInicial.value = 0;
    yInicial.value = 0;
  }, [url, escala, escalaInicial, x, y, xInicial, yInicial]);

  const pinca = Gesture.Pinch()
    .onStart(() => {
      escalaInicial.value = escala.value;
    })
    .onUpdate((e) => {
      escala.value = Math.min(ZOOM_MAXIMO, Math.max(1, escalaInicial.value * e.scale));
    })
    .onEnd(() => {
      // Soltou quase no tamanho original: volta pro centro, sem deixar a
      // foto meio deslocada.
      if (escala.value < 1.05) {
        escala.value = withTiming(1);
        x.value = withTiming(0);
        y.value = withTiming(0);
      }
    });

  const arrasto = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      xInicial.value = x.value;
      yInicial.value = y.value;
    })
    .onUpdate((e) => {
      // Sem zoom não há o que mover: a foto inteira já cabe na tela.
      if (escala.value <= 1) return;
      // Limita pra borda da foto não passar do meio da tela.
      const folgaX = ((escala.value - 1) * width) / 2;
      const folgaY = ((escala.value - 1) * height) / 2;
      x.value = Math.min(folgaX, Math.max(-folgaX, xInicial.value + e.translationX));
      y.value = Math.min(folgaY, Math.max(-folgaY, yInicial.value + e.translationY));
    });

  const toqueDuplo = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const ampliada = escala.value > 1.05;
      escala.value = withTiming(ampliada ? 1 : ZOOM_DO_TOQUE_DUPLO);
      x.value = withTiming(0);
      y.value = withTiming(0);
    });

  const gestos = Gesture.Simultaneous(pinca, arrasto, toqueDuplo);

  const estiloDaFoto = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escala.value }],
  }));

  return (
    <Modal visible={!!url} transparent={false} animationType="fade" onRequestClose={onClose}>
      {/* GestureHandlerRootView próprio: o Modal renderiza numa árvore de
          views separada, e sem isto os gestos não chegam aqui dentro. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <GestureDetector gesture={gestos}>
          <Animated.View style={[{ flex: 1 }, estiloDaFoto]}>
            {url && (
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                transition={150}
              />
            )}
          </Animated.View>
        </GestureDetector>

        <View style={{ position: "absolute", top: insets.top + 12, right: 16 }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar foto"
            hitSlop={10}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.overlayMedium }}
          >
            <X size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
