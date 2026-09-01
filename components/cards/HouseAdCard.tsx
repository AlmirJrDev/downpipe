import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Megaphone } from "lucide-react-native";
import { colors } from "@/constants/theme";
import type { Post } from "@/types";

export function HouseAdCard({ post }: { post: Post }) {
  return (
    <View
      className="mb-6 border border-dashed border-outline items-center px-6 py-8"
      style={{ backgroundColor: colors.onSurfaceVariant }}
    >
      <Megaphone size={22} color={colors.onSurfaceVariant} />
      <Text
        className="text-on-surface text-center mt-3"
        style={{ fontSize: 15, fontWeight: "600" }}
      >
        {post.caption}
      </Text>
      <Pressable
        onPress={() => post.ctaUrl && router.push(post.ctaUrl as any)}
        className="bg-primary-container mt-4 px-5 py-3"
      >
        <Text
          className="text-on-primary-container"
          style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
        >
          {(post.ctaLabel ?? "ANUNCIE AQUI").toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}