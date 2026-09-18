/**
 * Chat do rolê.
 *
 * Só entra quem confirmou presença e o organizador — o servidor recusa o
 * resto, e esta tela mostra o convite pra confirmar em vez de uma lista vazia.
 *
 * Mensagem nova chega de dois jeitos: com a tela aberta, ela confere o
 * servidor a cada poucos segundos; com o app fechado, o push avisa. Conferir
 * em intervalo, e não em tempo real por conexão aberta, é escolha consciente:
 * não exige expor o banco ao app nem manter conexão por pessoa, e para um
 * chat de encontro alguns segundos de atraso não mudam nada.
 *
 * O próprio app também escreve aqui ("horário mudou para..."), em mensagens
 * sem autor, centralizadas.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, MessagesSquare, SendHorizontal } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EmptyState } from "@/components/ui/States";
import { ReportSheet } from "@/components/ReportSheet";
import { apiService, type ChatMessage } from "@/services/apiService";
import { ApiError } from "@/services/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEventById } from "@/stores/eventsStore";
import { voltarOuIrPara } from "@/utils/navigation";
import { Alert } from "@/utils/alert";
import { colors } from "@/constants/theme";

/** De quanto em quanto tempo a tela aberta confere mensagem nova. */
const INTERVALO_MS = 4000;

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Junta mensagens novas às que a tela já tem, sem repetir nenhuma. */
function juntar(atuais: ChatMessage[], novas: ChatMessage[]): ChatMessage[] {
  const vistas = new Set(atuais.map((m) => m.id));
  const ineditas = novas.filter((m) => !vistas.has(m.id));
  if (ineditas.length === 0) return atuais;
  // A lista é da mais nova pra mais antiga (ela é invertida na tela).
  return [...ineditas.reverse(), ...atuais];
}

export default function EventChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? "";
  const { data: me } = useCurrentUser();
  const { data: evento } = useEventById(eventId);
  const queryClient = useQueryClient();

  // Da mais nova pra mais antiga: é a ordem que a lista invertida espera.
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [souOrganizador, setSouOrganizador] = useState(false);
  const [temAntigas, setTemAntigas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [denunciando, setDenunciando] = useState<string | null>(null);
  // Aumentar refaz a primeira carga: é o "tentar de novo" da tela de erro.
  const [tentativa, setTentativa] = useState(0);

  // A conferida em intervalo lê o estado mais recente por aqui, sem precisar
  // recriar o timer a cada mensagem.
  const mensagensRef = useRef(mensagens);
  mensagensRef.current = mensagens;

  /** Abrir ou conferir o chat zera o contador que aparece na tela do rolê. */
  const zerarContador = useCallback(() => {
    queryClient.setQueryData(["event-chat-unread", eventId], 0);
  }, [queryClient, eventId]);

  // Primeira carga.
  useEffect(() => {
    if (!eventId) return;
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    apiService
      .getEventChat(eventId)
      .then((janela) => {
        if (cancelado) return;
        setMensagens([...janela.messages].reverse());
        setOrganizerId(janela.organizerId);
        setSouOrganizador(janela.isOrganizer);
        setTemAntigas(janela.hasOlder);
        zerarContador();
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 403) setBloqueado(true);
        else setErro("Não deu pra carregar o chat. Confira a conexão e tente de novo.");
      })
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [eventId, zerarContador, tentativa]);

  // Mensagem nova, enquanto a tela estiver aberta e visível.
  useFocusEffect(
    useCallback(() => {
      if (!eventId || bloqueado) return;

      const conferir = async () => {
        // Aba do navegador escondida: ninguém está olhando, e a conferida
        // ainda marcaria como lida uma mensagem que ninguém viu.
        if (Platform.OS === "web" && typeof document !== "undefined" && document.hidden) return;
        const maisNova = mensagensRef.current[0];
        try {
          const janela = await apiService.getEventChat(
            eventId,
            maisNova ? { desde: maisNova.createdAt } : {}
          );
          setMensagens((atuais) => juntar(atuais, janela.messages));
          zerarContador();
        } catch {
          // Falha pontual de rede: a próxima conferida tenta de novo.
        }
      };

      const timer = setInterval(conferir, INTERVALO_MS);
      return () => clearInterval(timer);
    }, [eventId, bloqueado, zerarContador])
  );

  const carregarAntigas = async () => {
    const maisAntiga = mensagens[mensagens.length - 1];
    if (!temAntigas || carregandoAntigas || !maisAntiga) return;
    setCarregandoAntigas(true);
    try {
      const janela = await apiService.getEventChat(eventId, { antes: maisAntiga.createdAt });
      setMensagens((atuais) => {
        const vistas = new Set(atuais.map((m) => m.id));
        return [...atuais, ...[...janela.messages].reverse().filter((m) => !vistas.has(m.id))];
      });
      setTemAntigas(janela.hasOlder);
    } catch {
      // Rolar de novo tenta de novo.
    } finally {
      setCarregandoAntigas(false);
    }
  };

  const enviar = async () => {
    const limpo = texto.trim();
    if (!limpo || enviando) return;
    setEnviando(true);
    try {
      const nova = await apiService.sendEventMessage(eventId, limpo);
      setMensagens((atuais) => juntar(atuais, [nova]));
      setTexto("");
    } catch (err) {
      Alert.alert(
        "Não deu pra enviar",
        err instanceof ApiError ? err.message : "Confira a conexão e tente de novo."
      );
    } finally {
      setEnviando(false);
    }
  };

  const apagar = (mensagem: ChatMessage) => {
    Alert.alert("Apagar mensagem", "Ela some do chat pra todo mundo.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteEventMessage(eventId, mensagem.id);
            setMensagens((atuais) => atuais.filter((m) => m.id !== mensagem.id));
          } catch (err) {
            Alert.alert("Não deu pra apagar", err instanceof ApiError ? err.message : "Tente de novo.");
          }
        },
      },
    ]);
  };

  const opcoes = (mensagem: ChatMessage) => {
    const minha = !!me && mensagem.author?.id === me.id;
    const podeApagar = minha || souOrganizador;
    const podeDenunciar = !minha && mensagem.kind === "mensagem";
    if (!podeApagar && !podeDenunciar) return;

    Alert.alert("Mensagem", undefined, [
      ...(podeDenunciar ? [{ text: "Denunciar", onPress: () => setDenunciando(mensagem.id) }] : []),
      ...(podeApagar
        ? [{ text: "Apagar", style: "destructive" as const, onPress: () => apagar(mensagem) }]
        : []),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  const voltar = () => voltarOuIrPara(`/event/${eventId}`);

  const cabecalho = (
    <AppHeader
      title={evento?.name ? evento.name.toUpperCase() : "CHAT DO ROLÊ"}
      left={
        <Pressable hitSlop={8} onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar pro rolê">
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (bloqueado || erro) {
    return (
      <View className="flex-1 bg-surface">
        {cabecalho}
        <EmptyState
          icon={<MessagesSquare size={30} color={colors.muted} />}
          title={bloqueado ? "Chat de quem vai" : "Chat indisponível"}
          description={
            bloqueado
              ? "Confirme presença no rolê pra entrar na conversa e receber os avisos do organizador."
              : erro ?? ""
          }
          actionLabel={bloqueado ? "Ver o rolê" : "Tentar de novo"}
          onAction={bloqueado ? () => router.replace(`/event/${eventId}`) : () => setTentativa((t) => t + 1)}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {cabecalho}

      <FlatList
        data={mensagens}
        keyExtractor={(m) => m.id}
        inverted
        onEndReached={carregarAntigas}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 10 }}
        style={{ flex: 1 }}
        ListFooterComponent={
          carregandoAntigas ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : null
        }
        ListEmptyComponent={
          // A lista é invertida: o vazio aparece de cabeça pra baixo sem isto.
          <View style={{ transform: [{ scaleY: -1 }] }} className="items-center px-8 py-16">
            <MessagesSquare size={28} color={colors.muted} />
            <Text className="text-on-surface-variant text-center mt-3" style={{ fontSize: 14, lineHeight: 20 }}>
              Ninguém escreveu ainda. Combine carona, avise se vai atrasar, pergunte o que levar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Mensagem
            mensagem={item}
            minha={!!me && item.author?.id === me.id}
            doOrganizador={!!item.author && item.author.id === organizerId}
            onLongPress={() => opcoes(item)}
          />
        )}
      />

      <View
        className="flex-row items-end gap-2 px-3 py-2 border-t border-border"
        style={{ backgroundColor: colors.surface }}
      >
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={souOrganizador ? "Escreva um aviso ou mensagem..." : "Mensagem pro rolê..."}
          placeholderTextColor={colors.inputPlaceholder}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            maxHeight: 120,
            backgroundColor: colors.inputSurface,
            color: colors.onInputSurface,
            fontSize: 15,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={enviar}
          // Botão só com ícone: sem nome, o leitor de tela anuncia "botão" e nada mais.
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          disabled={!texto.trim() || enviando}
          hitSlop={6}
          className="items-center justify-center active:opacity-70"
          style={{
            width: 44,
            height: 44,
            backgroundColor: colors.primaryContainer,
            opacity: !texto.trim() || enviando ? 0.4 : 1,
          }}
        >
          {enviando ? (
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
          ) : (
            <SendHorizontal size={18} color={colors.onPrimaryContainer} />
          )}
        </Pressable>
      </View>

      {denunciando && (
        <ReportSheet
          alvo={{ messageId: denunciando }}
          visible={!!denunciando}
          onClose={() => setDenunciando(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function Mensagem({
  mensagem,
  minha,
  doOrganizador,
  onLongPress,
}: {
  mensagem: ChatMessage;
  minha: boolean;
  doOrganizador: boolean;
  onLongPress: () => void;
}) {
  // Aviso do próprio app: centralizado e sem balão, pra não parecer que
  // alguém escreveu.
  if (mensagem.kind === "sistema") {
    return (
      <Pressable onLongPress={onLongPress} className="items-center px-6">
        <View className="flex-row items-center gap-1.5 px-3 py-2 border border-outline-variant">
          <Megaphone size={13} color={colors.primary} />
          <Text className="text-on-surface text-center" style={{ fontSize: 13, lineHeight: 18 }}>
            {mensagem.text}
          </Text>
        </View>
        <Text className="text-muted mt-1" style={{ fontSize: 10 }}>
          {hora(mensagem.createdAt)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      className={`flex-row gap-2 ${minha ? "justify-end" : "justify-start"}`}
    >
      {!minha && <UserAvatar uri={mensagem.author?.avatarUrl ?? ""} size={28} />}
      <View style={{ maxWidth: "78%" }}>
        {!minha && (
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-on-surface-variant" style={{ fontSize: 12, fontWeight: "600" }}>
              @{mensagem.author?.username}
            </Text>
            {doOrganizador && (
              <Text className="text-primary" style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                ORGANIZADOR
              </Text>
            )}
          </View>
        )}
        <View
          className="px-3 py-2"
          style={{
            backgroundColor: minha ? colors.primaryContainer : colors.surfaceHigh,
            borderWidth: doOrganizador && !minha ? 1 : 0,
            borderColor: colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              lineHeight: 21,
              color: minha ? colors.onPrimaryContainer : colors.onSurface,
            }}
          >
            {mensagem.text}
          </Text>
        </View>
        <Text
          className="text-muted mt-1"
          style={{ fontSize: 10, textAlign: minha ? "right" : "left" }}
        >
          {hora(mensagem.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
