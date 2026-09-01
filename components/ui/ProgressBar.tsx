import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/theme";

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  trackColor?: string;
  fillColor?: string;
}

export function ProgressBar({
  progress,
  height = 4,
  trackColor = colors.surfaceHigh,
  fillColor = colors.primaryContainer,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration: 600,
    });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={{ height, backgroundColor: trackColor, width: "100%" }}>
      <Animated.View
        style={[{ height, backgroundColor: fillColor }, style]}
      />
    </View>
  );
}
