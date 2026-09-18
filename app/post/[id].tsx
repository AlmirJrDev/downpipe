/**
 * Uma publicação só — o destino do link compartilhado.
 *
 * Antes não havia endereço de uma publicação: o mais perto era a lista de
 * posts de um perfil rolada até ela, que depende do @ de quem publicou e
 * mistura o post compartilhado com todos os outros. Quem recebe um link quer
 * ver aquela foto, e daí seguir pro resto do perfil se gostar.
 */
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { EmptyState } from "@/components/ui/States";
import { apiService } from "@/services/apiService";
import { voltarOuIrPara } from "@/utils/navigation";
import { colors, spacing } from "@/constants/theme";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isPending } = useQuery({
    queryKey: ["post", id],
    queryFn: () => apiService.getPostById(id),
    enabled: !!id,
  });

  const autor = post?.author?.username;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title={autor ? `@${autor}`.toUpperCase() : "PUBLICAÇÃO"}
        left={
          <Pressable
            hitSlop={8}
            onPress={() => voltarOuIrPara("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !post ? (
        <EmptyState
          title="Publicação não encontrada"
          description="Ela pode ter sido apagada por quem publicou."
          actionLabel="Ir pro feed"
          onAction={() => router.replace("/(tabs)")}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingHorizontal: spacing.marginMobile,
            paddingBottom: spacing.lg,
          }}
        >
          <PostCard post={post} />

          {autor && (
            <Pressable
              onPress={() => router.push(`/user/${autor}`)}
              className="border border-outline py-3.5 items-center active:bg-white/5"
            >
              <Text className="text-on-surface" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}>
                VER A GARAGEM DE @{autor.toUpperCase()}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}
