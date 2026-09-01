import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { GitCompareArrows } from "lucide-react-native";
import { colors, spacing } from "@/constants/theme";
import { postThumbnail } from "@/utils/post";
import type { Post } from "@/types";

const GRID_GAP = 2;
const GRID_COLUMNS = 3;

/**
 * Grade de publicações do perfil. Cada célula abre as publicações do perfil
 * em formato de feed, posicionadas na que foi tocada.
 * Post sem imagem vira uma célula de texto em vez de sumir da grade —
 * antes um post assim simplesmente não aparecia em lugar nenhum do perfil.
 */
export function PostGrid({
  posts,
  width,
  username,
}: {
  posts: Post[];
  width: number;
  /** Dono da grade — a célula abre as publicações desse perfil em feed. */
  username: string;
}) {
  // Arredondar para baixo: um subpixel de sobra faz a terceira coluna quebrar
  // para a linha seguinte.
  const cellSize = Math.floor(
    (width - spacing.marginMobile * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  );

  return (
    <View
      className="flex-row flex-wrap"
      style={{ paddingHorizontal: spacing.marginMobile, gap: GRID_GAP }}
    >
      {posts.map((post) => {
        const thumbnail = postThumbnail(post);
        return (
          <Pressable
            key={post.id}
            onPress={() => router.push(`/user-posts/${username}?postId=${post.id}`)}
            style={{ width: cellSize, height: cellSize }}
            className="active:opacity-80"
          >
            {thumbnail ? (
              <Image
                source={{ uri: thumbnail }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View
                className="w-full h-full p-2 justify-center"
                style={{ backgroundColor: colors.surfaceContainer }}
              >
                <Text className="text-on-surface-variant" style={{ fontSize: 11 }} numberOfLines={4}>
                  {post.caption || "Publicação"}
                </Text>
              </View>
            )}

            {/* Marca a célula como comparação: na miniatura aparece só o
                "depois", então sem isto não dá pra saber que o post tem as
                duas fotos. */}
            {post.type === "evolution" && (
              <View
                className="absolute top-1 right-1 px-1.5 py-0.5 flex-row items-center gap-1"
                style={{ backgroundColor: colors.overlaySheet }}
              >
                <GitCompareArrows size={10} color={colors.primary} />
                <Text
                  className="text-on-surface"
                  style={{ fontSize: 8, fontWeight: "700", letterSpacing: 0.5 }}
                >
                  A/D
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
