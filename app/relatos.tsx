/**
 * Os relatos que chegaram, mais novos primeiro. Só quem modera: pros
 * outros o servidor responde 404 e a tela mostra vazio.
 *
 * Não lido fica com a bolinha vermelha; "Marcar como lido" tira. Quem topou
 * conversar ganha a etiqueta — e o @ abre o perfil, de onde dá pra chamar.
 */
import React from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareText } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { apiService, type Relato } from "@/services/apiService";
import { voltarOuIrPara } from "@/utils/navigation";
import { colors } from "@/constants/theme";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function CartaoDeRelato({ relato }: { relato: Relato }) {
  const queryClient = useQueryClient();
  const lido = !!relato.readAt;
  const marcar = useMutation({
    mutationFn: () => apiService.marcarRelatoLido(relato.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relatos"] });
      queryClient.invalidateQueries({ queryKey: ["relatos-nao-lidos"] });
    },
  });

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, opacity: lido ? 0.7 : 1 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        {!lido && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
        <UserAvatar uri={relato.avatarUrl ?? ""} size={32} />
        <View style={{ flex: 1 }}>
          <Pressable
            disabled={!relato.username}
            onPress={() => relato.username && router.push(`/user/${relato.username}`)}
          >
            <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "700" }}>
              {relato.username ? `@${relato.username}` : "Conta excluída"}
            </Text>
          </Pressable>
          <Text className="text-muted" style={{ fontSize: 11.5 }}>
            {quando(relato.createdAt)}
            {relato.device ? ` · ${relato.device}` : ""}
          </Text>
        </View>
        {relato.rating != null && (
          <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {relato.rating}/5
          </Text>
        )}
      </View>

      <Text className="text-on-surface" style={{ fontSize: 14.5, lineHeight: 21 }}>
        {relato.message}
      </Text>

      <View className="flex-row items-center justify-between">
        {relato.canContact ? (
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: colors.primary }}>
            TOPA CONVERSAR
          </Text>
        ) : (
          <View />
        )}
        {!lido && (
          <Pressable onPress={() => marcar.mutate()} disabled={marcar.isPending} hitSlop={8}>
            <Text className="text-on-surface-variant" style={{ fontSize: 12.5, fontWeight: "600" }}>
              {marcar.isPending ? "Marcando…" : "Marcar como lido"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function RelatosScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["relatos"],
    queryFn: () => apiService.getRelatos(),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="Relatos"
        left={
          <Pressable
            hitSlop={8}
            onPress={() => voltarOuIrPara("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="Não deu pra carregar os relatos." onRetry={refetch} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <CartaoDeRelato relato={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 720, width: "100%", alignSelf: "center" }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon={<MessageSquareText size={32} color={colors.muted} />}
              title="Nenhum relato ainda"
              description="Manda o link downpipe.com.br/app/relato pra quem tá usando."
            />
          }
        />
      )}
    </View>
  );
}
