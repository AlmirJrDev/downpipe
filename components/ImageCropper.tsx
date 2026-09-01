import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const MAX_ZOOM = 5;
const FRAME_MARGIN = 16;

interface ImageCropperProps {
  /** URI local da imagem escolhida; null fecha o recortador. */
  uri: string | null;
  /** Proporção da moldura (largura / altura) — a mesma em que a foto será exibida. */
  aspect: number;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
}

/**
 * Recorte com arrastar e dar zoom, dentro de uma moldura na proporção exata
 * em que a foto vai aparecer no app.
 *
 * Feito no app em vez de usar o editor nativo do picker porque no iOS o
 * recorte nativo é sempre quadrado (a opção `aspect` do expo-image-picker é
 * só Android) — o que faria a foto ser cortada de novo na exibição.
 */
export function ImageCropper({ uri, aspect, onCancel, onDone }: ImageCropperProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const frameWidth = screenWidth - FRAME_MARGIN * 2;
  const frameHeight = frameWidth / aspect;

  // Gestos precisam ler estes valores dentro de worklets (UI thread), por
  // isso ficam em shared values e não em state.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const imgW = useSharedValue(0);
  const imgH = useSharedValue(0);

  useEffect(() => {
    if (!uri) return;
    setSource(null);
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;

    RNImage.getSize(
      uri,
      (w, h) => {
        setSource({ width: w, height: h });
        imgW.value = w;
        imgH.value = h;
        // "Cover": a menor escala em que a imagem ainda preenche a moldura
        // inteira, pra nunca sobrar borda vazia dentro do recorte.
        baseScale.value = Math.max(frameWidth / w, frameHeight / h);
      },
      () => setSource(null)
    );
  }, [uri, frameWidth, frameHeight]);

  const gesture = useMemo(() => {
    // Mantém a imagem sempre cobrindo a moldura: sem isto dava pra arrastar
    // a foto pra fora e recortar uma área vazia.
    const clamp = () => {
      "worklet";
      const dispW = imgW.value * baseScale.value * scale.value;
      const dispH = imgH.value * baseScale.value * scale.value;
      const maxX = Math.max(0, (dispW - frameWidth) / 2);
      const maxY = Math.max(0, (dispH - frameHeight) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    };

    const pan = Gesture.Pan()
      .onChange((e) => {
        tx.value += e.changeX;
        ty.value += e.changeY;
      })
      .onEnd(clamp);

    const pinch = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
      })
      .onEnd(clamp);

    return Gesture.Simultaneous(pan, pinch);
  }, [frameWidth, frameHeight]);

  const imageStyle = useAnimatedStyle(() => ({
    width: imgW.value * baseScale.value,
    height: imgH.value * baseScale.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const confirm = async () => {
    if (!uri || !source) return;
    setSaving(true);
    try {
      const effective = baseScale.value * scale.value;
      // Canto superior esquerdo da moldura, convertido de pixels de tela
      // para pixels do arquivo original.
      const dispW = source.width * effective;
      const dispH = source.height * effective;
      const left = (dispW - frameWidth) / 2 - tx.value;
      const top = (dispH - frameHeight) / 2 - ty.value;

      const cropWidth = Math.min(source.width, Math.round(frameWidth / effective));
      const cropHeight = Math.min(source.height, Math.round(frameHeight / effective));
      const originX = Math.min(
        Math.max(0, Math.round(left / effective)),
        Math.max(0, source.width - cropWidth)
      );
      const originY = Math.min(
        Math.max(0, Math.round(top / effective)),
        Math.max(0, source.height - cropHeight)
      );

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone(result.uri);
    } catch {
      // Se o recorte falhar, envia a original em vez de travar o fluxo.
      onDone(uri);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!uri} animationType="slide" onRequestClose={onCancel} transparent={false}>
      {/* GestureHandlerRootView próprio: o Modal renderiza numa árvore de
          views separada, e sem isto os gestos não chegam aqui dentro. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surfaceLowest }}>
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <Pressable hitSlop={8} onPress={onCancel}>
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              Cancelar
            </Text>
          </Pressable>
          <Text
            className="text-on-surface-variant"
            style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
          >
            AJUSTAR FOTO
          </Text>
          <Pressable hitSlop={8} onPress={confirm} disabled={saving || !source}>
            <Text
              className={saving || !source ? "text-muted" : "text-primary"}
              style={{ fontSize: 14, fontWeight: "700" }}
            >
              {saving ? "..." : "Concluir"}
            </Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          {!source ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <GestureDetector gesture={gesture}>
              <View
                style={{
                  width: frameWidth,
                  height: frameHeight,
                  overflow: "hidden",
                  backgroundColor: colors.surfaceLowest,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                className="items-center justify-center"
              >
                <Animated.View style={imageStyle}>
                  {uri && (
                    <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  )}
                </Animated.View>
              </View>
            </GestureDetector>
          )}
        </View>

        <Text
          className="text-muted text-center px-8"
          style={{ fontSize: 12, marginBottom: insets.bottom + 24 }}
        >
          Arraste para posicionar e use dois dedos para dar zoom. A área dentro da moldura é o que
          aparece no app.
        </Text>
      </GestureHandlerRootView>
    </Modal>
  );
}
