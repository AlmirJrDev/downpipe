/**
 * A volta do login com Google.
 *
 * O servidor (/auth/google/callback) devolve a pessoa pra cá com a sessão no fragmento do endereço
 * (#access_token=...&refresh_token=...). A tela lê, guarda como qualquer
 * sessão de login e apaga o fragmento da barra — token não fica à vista nem
 * no histórico. Daí em diante quem decide pra onde ir é o AuthRedirect:
 * conta nova vai escolher o @, e quem tinha aberto um link volta pra ele.
 */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { guardarDestino } from "@/utils/visitante";
import { PrimaryButton } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { colors } from "@/constants/theme";

export default function EntrarScreen() {
  const { voltar } = useLocalSearchParams<{ voltar?: string }>();
  const entrarComSessao = useAuthStore((s) => s.entrarComSessao);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const busca = new URLSearchParams(window.location.search);
    window.history.replaceState(null, "", window.location.pathname);

    const falha = fragmento.get("error_description") ?? busca.get("error_description");
    if (falha) {
      setErro("O Google não confirmou a entrada. Tente de novo.");
      return;
    }

    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setErro("Não deu pra entrar com o Google. Tente de novo.");
      return;
    }

    // Só caminho dentro do app — o servidor já filtra, e aqui de novo.
    if (voltar && voltar.startsWith("/") && !voltar.startsWith("//")) guardarDestino(voltar);
    const expiresAt = Number(fragmento.get("expires_at")) || null;
    void entrarComSessao({ accessToken, refreshToken, expiresAt });
    // Uma vez só: o fragmento já foi apagado da barra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 bg-surface items-center justify-center px-8" style={{ gap: 20 }}>
      <Logo height={30} />
      {erro ? (
        <>
          <Text className="text-on-surface text-center" style={{ fontSize: 15 }}>
            {erro}
          </Text>
          <PrimaryButton label="Voltar pro login" onPress={() => router.replace("/login")} fullWidth={false} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text className="text-on-surface-variant" style={{ fontSize: 14 }}>
            Entrando com o Google…
          </Text>
        </>
      )}
    </View>
  );
}
