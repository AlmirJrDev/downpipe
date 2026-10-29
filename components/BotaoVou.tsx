import React, { useEffect, useRef } from "react";
import { Platform, Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { colors } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * "EU VOU" / "VOCÊ VAI".
 *
 * A presença é otimista (useToggleAttendance), então o botão não mostra
 * carregando: o estado já virou no toque. Confirmar ganha um soco curto no
 * botão e o ✓ entra pulando; desmarcar só troca, sem festa.
 */
export function BotaoVou({ attending, onPress }: { attending: boolean; onPress: () => void }) {
  const escala = useSharedValue(1);
  const check = useSharedValue(1);
  const antes = useRef(attending);

  useEffect(() => {
    if (attending && !antes.current) {
      escala.value = withSequence(withTiming(0.95, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 }));
      check.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 7, stiffness: 240 }));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    antes.current = attending;
  }, [attending, escala, check]);

  const estiloBotao = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const estiloCheck = useAnimatedStyle(() => ({ transform: [{ scale: check.value }] }));
  const cor = attending ? colors.success : "#0a0a0a";

  return (
    <AnimatedPressable
      onPress={onPress}
      // Resposta ao dedo antes de soltar: o botão afunda um pouco.
      onPressIn={() => (escala.value = withTiming(0.97, { duration: 80 }))}
      onPressOut={() => (escala.value = withSpring(1, { damping: 12, stiffness: 300 }))}
      accessibilityRole="button"
      accessibilityState={{ selected: attending }}
      accessibilityLabel={attending ? "Você vai. Toque pra desmarcar presença" : "Confirmar presença"}
      // style, não className: o NativeWind não chega no Pressable animado.
      style={[
        {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 16,
          backgroundColor: attending ? "transparent" : colors.success,
          borderWidth: attending ? 1 : 0,
          borderColor: colors.success,
        },
        estiloBotao,
      ]}
    >
      <Animated.View style={estiloCheck}>
        <Check size={16} color={cor} />
      </Animated.View>
      <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2, color: cor }}>
        {attending ? "VOCÊ VAI" : "EU VOU"}
      </Text>
    </AnimatedPressable>
  );
}
