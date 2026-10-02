/**
 * O ingresso de quem confirmou presença: o QR que a portaria lê.
 *
 * A tela é pensada pra fila: QR grande, fundo branco atrás dele (câmera de
 * celular barato não lê QR claro sobre fundo escuro com o brilho baixo), e
 * o nome e o carro embaixo pra quem confere olhar a pessoa, não o celular.
 */
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { ArrowLeft, CircleCheck, Sun } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useEventById, useMyTicket } from "@/stores/eventsStore";
import { voltarOuIrPara } from "@/utils/navigation";
import { eventFullDate } from "@/utils/event";
import { codigoLegivel, montarConteudoDoQr } from "@/utils/ingresso";
import { colors, typography } from "@/constants/theme";

export default function IngressoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data: event } = useEventById(id);
  const { data: ticket, isPending, isError, refetch } = useMyTicket(id, true);

  const voltar = () => voltarOuIrPara(`/event/${id}`);
  // Grande o bastante pra ler de longe, sem passar da tela no computador.
  const tamanhoDoQr = Math.min(width - 96, 300);

  const cabecalho = (
    <AppHeader
      title="Ingresso"
      left={
        <Pressable hitSlop={8} onPress={voltar}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (isPending) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <ErrorState message="Não deu pra carregar o ingresso." onRetry={() => refetch()} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <EmptyState
          title="Sem ingresso"
          description="O ingresso aparece quando você confirma presença no rolê."
          actionLabel="Ver o rolê"
          onAction={voltar}
        />
      </View>
    );
  }

  const entrou = !!ticket.checkedInAt;
  const horaDaEntrada = entrou
    ? new Date(ticket.checkedInAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View className="flex-1 bg-surface">
      {cabecalho}
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }}>
        {event && (
          <View className="items-center mb-6">
            <Text className="text-on-surface text-center" style={{ fontSize: 20, fontWeight: "700" }}>
              {event.name}
            </Text>
            <Text className="text-muted text-center mt-1" style={{ fontSize: 13 }}>
              {eventFullDate(event.startsAt)} · {event.location}
            </Text>
          </View>
        )}

        <View
          style={{
            padding: 20,
            backgroundColor: "#ffffff",
            // Depois da entrada o QR fica apagado: mostrar de novo na porta
            // não serve pra nada, e evita a tentação de passar o print adiante.
            opacity: entrou ? 0.25 : 1,
          }}
        >
          <QRCode
            value={montarConteudoDoQr(ticket.eventId, ticket.code)}
            size={tamanhoDoQr}
            color="#000000"
            backgroundColor="#ffffff"
            ecl="M"
          />
        </View>

        <Text
          className="text-on-surface-variant mt-4"
          style={{ fontSize: 15, fontWeight: "600", letterSpacing: 3, fontVariant: ["tabular-nums"] }}
          selectable
        >
          {codigoLegivel(ticket.code)}
        </Text>

        {entrou ? (
          <View
            className="flex-row items-center gap-2 mt-6 px-4 py-3"
            style={{ borderWidth: 1, borderColor: colors.success }}
          >
            <CircleCheck size={18} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 14, fontWeight: "700" }}>
              Entrada feita às {horaDaEntrada}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2 mt-6">
            <Sun size={14} color={colors.muted} />
            <Text className="text-muted" style={{ fontSize: 12.5 }}>
              Na portaria, aumente o brilho da tela.
            </Text>
          </View>
        )}

        <View className="w-full mt-8 border-t border-outline-variant pt-5" style={{ maxWidth: 360, gap: 14 }}>
          <View>
            <Text className="text-muted mb-1" style={typography.labelCaps}>
              Nome
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "600" }}>
              {ticket.holderName}
              {ticket.holderUsername && (
                <Text className="text-muted" style={{ fontWeight: "400" }}>
                  {"  "}@{ticket.holderUsername}
                </Text>
              )}
            </Text>
          </View>
          <View>
            <Text className="text-muted mb-1" style={typography.labelCaps}>
              Carro
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 16 }}>
              {ticket.carLabel ?? "Sem carro — escolha na página do rolê, se for levar"}
            </Text>
          </View>
        </View>

        <Text className="text-muted text-center mt-8" style={{ fontSize: 12, lineHeight: 18, maxWidth: 320 }}>
          O ingresso é seu e vale uma entrada. Se outra pessoa usar um print
          dele antes, a portaria vai acusar que já entrou.
        </Text>
      </ScrollView>
    </View>
  );
}
