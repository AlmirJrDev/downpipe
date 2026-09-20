/**
 * A fila de denúncias, pra quem modera.
 *
 * O push da denúncia chega no celular, mas até agora a única forma de ver e
 * agir era o `npm run moderar` no computador, com o projeto aberto. Aqui a
 * decisão inteira cabe num card: motivo, quem denunciou, o texto denunciado,
 * o link pra ver no contexto e os dois botões — apagar ou descartar.
 */
import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { Alert } from "@/utils/alert";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui/States";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { basePublica } from "@/utils/linkPublico";
import { voltarOuIrPara } from "@/utils/navigation";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";
import type { Denuncia } from "@/types";

const QUANDO = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const TIPO: Record<Denuncia["target"]["tipo"], string> = {
  post: "Publicação",
  comentario: "Comentário",
  mensagem: "Mensagem de chat",
  perfil: "Perfil",
};

function Botao({
  label,
  onPress,
  destrutivo,
  ocupado,
}: {
  label: string;
  onPress: () => void;
  destrutivo?: boolean;
  ocupado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado}
      className={`flex-1 border py-3 items-center active:opacity-70 ${
        destrutivo ? "border-error" : "border-outline"
      } ${ocupado ? "opacity-40" : ""}`}
    >
      <Text
        style={{
          color: destrutivo ? colors.error : colors.onSurface,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export default function ModeracaoScreen() {
  const { data: me, isPending: mePendente } = useCurrentUser();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<"open" | "reviewed">("open");

  const fila = useQuery({
    queryKey: ["moderacao", aba],
    queryFn: () => apiService.getFilaDeDenuncias(aba),
    enabled: !!me?.isAdmin,
  });

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ["moderacao"] });
    // O número na entrada do menu vem do mesmo lugar.
    queryClient.invalidateQueries({ queryKey: ["denuncias-abertas"] });
  };

  const naoDeu = (err: unknown) =>
    Alert.alert("Não deu certo", err instanceof ApiError ? err.message : "Tente de novo.");

  const revisar = useMutation({
    mutationFn: (id: string) => apiService.revisarDenuncia(id),
    onSuccess: atualizar,
    onError: naoDeu,
  });

  const apagar = useMutation({
    mutationFn: (alvo: { tipo: "post" | "comentario" | "mensagem"; id: string }) =>
      apiService.apagarConteudoDenunciado(alvo.tipo, alvo.id),
    onSuccess: atualizar,
    onError: naoDeu,
  });

  const confirmarApagar = (denuncia: Denuncia) => {
    const { tipo, id } = denuncia.target;
    if (tipo === "perfil") return;
    Alert.alert(
      `Apagar ${TIPO[tipo].toLowerCase()}?`,
      tipo === "mensagem"
        ? "Ela some do chat pra todo mundo."
        : "Não dá pra desfazer. As denúncias desse conteúdo saem da fila junto.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: () => apagar.mutate({ tipo, id }) },
      ]
    );
  };

  const cabecalho = (
    <AppHeader
      title="Moderação"
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
  );

  if (mePendente) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  // Quem não modera nem devia ter chegado aqui (a entrada não aparece no
  // menu), mas o endereço é digitável — e o backend responde 404 de todo jeito.
  if (!me?.isAdmin) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <EmptyState
          title="Página não encontrada"
          description="Confira o endereço."
          actionLabel="Ir pro feed"
          onAction={() => router.replace("/(tabs)")}
        />
      </View>
    );
  }

  const denuncias = fila.data ?? [];

  return (
    <View className="flex-1 bg-surface">
      {cabecalho}

      <View className="flex-row border-b border-border px-4">
        {(["open", "reviewed"] as const).map((chave) => (
          <Pressable key={chave} onPress={() => setAba(chave)} className="mr-6 pb-3 pt-1">
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 0.5,
                color: aba === chave ? colors.onSurface : colors.muted,
              }}
            >
              {chave === "open" ? "PENDENTES" : "JÁ VISTAS"}
            </Text>
            {aba === chave && (
              <View style={{ height: 2, backgroundColor: colors.primaryContainer, marginTop: 8 }} />
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={fila.isFetching} onRefresh={() => fila.refetch()} tintColor={colors.primary} />
        }
      >
        {fila.isPending ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : denuncias.length === 0 ? (
          <EmptyState
            title={aba === "open" ? "Fila vazia" : "Nada aqui ainda"}
            description={
              aba === "open"
                ? "Nenhuma denúncia esperando resposta."
                : "As denúncias que você resolver aparecem aqui."
            }
          />
        ) : (
          denuncias.map((d) => (
            <View key={d.id} className="border border-border p-4 mb-3">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="text-on-surface flex-1" style={{ fontSize: 15, fontWeight: "600" }}>
                  {d.reasonLabel}
                </Text>
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  {QUANDO(d.createdAt)}
                </Text>
              </View>

              <Text className="text-on-surface-variant mt-1" style={{ fontSize: 12 }}>
                {TIPO[d.target.tipo]} · {d.target.rotulo}
                {d.reporter ? ` · por @${d.reporter}` : ""}
              </Text>

              {/* O texto denunciado resolve a maioria dos casos sem sair daqui. */}
              {d.target.texto ? (
                <View className="border-l-2 border-outline pl-3 mt-3">
                  <Text className="text-on-surface" style={{ fontSize: 14 }}>
                    {d.target.texto}
                  </Text>
                </View>
              ) : null}

              {d.details ? (
                <Text className="text-muted mt-2" style={{ fontSize: 13 }}>
                  Detalhe de quem denunciou: {d.details}
                </Text>
              ) : null}

              <Pressable
                onPress={() => Linking.openURL(`${basePublica()}${d.target.url}`)}
                className="flex-row items-center gap-1.5 mt-3 active:opacity-60"
                hitSlop={6}
              >
                <ExternalLink size={13} color={colors.primary} />
                <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
                  Ver no app
                </Text>
              </Pressable>

              {aba === "open" && (
                <View className="flex-row gap-2 mt-4">
                  <Botao
                    label="Descartar"
                    onPress={() => revisar.mutate(d.id)}
                    ocupado={revisar.isPending}
                  />
                  {d.target.tipo !== "perfil" && (
                    <Botao
                      label="Apagar"
                      destrutivo
                      onPress={() => confirmarApagar(d)}
                      ocupado={apagar.isPending}
                    />
                  )}
                </View>
              )}

              {/* Perfil não se apaga por aqui: excluir conta é irreversível e
                  continua só no `npm run moderar`, com o @ digitado à mão. */}
              {aba === "open" && d.target.tipo === "perfil" && (
                <Text className="text-muted mt-2" style={{ fontSize: 11 }}>
                  Excluir a conta é pelo terminal: npm run moderar -- excluir-conta @{d.target.rotulo.replace(/^perfil @/, "")}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
