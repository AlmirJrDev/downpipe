import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { colors } from "@/constants/theme";

export function FloatingActionButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.9))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={{
          width: 56,
          height: 56,
          backgroundColor: colors.primaryContainer,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: colors.surface,
        }}
      >
        <Plus size={26} color={colors.onPrimaryContainer} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}
