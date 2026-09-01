import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  fullWidth = true,
}: ButtonProps) {
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`${fullWidth ? "w-full" : ""} bg-primary-container active:opacity-80 items-center justify-center flex-row py-4 px-6 ${
        disabled ? "opacity-40" : ""
      }`}
      style={{ borderRadius: 0 }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimaryContainer} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className="text-on-primary-container text-center"
            style={{
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  fullWidth = true,
}: ButtonProps) {
  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`${fullWidth ? "w-full" : ""} border border-outline active:bg-white/5 items-center justify-center flex-row py-3.5 px-6 ${
        disabled ? "opacity-40" : ""
      }`}
      style={{ borderRadius: 0 }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onSurface} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className="text-on-surface text-center"
            style={{
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
