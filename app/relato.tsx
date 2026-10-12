/**
 * "Como tá sendo usar o Downpipe?" — o relato de quem usa.
 *
 * Uma nota de 1 a 5 (opcional), um texto livre e um "pode me chamar". O
 * texto é o que importa: a nota sozinha diz que algo vai mal, não o quê.
 * Quem modera lê em /relatos.
 *
 * O link (downpipe.com.br/app/relato) pode ir direto por mensagem pra
 * quem está testando; quem não entrou passa pelo login e volta pra cá.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, Send, Square, SquareCheck } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { apiService } from "@/services/apiService";
import { voltarOuIrPara } from "@/utils/navigation";
import { ApiError } from "@/services/api";
import { colors } from "@/constants/theme";

const LABEL = { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.5 };

export default function RelatoScreen() {
  const [nota, setNota] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [podeChamar, setPodeChamar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const mandar = useMutation({
    mutationFn: () => apiService.mandarRelato({ rating: nota, message: texto.trim(), canContact: podeChamar }),
    onSuccess: () => setEnviado(true),
    onError: (err) => setErro(err instanceof ApiError ? err.message : "Não deu pra enviar. Tente de novo."),
  });

  const cabecalho = (
    <AppHeader
      title="Seu relato"
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

  if (enviado) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {cabecalho}
        <View className="flex-1 items-center justify-center px-8">
          <Check size={40} color={colors.primary} />
          <Text className="text-on-surface text-center mt-4" style={{ fontSize: 18, fontWeight: "600" }}>
            Valeu demais
          </Text>
          <Text className="text-on-surface-variant text-center mt-2" style={{ fontSize: 14, lineHeight: 20 }}>
            A gente lê cada relato.
            {podeChamar ? " Se precisar entender melhor, te chama por aqui." : ""}
          </Text>
          <View className="w-full mt-7">
            <PrimaryButton label="Voltar" onPress={() => voltarOuIrPara("/(tabs)/profile")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {cabecalho}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "700", marginBottom: 6 }}>
          Como tá sendo usar o Downpipe?
        </Text>
        <Text className="text-on-surface-variant mb-6" style={{ fontSize: 13, lineHeight: 19 }}>
          O app tá no começo e é feito por pouca gente. O que você contar aqui
          decide o que muda primeiro.
        </Text>

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          NOTA (OPCIONAL)
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const ativa = nota === n;
            return (
              <Pressable
                key={n}
                onPress={() => setNota(ativa ? null : n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={`Nota ${n} de 5`}
                className="items-center justify-center active:opacity-80"
                style={{
                  flex: 1,
                  height: 48,
                  borderWidth: 1,
                  borderColor: ativa ? colors.primary : colors.border,
                  backgroundColor: ativa ? colors.primary : "transparent",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "700", color: ativa ? colors.onPrimaryContainer : colors.onSurface }}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row justify-between mt-1.5 mb-6">
          <Text className="text-muted" style={{ fontSize: 11.5 }}>
            Tá difícil
          </Text>
          <Text className="text-muted" style={{ fontSize: 11.5 }}>
            Tô curtindo
          </Text>
        </View>

        <FormField
          label="O que você quer contar"
          placeholder="O que você curtiu, onde travou, o que falta pra você usar mais…"
          hint="Vale tudo: tela que confundiu, ideia, encontro que não achou."
          value={texto}
          onChangeText={setTexto}
          multiline
        />

        <Pressable
          onPress={() => setPodeChamar((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: podeChamar }}
          className="flex-row items-center mb-6 active:opacity-80"
          style={{ gap: 10 }}
        >
          {podeChamar ? (
            <SquareCheck size={20} color={colors.primary} />
          ) : (
            <Square size={20} color={colors.muted} />
          )}
          <Text className="text-on-surface" style={{ fontSize: 14, flex: 1 }}>
            Pode me chamar pra conversar sobre isso
          </Text>
        </Pressable>

        {erro && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {erro}
          </Text>
        )}

        <PrimaryButton
          label="Enviar relato"
          onPress={() => {
            setErro(null);
            mandar.mutate();
          }}
          disabled={!texto.trim()}
          loading={mandar.isPending}
          icon={<Send size={15} color={colors.onPrimaryContainer} />}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
