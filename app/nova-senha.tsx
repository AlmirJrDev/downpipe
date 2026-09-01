/**
 * Define a senha nova, a partir do link que chegou por e-mail.
 *
 * O Supabase devolve o token no fragmento da URL (#access_token=...), que
 * nunca é enviado ao servidor — só o navegador enxerga. Por isso a leitura
 * é feita aqui, e o token vai no header da chamada que troca a senha.
 *
 * Esta tela só faz sentido na web: o link do e-mail abre no navegador. No
 * app nativo ela mostra a orientação de abrir o link no celular.
 */
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { CircleCheck, TriangleAlert } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui/Button";
import { authService } from "@/services/authService";
import { ApiError } from "@/services/api";

/** Lê o access_token do fragmento da URL. Só existe no navegador. */
function tokenDaUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

function Campo({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (t: string) => void;
}) {
  return (
    <View className="mb-5">
      <Text
        className="text-on-surface-variant mb-2"
        style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}
      >
        {rotulo}
      </Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder="Pelo menos 8 caracteres"
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        className="bg-white text-black px-4 py-3.5"
        style={{ fontSize: 15 }}
      />
    </View>
  );
}

export default function NovaSenhaScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [loading, setLoading] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setToken(tokenDaUrl());
  }, []);

  const curta = senha.length > 0 && senha.length < 8;
  const diferentes = repetir.length > 0 && senha !== repetir;
  const valido = senha.length >= 8 && senha === repetir;

  const salvar = async () => {
    if (!token) return;
    setLoading(true);
    setErro(null);
    try {
      await authService.resetPassword(token, senha);
      setPronto(true);
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? // Token vencido é o erro mais provável aqui, e a saída é pedir
            // outro link — não adianta tentar de novo com o mesmo.
            e.status === 401
            ? "Esse link expirou. Peça um novo em 'Esqueci minha senha'."
            : e.message
          : "Não deu para salvar. Tente de novo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {pronto ? (
          <View className="items-center">
            <CircleCheck size={40} color={colors.success} />
            <Text className="text-on-surface text-center mt-5" style={typography.headlineSm}>
              Senha alterada
            </Text>
            <Text className="text-on-surface-variant text-center mt-3" style={{ fontSize: 14 }}>
              Agora é só entrar com ela.
            </Text>
            <View className="w-full mt-8">
              <PrimaryButton label="Entrar" onPress={() => router.replace("/login")} />
            </View>
          </View>
        ) : !token ? (
          <View className="items-center">
            <TriangleAlert size={38} color={colors.warning} />
            <Text className="text-on-surface text-center mt-5" style={typography.headlineSm}>
              Link inválido
            </Text>
            <Text
              className="text-on-surface-variant text-center mt-3"
              style={{ fontSize: 14, lineHeight: 21 }}
            >
              Abra esta página pelo link que chegou no seu e-mail. Se ele já venceu, peça
              outro.
            </Text>
            <View className="w-full mt-8">
              <PrimaryButton
                label="Pedir novo link"
                onPress={() => router.replace("/forgot-password")}
              />
            </View>
          </View>
        ) : (
          <>
            <Text className="text-on-surface text-center" style={typography.headlineSm}>
              Nova senha
            </Text>
            <Text
              className="text-on-surface-variant text-center mt-3 mb-8"
              style={{ fontSize: 14 }}
            >
              Escolha uma senha nova para a sua conta.
            </Text>

            <Campo rotulo="NOVA SENHA" valor={senha} aoMudar={setSenha} />
            <Campo rotulo="REPITA A SENHA" valor={repetir} aoMudar={setRepetir} />

            {curta && (
              <Text className="text-muted mb-3" style={{ fontSize: 12 }}>
                Faltam {8 - senha.length} caractere{8 - senha.length > 1 ? "s" : ""}.
              </Text>
            )}
            {diferentes && (
              <Text className="text-error mb-3" style={{ fontSize: 13 }}>
                As duas senhas não são iguais.
              </Text>
            )}
            {erro && (
              <Text className="text-error mb-4" style={{ fontSize: 13 }}>
                {erro}
              </Text>
            )}

            <PrimaryButton
              label="Salvar senha"
              onPress={salvar}
              loading={loading}
              disabled={!valido}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
