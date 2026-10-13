/**
 * Onboarding, passo 1: "Como você vive carro?".
 *
 * Obrigatória e com mais de uma escolha. O perfil principal decide a tela
 * que vem depois do @ (ver utils/viveCarro), e o resto vira itens no
 * "Comece por aqui" do feed. Quem tem carro e quem só fotografa precisam
 * de primeiros passos diferentes — mandar todo mundo cadastrar carro
 * largava fotógrafo e quem não tem carro numa tela que não era pra eles.
 */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ApiError } from "@/services/api";
import { OPCOES, type ViveCarro } from "@/utils/viveCarro";
import { colors, typography } from "@/constants/theme";
import type { User } from "@/types";

export default function ComoVoceViveScreen() {
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const [marcados, setMarcados] = useState<ViveCarro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Voltou pra cá (ou trocou de aparelho no meio): já vem com o que marcou.
  useEffect(() => {
    if (me?.viveCarro?.length) setMarcados(me.viveCarro as ViveCarro[]);
  }, [me?.viveCarro]);

  const alternar = (id: ViveCarro) =>
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const salvar = useMutation({
    mutationFn: () => apiService.updateMyProfile({ viveCarro: marcados }),
    onSuccess: (atualizado) => {
      // Mescla em vez de trocar: a resposta do PATCH não traz os contadores.
      queryClient.setQueryData<User>(["me"], (antes) => (antes ? { ...antes, ...atualizado } : atualizado));
      router.replace("/edit-profile?onboarding=1");
    },
    onError: (e) => setErro(e instanceof ApiError ? e.message : "Não deu pra salvar. Tente de novo."),
  });

  if (!me) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader title="BEM-VINDO" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40, maxWidth: 560, width: "100%", alignSelf: "center" }}
      >
        <Text className="text-on-surface" style={[typography.headlineSm, { marginBottom: 6 }]}>
          Como você vive carro?
        </Text>
        <Text className="text-on-surface-variant mb-6" style={{ fontSize: 14, lineHeight: 20 }}>
          Marca tudo que for você. A gente monta seus próximos passos a partir disso.
        </Text>

        <View style={{ gap: 10 }}>
          {OPCOES.map(({ id, titulo, descricao, Icone }) => {
            const ativo = marcados.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => alternar(id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ativo }}
                className="flex-row items-center active:opacity-80"
                style={{
                  gap: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: ativo ? colors.primary : colors.border,
                  backgroundColor: ativo ? "rgba(229,57,53,0.08)" : "transparent",
                }}
              >
                <Icone size={22} color={ativo ? colors.primary : colors.onSurfaceVariant} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "700" }}>
                    {titulo}
                  </Text>
                  <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                    {descricao}
                  </Text>
                </View>
                <View
                  className="items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 1,
                    borderColor: ativo ? colors.primaryContainer : colors.outline,
                    backgroundColor: ativo ? colors.primaryContainer : "transparent",
                  }}
                >
                  {ativo && <Check size={14} color={colors.onPrimaryContainer} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {erro && (
          <Text className="text-error mt-4" style={{ fontSize: 13 }}>
            {erro}
          </Text>
        )}

        <View className="mt-7">
          <PrimaryButton
            label="Continuar"
            onPress={() => {
              setErro(null);
              salvar.mutate();
            }}
            disabled={marcados.length === 0}
            loading={salvar.isPending}
          />
          {marcados.length === 0 && (
            <Text className="text-muted text-center mt-3" style={{ fontSize: 12.5 }}>
              Marque pelo menos uma opção pra continuar.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
