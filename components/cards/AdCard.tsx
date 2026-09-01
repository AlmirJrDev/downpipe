import React from "react";
import { Pressable, Text, View, Linking } from "react-native";
import { Image } from "expo-image";
import type { Post } from "@/types";

export function AdCard({ post }: { post: Post }) {
  const handleCta = () => {
    if (post.ctaUrl) Linking.openURL(post.ctaUrl).catch(() => {});
  };

  return (
    <View className="mb-6 border border-border bg-card">
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: "100%", height: 340 }}
          contentFit="cover"
          transition={200}
        />
      )}

      <View className="px-4 pt-3 pb-4">
        <Text
          className="text-muted mb-1.5"
          style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}
        >
          PATROCINADO
        </Text>
        {post.title && (
          <Text
            className="text-on-surface mb-1"
            style={{ fontSize: 15, fontWeight: "600" }}
          >
            {post.title}
          </Text>
        )}
        <Text className="text-on-surface-variant" style={{ fontSize: 14 }}>
          {post.caption}
        </Text>
        {post.ctaLabel && (
          <Pressable
            onPress={handleCta}
            className="border border-outline mt-3 py-3.5 items-center"
          >
            <Text
              className="text-on-surface"
              style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
            >
              {post.ctaLabel.toUpperCase()}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}