/**
 * Excluir a conta.
 *
 * O nome da rota não é "excluir-conta" de propósito: esse é o endereço da
 * página pública (public/excluir-conta.html) que vai no Google Play, e uma
 * tela com o mesmo nome a sobrescreveria no build.
 *
 * Obrigatório nas duas lojas (Google Play e App Store exigem o caminho
 * dentro do app, não só por e-mail) e já prometido na política de
 * privacidade. É a única ação do app que não tem volta, então a tela
 * explica o que some antes e pede o @ digitado — o servidor confere o
 * mesmo @ de novo, pra um toque acidental nunca bastar.
 *
 * A lista abaixo não é texto de marketing: espelha o que o banco apaga de
 * fato em cascata (ver profilesService.deleteMe no backend). Se aquilo
 * mudar, esta lista precisa mudar junto.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { apiService } from "@/services/apiService";
import { ApiError } from "@/services/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/authStore";
import { voltarOuIrPara } from "@/utils/navigation";
import { Alert } from "@/utils/alert";
import { colors, typography } from "@/constants/theme";

const SOME = [
  "Seu perfil, foto e bio",
  "Seus carros, com modificações e projetos",
  "Suas publicações e todas as fotos que você enviou",
  "Seus comentários, curtidas e mensagens nos chats de rolê",
  "Quem você segue e quem te segue",
  "Os rolês que você organizou e suas presenças",
  "Suas notificações e publicações salvas",
];

export default function ExcluirContaScreen() {
  const { data: me } = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const excluir = useMutation({
    mutationFn: () => apiService.deleteMyAccount(digitado),
    onSuccess: async () => {
      queryClient.clear();
      await logout();
      Alert.alert("Conta excluída", "Seus dados foram apagados. Obrigado por ter passado por aqui.");
    },
    onError: (err) => {
      setErro(err instanceof ApiError ? err.message : "Não deu pra excluir agora. Tente de novo.");
    },
  });

  const confere = !!me && digitado === me.username;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title="EXCLUIR CONTA"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)/profile")}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-on-surface" style={typography.headlineSm}>
          Isso não tem volta
        </Text>
        <Text className="text-on-surface-variant mt-2" style={typography.bodyMd}>
          A conta é apagada na hora, junto com tudo o que veio com ela. Não dá pra recuperar depois.
        </Text>

        <View className="border border-border mt-6 px-4 py-4">
          <Text className="text-muted mb-3" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
            O QUE É APAGADO
          </Text>
          {SOME.map((item) => (
            <Text key={item} className="text-on-surface mb-2" style={{ fontSize: 14, lineHeight: 20 }}>
              •  {item}
            </Text>
          ))}
        </View>

        <View className="border border-border mt-3 px-4 py-4">
          <Text className="text-muted mb-3" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
            O QUE CONTINUA
          </Text>
          <Text className="text-on-surface-variant" style={{ fontSize: 14, lineHeight: 20 }}>
            Publicações de outras pessoas que marcaram o seu carro continuam no perfil delas, só sem a
            marcação. A foto é de quem fotografou.
          </Text>
        </View>

        <View className="mt-8">
          <FormField
            label={`Digite ${me ? `@${me.username}` : "o seu @"} para confirmar`}
            placeholder={me?.username ?? ""}
            value={digitado}
            onChangeText={(t) => {
              setErro(null);
              setDigitado(t.trim().replace(/^@/, "").toLowerCase());
            }}
            autoCapitalize="none"
          />
        </View>

        {erro && (
          <Text className="mb-4" style={{ color: colors.error, fontSize: 13 }}>
            {erro}
          </Text>
        )}

        <PrimaryButton
          label="Excluir minha conta"
          onPress={() => excluir.mutate()}
          loading={excluir.isPending}
          disabled={!confere}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
