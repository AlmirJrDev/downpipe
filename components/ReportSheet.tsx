/**
 * Folha de denúncia.
 *
 * Motivo em lista, não em campo de texto: quem denuncia quer resolver em
 * dois toques, e uma fila categorizada é a única que dá pra priorizar
 * depois. O campo livre fica opcional, como complemento.
 */
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Check, Flag } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { apiService, type MotivoDenuncia } from "@/services/apiService";
import { ApiError } from "@/services/api";
import { colors, typography } from "@/constants/theme";

type Alvo =
  | { postId: string }
  | { commentId: string }
  | { profileId: string };

const MOTIVOS: { valor: MotivoDenuncia; rotulo: string }[] = [
  { valor: "conteudo_improprio", rotulo: "Conteúdo impróprio" },
  { valor: "spam", rotulo: "Spam ou propaganda" },
  { valor: "assedio", rotulo: "Assédio ou ofensa" },
  { valor: "carro_nao_e_meu", rotulo: "Usaram foto do meu carro sem permissão" },
  { valor: "informacao_falsa", rotulo: "Informação falsa" },
  { valor: "outro", rotulo: "Outro motivo" },
];

export function ReportSheet({
  alvo,
  visible,
  onClose,
}: {
  alvo: Alvo;
  visible: boolean;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalhe, setDetalhe] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = useMutation({
    mutationFn: () =>
      apiService.denunciar({ ...alvo, reason: motivo!, details: detalhe.trim() || undefined }),
    onSuccess: () => setEnviado(true),
    onError: (e) =>
      setErro(e instanceof ApiError ? e.message : "Não deu para enviar. Tente de novo."),
  });

  const fechar = () => {
    onClose();
    // Reseta depois de fechar, pra folha não piscar o estado anterior ao
    // abrir de novo.
    setTimeout(() => {
      setMotivo(null);
      setDetalhe("");
      setEnviado(false);
      setErro(null);
    }, 250);
  };

  return (
    <BottomSheet visible={visible} onClose={fechar} title={enviado ? undefined : "Denunciar"}>
      {enviado ? (
        <View className="items-center py-6">
          <Check size={34} color={colors.success} />
          <Text className="text-on-surface mt-4" style={typography.headlineSm}>
            Denúncia enviada
          </Text>
          <Text
            className="text-on-surface-variant text-center mt-2 px-6"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            Vamos analisar. Se quiser não ver mais essa pessoa enquanto isso, dá para
            bloquear pelo perfil dela.
          </Text>
          <Pressable onPress={fechar} className="mt-6 px-8 py-3 border border-outline">
            <Text className="text-on-surface" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2 }}>
              FECHAR
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="pb-2">
          <Text className="text-on-surface-variant mb-4" style={{ fontSize: 13 }}>
            O que está acontecendo aqui?
          </Text>

          {MOTIVOS.map((m) => {
            const escolhido = motivo === m.valor;
            return (
              <Pressable
                key={m.valor}
                onPress={() => setMotivo(m.valor)}
                className="flex-row items-center justify-between py-3.5 border-b border-border active:opacity-70"
              >
                <Text
                  className={escolhido ? "text-on-surface" : "text-on-surface-variant"}
                  style={{ fontSize: 14, fontWeight: escolhido ? "700" : "400", flex: 1 }}
                >
                  {m.rotulo}
                </Text>
                {escolhido && <Check size={17} color={colors.primary} />}
              </Pressable>
            );
          })}

          {motivo && (
            <View className="mt-4">
              <Text
                className="text-on-surface-variant mb-2"
                style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}
              >
                QUER CONTAR MAIS? (OPCIONAL)
              </Text>
              <TextInput
                value={detalhe}
                onChangeText={setDetalhe}
                placeholder="O que aconteceu"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={600}
                className="bg-card border border-border text-on-surface px-3 py-2.5"
                style={{ fontSize: 14, minHeight: 72, textAlignVertical: "top" }}
              />
            </View>
          )}

          {erro && (
            <Text className="text-error mt-3" style={{ fontSize: 13 }}>
              {erro}
            </Text>
          )}

          <Pressable
            onPress={() => enviar.mutate()}
            disabled={!motivo || enviar.isPending}
            className={`flex-row items-center justify-center gap-2 py-3.5 mt-5 ${
              motivo ? "bg-primary-container" : "bg-card border border-border"
            }`}
          >
            {enviar.isPending ? (
              <ActivityIndicator size="small" color={colors.onSurface} />
            ) : (
              <>
                <Flag size={15} color={motivo ? colors.onPrimaryContainer : colors.muted} />
                <Text
                  className={motivo ? "text-on-primary-container" : "text-muted"}
                  style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.3 }}
                >
                  ENVIAR DENÚNCIA
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}
