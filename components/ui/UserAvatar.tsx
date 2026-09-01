import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";

interface UserAvatarProps {
  uri: string;
  size?: number;
  ringColor?: string;
}

export function UserAvatar({ uri, size = 40, ringColor }: UserAvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ringColor ? 2 : 0,
        borderColor: ringColor ?? "transparent",
        overflow: "hidden",
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
    </View>
  );
}
