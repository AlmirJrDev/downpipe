import React, { useEffect } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 260 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(400, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0">
          <Animated.View
            style={[{ flex: 1, backgroundColor: colors.scrim }, backdropStyle]}
          />
        </Pressable>
        {/* A folha encosta no rodapé, então qualquer campo de texto dentro
            dela (comentários, etapa do projeto) ficava atrás do teclado no
            iOS. No Android o adjustResize do sistema já dá conta. */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surfaceLow,
              borderTopWidth: 1,
              borderColor: colors.outlineVariant,
              paddingBottom: insets.bottom + 16,
            },
            sheetStyle,
          ]}
        >
          <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
            {title ? (
              <Text
                className="text-on-surface"
                style={{ fontSize: 12, fontWeight: "700", letterSpacing: 2 }}
              >
                {title.toUpperCase()}
              </Text>
            ) : (
              <View />
            )}
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center border border-outline-variant"
            >
              <X size={16} color={colors.onSurface} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
