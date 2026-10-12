/**
 * "Continuar com Google", no login e no cadastro.
 *
 * Só aparece quando o Google está ligado no Supabase — o servidor pergunta
 * e responde em /auth/providers. Enquanto não estiver, a tela fica como
 * sempre foi, sem botão que daria erro. Só na web por enquanto: no app
 * nativo a volta do Google precisaria de um link do próprio app.
 */
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { emModoDemo } from "@/services/demo/modoDemo";
import { verDestino } from "@/utils/visitante";
import { colors } from "@/constants/theme";

/** O "G" do Google, nas cores dele — o botão segue a marca do Google. */
function LogoDoGoogle({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function useGoogleLigado(): boolean {
  const { data } = useQuery({
    queryKey: ["login-social"],
    queryFn: () => api.get<{ google: boolean }>("/auth/providers"),
    staleTime: 5 * 60_000,
    enabled: Platform.OS === "web" && !emModoDemo(),
  });
  return !!data?.google;
}

export function BotaoGoogle() {
  const ligado = useGoogleLigado();
  if (!ligado) return null;

  const entrar = () => {
    // O link que a pessoa tinha aberto vai junto, porque a página sai do
    // site e volta — a memória do app não sobrevive à viagem.
    const destino = verDestino();
    const voltar = destino ? `?voltar=${encodeURIComponent(destino)}` : "";
    window.location.href = `/auth/google${voltar}`;
  };

  return (
    <View style={{ gap: 18, marginBottom: 18 }}>
      <Pressable
        onPress={entrar}
        accessibilityRole="button"
        className="flex-row items-center justify-center active:opacity-80"
        style={{ gap: 10, height: 50, backgroundColor: "#FFFFFF" }}
      >
        <LogoDoGoogle />
        <Text style={{ color: "#1F1F1F", fontSize: 15, fontWeight: "600" }}>Continuar com Google</Text>
      </Pressable>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.6 }}>OU COM E-MAIL</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
    </View>
  );
}
