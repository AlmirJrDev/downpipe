/**
 * Lista de quem você bloqueou, com o desfazer.
 *
 * Bloquear sem um lugar pra rever seria uma porta só de ida: a pessoa
 * bloqueia no impulso e depois não tem como voltar atrás.
 */
import React from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserX } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { apiService } from "@/services/apiService";
import { colors, typography } from "@/constants/theme";

export default function BloqueadosScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bloqueados"],
    queryFn: apiService.getBloqueados,
  });

  const desbloquear = useMutation({
    mutationFn: (userId: string) => apiService.desbloquear(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloqueados"] });
      // As publicações da pessoa voltam ao feed no mesmo instante.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const lista = data ?? [];

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="BLOQUEADOS"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : lista.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <UserX size={34} color={colors.muted} />
          <Text className="text-on-surface mt-4" style={typography.headlineSm}>
            Ninguém bloqueado
          </Text>
          <Text
            className="text-on-surface-variant text-center mt-2"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            Quem você bloquear aparece aqui, e dá pra desfazer quando quiser.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 border-b border-border py-3">
              <UserAvatar uri={item.avatarUrl ?? ""} size={40} />
              <View className="flex-1 min-w-0">
                <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
                  {item.displayName}
                </Text>
                <Text className="text-muted" style={{ fontSize: 12 }}>
                  @{item.username}
                </Text>
              </View>
              <Pressable
                onPress={() => desbloquear.mutate(item.id)}
                disabled={desbloquear.isPending}
                className="border border-outline px-3.5 py-2 active:opacity-70"
              >
                <Text
                  className="text-on-surface"
                  style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}
                >
                  DESBLOQUEAR
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
