/**
 * A conta, pedida só na hora de publicar.
 *
 * Quem chega pela agenda querendo divulgar o próprio rolê preenche tudo
 * primeiro, e o cadastro aparece no fim, já com o formulário pronto atrás.
 * Pedir conta logo na entrada corta a vontade de quem veio publicar; pedir
 * depois aproveita o que a pessoa já investiu.
 *
 * A conta continua obrigatória: é ela que deixa o organizador editar e
 * cancelar o rolê, receber as notificações e responder o chat — e é o que
 * impede rolê anônimo virar spam.
 *
 * Tudo acontece aqui dentro, sem trocar de tela: sair pro login e voltar
 * perderia a foto escolhida, que não sobrevive a uma navegação.
 */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAuthStore } from "@/stores/authStore";
import { ApiError } from "@/services/api";
import { abrirLegal } from "@/utils/legal";
import { colors } from "@/constants/theme";

export type ComoEntrou = "cadastro" | "login";

const INPUT = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
} as const;

const LABEL = { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 };

export function CadastroParaPublicar({
  visible,
  onClose,
  onEntrou,
}: {
  visible: boolean;
  onClose: () => void;
  /** Chamado com a sessão já valendo: dá pra publicar em seguida. */
  onEntrou: (como: ComoEntrou) => void;
}) {
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);

  const [modo, setModo] = useState<ComoEntrou>("cadastro");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = email.trim().includes("@") && senha.length >= (modo === "cadastro" ? 8 : 1);

  const entrar = async () => {
    if (!valido || enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      if (modo === "cadastro") {
        const { requiresEmailConfirmation } = await register({
          email: email.trim(),
          password: senha,
          displayName: nome.trim() || undefined,
        });
        // Com confirmação de e-mail ligada não há sessão ainda, e publicar
        // falharia. Hoje ela está desligada; se um dia ligarem, a pessoa
        // fica sabendo o que fazer em vez de ver um erro sem sentido.
        if (requiresEmailConfirmation) {
          setErro("Conta criada! Confirme seu e-mail, entre e toque em publicar de novo — o rolê fica salvo aqui.");
          setModo("login");
          return;
        }
      } else {
        await login({ email: email.trim(), password: senha });
      }
      setSenha("");
      onEntrou(modo);
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : modo === "cadastro"
            ? "Não deu pra criar a conta. Tente de novo."
            : "Não deu pra entrar. Confira o e-mail e a senha."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={modo === "cadastro" ? "Falta só sua conta" : "Entrar"}>
      {/* px-5: a mesma margem do título da janela, que o BottomSheet só dá
          ao cabeçalho — o corpo é de cada tela. */}
      <View className="px-5 pb-2">
        <Text className="text-on-surface-variant mb-5" style={{ fontSize: 13.5, lineHeight: 19 }}>
          {modo === "cadastro"
            ? "O rolê já está preenchido. A conta é o que deixa você editar e cancelar ele depois, e responder quem tiver dúvida."
            : "Entre com a sua conta e o rolê é publicado em seguida."}
        </Text>

        {modo === "cadastro" && (
          <>
            <Text className="text-on-surface-variant mb-2" style={LABEL}>
              SEU NOME OU DA EQUIPE
            </Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Como você quer aparecer"
              placeholderTextColor={colors.inputPlaceholder}
              autoComplete="name"
              maxLength={60}
              className="mb-4"
              style={INPUT}
            />
          </>
        )}

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          E-MAIL
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          className="mb-4"
          style={INPUT}
        />

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          SENHA
        </Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          placeholder={modo === "cadastro" ? "Pelo menos 8 caracteres" : "Sua senha"}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={modo === "cadastro" ? "new-password" : "current-password"}
          onSubmitEditing={entrar}
          className="mb-4"
          style={INPUT}
        />

        {erro && (
          <Text className="text-error mb-3" style={{ fontSize: 13, lineHeight: 18 }}>
            {erro}
          </Text>
        )}

        <Pressable
          onPress={entrar}
          disabled={!valido || enviando}
          className={`py-3.5 items-center ${valido ? "bg-primary-container" : "bg-card border border-border"}`}
        >
          {enviando ? (
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
          ) : (
            <Text
              className={valido ? "text-on-primary-container" : "text-muted"}
              style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.3 }}
            >
              {modo === "cadastro" ? "CRIAR CONTA E PUBLICAR" : "ENTRAR E PUBLICAR"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setModo(modo === "cadastro" ? "login" : "cadastro");
            setErro(null);
          }}
          className="py-4 items-center active:opacity-60"
          hitSlop={6}
        >
          <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
            {modo === "cadastro" ? "Já tenho conta" : "Criar uma conta nova"}
          </Text>
        </Pressable>

        {modo === "cadastro" && (
          <Text className="text-muted text-center" style={{ fontSize: 12, lineHeight: 18 }}>
            Ao criar a conta você concorda com os{" "}
            <Text className="text-on-surface-variant" style={{ textDecorationLine: "underline" }} onPress={() => abrirLegal("termos")}>
              termos de uso
            </Text>{" "}
            e a{" "}
            <Text className="text-on-surface-variant" style={{ textDecorationLine: "underline" }} onPress={() => abrirLegal("privacidade")}>
              política de privacidade
            </Text>
            .
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}
