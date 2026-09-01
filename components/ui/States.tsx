import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { TriangleAlert } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { PrimaryButton } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {icon && (
        <View className="w-24 h-24 items-center justify-center border border-outline-variant mb-6">
          {icon}
        </View>
      )}
      <Text
        className="text-on-surface text-center mb-2"
        style={{ fontSize: 24, fontWeight: "500" }}
      >
        {title}
      </Text>
      <Text className="text-on-surface-variant text-center mb-8" style={{ fontSize: 15 }}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <PrimaryButton label={actionLabel} onPress={onAction} fullWidth={false} />
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <TriangleAlert size={40} color={colors.error} />
      <Text
        className="text-on-surface text-center mt-4 mb-2"
        style={{ fontSize: 18, fontWeight: "500" }}
      >
        Algo deu errado
      </Text>
      <Text className="text-on-surface-variant text-center mb-6">{message}</Text>
      {onRetry && <PrimaryButton label="Tentar novamente" onPress={onRetry} fullWidth={false} />}
    </View>
  );
}

function SkeletonBlock({ style }: { style?: object }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ backgroundColor: colors.surfaceHigh }, style, animatedStyle]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View className="mb-6 border border-border overflow-hidden">
      <SkeletonBlock style={{ height: 320, width: "100%" }} />
      <View className="p-4" style={{ gap: 8 }}>
        <SkeletonBlock style={{ height: 14, width: "60%" }} />
        <SkeletonBlock style={{ height: 12, width: "40%" }} />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View className="px-4 pt-4">
      <CardSkeleton />
      <CardSkeleton />
    </View>
  );
}

export function RowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <SkeletonBlock style={{ width: 44, height: 44, borderRadius: 22 }} />
      <View style={{ gap: 6, flex: 1 }}>
        <SkeletonBlock style={{ height: 12, width: "50%" }} />
        <SkeletonBlock style={{ height: 10, width: "30%" }} />
      </View>
    </View>
  );
}
