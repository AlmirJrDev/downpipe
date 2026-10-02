import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Alert } from "@/utils/alert";
import { Share } from "@/utils/share";
import { linkPublico } from "@/utils/linkPublico";
import { voltarOuIrPara } from "@/utils/navigation";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/apiService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Ban,
  Info,
  CalendarDays,
  Check,
  Globe,
  Link2,
  MapPin,
  MessagesSquare,
  Navigation,
  Pencil,
  QrCode,
  ScanLine,
  Share2,
  Ticket,
  TriangleAlert,
  Users,
} from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { InstagramLink } from "@/components/ui/InstagramLink";
import { ReportSheet } from "@/components/ReportSheet";
import { EmptyState } from "@/components/ui/States";
import { AttendeesSheet } from "@/components/AttendeesSheet";
import { EventMap } from "@/components/EventMap";
import {
  useEventById,
  useToggleAttendance,
  useDeleteEvent,
  useEventPosts,
  useEventAttendees,
} from "@/stores/eventsStore";
import { useUpdateAttendanceCar } from "@/stores/eventsStore";
import { useMyGarage } from "@/stores/garageStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { carTitle } from "@/utils/car";
import { eventEndLine, eventFullDate } from "@/utils/event";
import { openDirections } from "@/utils/maps";
import { postThumbnail } from "@/utils/post";
import { colors, typography } from "@/constants/theme";
import {
  rotuloDaAtracao,
  rotuloDaProibicao,
  rotuloDoTipo,
} from "@/constants/detalhesDoRole";
import { categoryLabel } from "@/utils/labels";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { useLarguraDoConteudo } from "@/hooks/useDesktop";
import type { ViewStyle } from "react-native";

/** Quantos rostos cabem na fileira antes do "+N". */
const AVATARS_VISIVEIS = 6;

/**
 * O rolê no computador: duas colunas dentro de uma largura de leitura.
 *
 * A arte fica "sticky" — parada no topo enquanto os detalhes rolam ao lado.
 * O tipo do RN só conhece os valores nativos de position; o react-native-web
 * repassa "sticky" pro CSS, daí o cast.
 */
const ESTILO_LARGO = {
  moldura: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  colunas: { flexDirection: "row", alignItems: "flex-start", gap: 40 },
  arte: {
    flex: 5,
    aspectRatio: 4 / 5,
    position: "sticky" as ViewStyle["position"],
    top: 32,
    backgroundColor: colors.surfaceContainer,
    overflow: "hidden",
  },
  detalhes: { flex: 6, paddingTop: 4, paddingHorizontal: 0 },
} satisfies Record<string, ViewStyle>;

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const larga = useLarguraAmpla();
  const conteudo = useLarguraDoConteudo();
  /**
   * Onde a grade de fotos do rolê mora. No celular, a tela menos a margem.
   * No computador, a coluna de detalhes: 6 de 11 partes do que sobra da
   * largura de leitura depois das margens (32 de cada lado) e do vão entre
   * as colunas (40) — ver ESTILO_LARGO.
   */
  const larguraDaGrade = larga
    ? ((Math.min(conteudo, ESTILO_LARGO.moldura.maxWidth) - 64 - 40) * 6) / 11
    : conteudo - 40;

  const { data: event, isPending } = useEventById(id);
  const { data: me } = useCurrentUser();
  const toggleAttendance = useToggleAttendance();
  const deleteEvent = useDeleteEvent();
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  const { data: postsData } = useEventPosts(id);
  const eventPosts = useMemo(() => postsData?.pages.flatMap((p) => p.data) ?? [], [postsData]);

  // A fileira de rostos vem da mesma consulta da folha de confirmados, então
  // abrir a lista depois é instantâneo — já está em cache.
  const { data: attendeesData } = useEventAttendees(id, true);
  const { data: myCars } = useMyGarage();
  const updateCar = useUpdateAttendanceCar();

  const meusCarros = myCars ?? [];
  const todosConfirmados = useMemo(
    () => attendeesData?.pages.flatMap((p) => p.data) ?? [],
    [attendeesData]
  );
  // Só quem declarou carro entra na grade.
  const carrosNoRole = useMemo(() => todosConfirmados.filter((a) => a.car), [todosConfirmados]);
  const meuCarroNoRole = useMemo(
    () => todosConfirmados.find((a) => a.username === me?.username)?.car?.id ?? null,
    [todosConfirmados, me]
  );
  const attendees = useMemo(
    () => todosConfirmados.slice(0, AVATARS_VISIVEIS),
    [todosConfirmados]
  );

  // Grade de 3 colunas com 3px de respiro, dentro do padding de 20 da tela.
  const thumbSize = (larguraDaGrade - 6) / 3;

  // Chat é de quem vai: confirmados e o organizador. Aqui em cima, antes dos
  // returns de carregamento, porque hook não pode ficar condicional.
  const participa =
    !!event && (!!event.attendingByMe || (!!me && me.id === event.organizerId));
  const { data: naoLidas } = useQuery({
    queryKey: ["event-chat-unread", id],
    queryFn: () => apiService.getEventChatUnread(id),
    enabled: !!id && participa,
    // A tela do rolê fica aberta enquanto a pessoa decide ou confere o local;
    // o número acompanha sem ela precisar sair e voltar.
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader title="Evento" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader
          title="Evento"
          left={
            <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)/explore")}>
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          }
        />
        <EmptyState
          title="Evento não encontrado"
          description="Ele pode ter sido cancelado pelo organizador."
        />
      </View>
    );
  }

  const fimDoRole = eventEndLine(event.endsAt, event.endsAtEstimated);
  const isOrganizer = !!me && me.id === event.organizerId;
  const attending = !!event.attendingByMe;
  const aproximado = event.coordsPrecision === "city";
  const amigos = event.friendsGoing ?? 0;
  const restantes = event.attendeesCount - attendees.length;

  const confirmDelete = () =>
    Alert.alert("Cancelar evento", `Remover "${event.name}"? Quem confirmou presença recebe um aviso, e não dá pra desfazer.`, [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar evento",
        style: "destructive",
        onPress: () => deleteEvent.mutate(event.id, { onSuccess: () => voltarOuIrPara("/(tabs)/explore") }),
      },
    ]);

  const shareEvent = async () => {
    const linhas = [
      event.name,
      eventFullDate(event.startsAt),
      `${event.location} · ${event.city}`,
      event.address,
      event.description,
      `${event.attendeesCount} confirmados no Downpipe`,
    ].filter(Boolean);

    try {
      // O link é o que faz quem recebe cair direto no rolê pra confirmar.
      await Share.share({ message: linhas.join("\n"), url: linkPublico.evento(event.id) });
    } catch {
      // Cancelar o menu não é erro.
    }
  };

  const comoChegar = () =>
    openDirections({
      latitude: event.latitude,
      longitude: event.longitude,
      // O endereço, quando existe, guia o app de mapa melhor que o nome do
      // lugar: "Posto Graal" pode ter homônimo em outra cidade, "Avenida
      // Marginal Tietê, 1000" não.
      label: event.address ?? `${event.location}, ${event.city}`,
      preciso: event.coordsPrecision === "pinned" || event.coordsPrecision === "exact",
    });

  return (
    <View className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* No computador, duas colunas: a arte inteira à esquerda, parada
            enquanto a página rola, e os detalhes à direita. No celular a
            arte ocupa o topo, cortada, e o resto vem embaixo. */}
        <View style={larga ? ESTILO_LARGO.moldura : undefined}>
        <View style={larga ? ESTILO_LARGO.colunas : undefined}>
        {/* Foto ocupando o topo inteiro, com os controles por cima: sem
            cabeçalho roubando altura, a foto é o que apresenta o rolê. */}
        <View style={larga ? ESTILO_LARGO.arte : { height: 240 }}>
          {event.photoUrl ? (
            <Image
              source={{ uri: event.photoUrl }}
              style={{ width: "100%", height: "100%" }}
              // No computador cabe o flyer inteiro, e é nele que estão a
              // data e o endereço que o organizador escolheu mostrar.
              contentFit={larga ? "contain" : "cover"}
              transition={200}
            />
          ) : (
            <View className="flex-1" style={{ backgroundColor: colors.surfaceContainer }} />
          )}

          <View
            className="absolute flex-row items-center justify-between"
            style={{ top: insets.top + 8, left: 16, right: 16 }}
          >
            <Pressable
              onPress={() => voltarOuIrPara("/(tabs)/explore")}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.overlayMedium }}
            >
              <ArrowLeft size={18} color={colors.onSurface} />
            </Pressable>

            <View className="flex-row items-center gap-2">
              {isOrganizer && (
                <Pressable
                  onPress={() => router.push(`/add-event?eventId=${event.id}`)}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.overlayMedium }}
                >
                  <Pencil size={16} color={colors.onSurface} />
                </Pressable>
              )}
              <Pressable
                onPress={shareEvent}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.overlayMedium }}
              >
                <Share2 size={16} color={colors.onSurface} />
              </Pressable>

              {/* Selo de visibilidade: quem abre precisa saber de cara se o
                  rolê é aberto ou se chegou ali por um link. */}
              <View
                className="flex-row items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  backgroundColor:
                    event.visibility === "public" ? colors.primaryContainer : colors.surfaceHigh,
                }}
              >
                {event.visibility === "public" ? (
                  <Globe size={11} color={colors.onPrimaryContainer} />
                ) : (
                  <Link2 size={11} color={colors.onSurfaceVariant} />
                )}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    color:
                      event.visibility === "public"
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                  }}
                >
                  {event.visibility === "public" ? "PÚBLICO" : "POR LINK"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 pt-5" style={larga ? ESTILO_LARGO.detalhes : undefined}>
          <Text className="text-on-surface" style={{ fontSize: larga ? 32 : 24, fontWeight: "700" }}>
            {event.name}
          </Text>

          {/* As três linhas que decidem a ida: quando, onde, quem. */}
          <View className="mt-4" style={{ gap: 9 }}>
            <View className="flex-row items-center gap-2.5">
              <CalendarDays size={15} color={colors.primary} />
              <Text className="text-on-surface flex-1" style={{ fontSize: 14 }}>
                {eventFullDate(event.startsAt)}
                {/* O fim vem colado na data: é a mesma decisão (dá tempo de ir?). */}
                {fimDoRole && <Text className="text-muted"> · {fimDoRole}</Text>}
              </Text>
            </View>

            <View className="flex-row items-start gap-2.5">
              <MapPin size={15} color={colors.primary} style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-on-surface" style={{ fontSize: 14 }}>
                  {event.location}
                  <Text className="text-muted"> — {event.city}</Text>
                </Text>
                {/* O nome é o que as pessoas reconhecem ("o Graal"), o
                    endereço é o que leva até lá — quem não conhece o lugar
                    precisa das duas linhas, não só de uma. */}
                {event.address && (
                  <Text className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {event.address}
                  </Text>
                )}
              </View>
            </View>

            <Pressable
              onPress={() => setAttendeesOpen(true)}
              className="flex-row items-center gap-2.5 active:opacity-60"
              hitSlop={6}
            >
              <Users size={15} color={colors.primary} />
              <Text className="text-on-surface flex-1" style={{ fontSize: 14 }}>
                {event.attendeesCount} {event.attendeesCount === 1 ? "confirmado" : "confirmados"}
                {/* "12 amigos seus" é o que transforma um número em motivo. */}
                {amigos > 0 && (
                  <Text className="text-muted">
                    {" · "}
                    {amigos} {amigos === 1 ? "amigo seu" : "amigos seus"}
                  </Text>
                )}
              </Text>
            </Pressable>
          </View>

          {aproximado && (
            <View className="flex-row items-start gap-2 mt-4 border border-outline-variant px-3 py-2.5">
              <TriangleAlert size={13} color={colors.warning} style={{ marginTop: 2 }} />
              <Text className="text-muted flex-1" style={{ fontSize: 12, lineHeight: 17 }}>
                Local aproximado — o pino mostra só a região.
              </Text>
            </View>
          )}

          {/* Ações logo após a informação, não no fim da rolagem: decidir se
              vai é o que a pessoa veio fazer aqui. */}
          <View className="flex-row gap-2.5 mt-5">
            <Pressable
              onPress={() => toggleAttendance.mutate({ eventId: event.id, attending })}
              disabled={toggleAttendance.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 py-4 active:opacity-80"
              style={{
                backgroundColor: attending ? "transparent" : colors.success,
                borderWidth: attending ? 1 : 0,
                borderColor: colors.success,
              }}
            >
              {toggleAttendance.isPending ? (
                <ActivityIndicator size="small" color={attending ? colors.success : "#0a0a0a"} />
              ) : (
                <>
                  <Check size={16} color={attending ? colors.success : "#0a0a0a"} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      letterSpacing: 1.2,
                      color: attending ? colors.success : "#0a0a0a",
                    }}
                  >
                    {attending ? "VOCÊ VAI" : "EU VOU"}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={comoChegar}
              className="flex-1 flex-row items-center justify-center gap-2 py-4 border border-outline active:bg-white/5"
            >
              <Navigation size={15} color={colors.onSurface} />
              <Text
                className="text-on-surface"
                style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}
              >
                COMO CHEGAR
              </Text>
            </Pressable>
          </View>

          {/* O ingresso é de quem confirmou; a portaria, de quem organiza.
              Os dois ficam colados nas ações porque é aqui que a pessoa abre
              a tela na fila do rolê. */}
          {attending && (
            <Pressable
              onPress={() => router.push(`/ingresso/${event.id}`)}
              className="flex-row items-center justify-center gap-2 mt-2.5 py-4 border border-outline active:bg-white/5"
            >
              <QrCode size={16} color={colors.onSurface} />
              <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>
                MEU INGRESSO
              </Text>
            </Pressable>
          )}
          {isOrganizer && (
            <Pressable
              onPress={() => router.push(`/portaria/${event.id}`)}
              className="flex-row items-center justify-center gap-2 mt-2.5 py-4 border border-outline active:bg-white/5"
            >
              <ScanLine size={16} color={colors.onSurface} />
              <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>
                PORTARIA
              </Text>
            </Pressable>
          )}

          {/* Logo abaixo de "vou": é pra quem vai. Quem ainda não confirmou
              não vê o botão — veria só um convite pra confirmar do outro lado. */}
          {participa && (
            <Pressable
              onPress={() => router.push(`/event-chat/${event.id}`)}
              className="flex-row items-center justify-between mt-2.5 px-4 py-4 border border-outline active:bg-white/5"
            >
              <View className="flex-row items-center gap-2">
                <MessagesSquare size={16} color={colors.onSurface} />
                <Text
                  className="text-on-surface"
                  style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}
                >
                  CHAT DO ROLÊ
                </Text>
              </View>
              {!!naoLidas && naoLidas > 0 && (
                <View
                  className="items-center justify-center"
                  style={{
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 6,
                    backgroundColor: colors.primaryContainer,
                  }}
                >
                  <Text style={{ color: colors.onPrimaryContainer, fontSize: 12, fontWeight: "700" }}>
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Qual carro vou levar. Só aparece depois de confirmar, e só pra
              quem tem carro — quem vai de carona ou pra fotografar não
              precisa ver nada disso. */}
          {attending && meusCarros.length > 0 && (
            <View className="mt-5">
              <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
                VOU LEVAR
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {meusCarros.map((car) => {
                  const escolhido = meuCarroNoRole === car.id;
                  return (
                    <Pressable
                      key={car.id}
                      // Tocar no já escolhido desmarca: é assim que se diz
                      // "acabei indo de carona".
                      onPress={() =>
                        updateCar.mutate({
                          eventId: event.id,
                          carId: escolhido ? null : car.id,
                        })
                      }
                      className={`mr-2 px-4 py-2.5 border ${
                        escolhido
                          ? "bg-primary-container border-primary-container"
                          : "border-outline-variant"
                      }`}
                    >
                      <Text
                        style={{ fontSize: 13, fontWeight: "600" }}
                        className={escolhido ? "text-on-primary-container" : "text-on-surface-variant"}
                      >
                        {carTitle(car)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text className="text-muted mt-2" style={{ fontSize: 11 }}>
                {meuCarroNoRole
                  ? "Quem ver seu carro no rolê consegue descobrir que é seu."
                  : "Opcional — deixe em branco se for de carona."}
              </Text>
            </View>
          )}

          {event.description && (
            <Text className="text-on-surface mt-6" style={{ fontSize: 14, lineHeight: 22 }}>
              {event.description}
            </Text>
          )}

          {/* De onde veio a informação, quando o rolê não é de quem publicou
              no app. É o que permite conferir antes de viajar até lá — e o
              crédito de quem organiza de verdade. */}
          {!!event.sourceNote && (
            <View className="flex-row items-start gap-2 mt-6 border border-outline-variant p-3">
              <Info size={15} color={colors.onSurfaceVariant} style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-on-surface-variant" style={{ fontSize: 12.5, lineHeight: 18 }}>
                  {event.sourceNote}
                </Text>
                {!!event.sourceUrl && (
                  <Pressable onPress={() => Linking.openURL(event.sourceUrl!)} hitSlop={6}>
                    <Text className="text-primary mt-1" style={{ fontSize: 12.5, fontWeight: "600" }}>
                      Ver a fonte
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* O que o rolê pede pra entrar. Vem antes de tudo porque é o que
              a pessoa precisa saber ANTES de sair de casa. */}
          {!!event.entryNote && (
            <View className="flex-row items-start gap-2 mt-6 border border-outline-variant p-3">
              <Ticket size={15} color={colors.primary} style={{ marginTop: 1 }} />
              <Text className="text-on-surface flex-1" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {event.entryNote}
              </Text>
            </View>
          )}

          {(event.attractions?.length ?? 0) > 0 && (
            <View className="mt-6">
              <Text className="text-on-surface mb-2" style={typography.labelCaps}>
                O que tem lá
              </Text>
              <View className="flex-row flex-wrap">
                {event.attractions!.map((a) => (
                  <View key={a} className="mr-2 mb-2 px-3 py-1.5 border border-outline-variant">
                    <Text className="text-on-surface-variant" style={{ fontSize: 12.5 }}>
                      {rotuloDaAtracao(a)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Proibições em vermelho: é a informação que salva o próximo rolê
              no mesmo lugar. Discreta demais, ninguém lê. */}
          {(event.rules?.length ?? 0) > 0 && (
            <View className="mt-6">
              <Text className="text-on-surface mb-2" style={typography.labelCaps}>
                Não pode
              </Text>
              <View className="flex-row flex-wrap">
                {event.rules!.map((r) => (
                  <View
                    key={r}
                    className="mr-2 mb-2 px-3 py-1.5 flex-row items-center gap-1.5 border"
                    style={{ borderColor: colors.error }}
                  >
                    <Ban size={12} color={colors.error} />
                    <Text style={{ fontSize: 12.5, color: colors.error }}>
                      {rotuloDaProibicao(r)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(event.carCategories?.length ?? 0) > 0 && (
            <View className="mt-6">
              <Text className="text-on-surface mb-2" style={typography.labelCaps}>
                Carros esperados
              </Text>
              <Text className="text-muted" style={{ fontSize: 13, lineHeight: 19 }}>
                {event.carCategories!.map((c) => categoryLabel(c as never)).join(" · ")}
              </Text>
            </View>
          )}


          {/* Carros confirmados: a grade que responde "de quem é esse carro?".
              Vale ser honesto — só aparece quem declarou. */}
          {carrosNoRole.length > 0 && (
            <View className="mt-7">
              <Text className="text-on-surface mb-3" style={typography.labelCaps}>
                Carros confirmados
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {carrosNoRole.map((pessoa) => (
                  <Pressable
                    key={pessoa.userId}
                    onPress={() => router.push(`/car/${pessoa.car!.id}`)}
                    className="border border-border bg-card overflow-hidden active:opacity-90"
                    style={{ width: 150 }}
                  >
                    <View style={{ height: 96, backgroundColor: colors.surfaceContainer }}>
                      {pessoa.car!.photoUrl && (
                        <Image
                          source={{ uri: pessoa.car!.photoUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={150}
                        />
                      )}
                    </View>
                    <View className="px-3 py-2">
                      <Text
                        className="text-on-surface"
                        style={{ fontSize: 13, fontWeight: "600" }}
                        numberOfLines={1}
                      >
                        {pessoa.car!.vehicle
                          ? `${pessoa.car!.vehicle.brand} ${pessoa.car!.vehicle.model}`
                          : pessoa.car!.version ?? "Carro"}
                      </Text>
                      <Text className="text-muted" style={{ fontSize: 11 }} numberOfLines={1}>
                        de @{pessoa.username}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Quem vai, com rosto. Um número não convence; ver a turma sim. */}
          {attendees.length > 0 && (
            <View className="mt-7">
              <Text className="text-on-surface mb-3" style={typography.labelCaps}>
                Quem vai
              </Text>
              <Pressable
                onPress={() => setAttendeesOpen(true)}
                className="flex-row items-center active:opacity-70"
              >
                {attendees.map((pessoa, i) => (
                  <View
                    key={pessoa.userId}
                    // Sobreposição leve: cabem mais rostos na mesma largura.
                    style={{ marginLeft: i === 0 ? 0 : -10 }}
                  >
                    <UserAvatar
                      uri={pessoa.avatarUrl ?? ""}
                      size={40}
                      ringColor={colors.surface}
                    />
                  </View>
                ))}
                {restantes > 0 && (
                  <Text className="text-on-surface-variant ml-3" style={{ fontSize: 13, fontWeight: "600" }}>
                    +{restantes}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {eventPosts.length > 0 && (
            <View className="mt-7">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-on-surface" style={typography.labelCaps}>
                  Fotos do rolê
                </Text>
                <Pressable onPress={() => router.push(`/event-posts/${event.id}`)} hitSlop={8}>
                  <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
                    Ver tudo
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap" style={{ gap: 3 }}>
                {eventPosts.slice(0, 6).map((post) => {
                  const thumb = postThumbnail(post);
                  if (!thumb) return null;
                  return (
                    <Pressable
                      key={post.id}
                      onPress={() => router.push(`/event-posts/${event.id}?postId=${post.id}`)}
                      style={{ width: thumbSize, height: thumbSize }}
                      className="active:opacity-80"
                    >
                      <Image
                        source={{ uri: thumb }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={150}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* O mapa desceu pro fim: "Como chegar" já resolve a navegação, e
              aqui ele serve pra situar a região sem competir com as ações. */}
          <View className="mt-7">
            <Text className="text-on-surface mb-3" style={typography.labelCaps}>
              No mapa
            </Text>
            <EventMap
              latitude={event.latitude}
              longitude={event.longitude}
              precision={event.coordsPrecision}
              location={event.location}
              city={event.city}
              address={event.address}
            />
          </View>

          {/* Quem organiza de verdade, quando o rolê veio de fora: o perfil
              que divulgou. Quem publicou aqui dentro aparece embaixo, como
              quem trouxe — dizer "organizado por" o nome errado manda a
              pessoa perguntar "vai ter mesmo?" pra quem não sabe responder. */}
          {event.organizerInstagram ? (
            <View className="mt-7">
              <Text className="text-muted" style={{ fontSize: 12 }}>
                organizado por
              </Text>
              <View className="mt-1.5">
                <InstagramLink handle={event.organizerInstagram} size={15} />
              </View>
              {/* Crédito só pra quem avisou de verdade. Quem aprovou na fila
                  não aparece: aprovar não é ter avisado, e assinar embaixo do
                  rolê dos outros é o que a gente está justamente evitando. */}
              {!!event.tippedBy && (
                <Pressable
                  onPress={() => router.push(`/user/${event.tippedBy}`)}
                  className="mt-2"
                  hitSlop={6}
                >
                  <Text className="text-muted" style={{ fontSize: 12 }}>
                    quem avisou:{" "}
                    <Text className="text-on-surface-variant" style={{ fontWeight: "600" }}>
                      @{event.tippedBy}
                    </Text>
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            event.organizer && (
              <Pressable
                onPress={() => router.push(`/user/${event.organizer!.username}`)}
                className="flex-row items-center gap-2 mt-7"
                hitSlop={6}
              >
                <UserAvatar uri={event.organizer.avatarUrl ?? ""} size={30} />
                <Text className="text-on-surface-variant" style={{ fontSize: 13 }}>
                  organizado por{" "}
                  <Text className="text-on-surface" style={{ fontWeight: "600" }}>
                    @{event.organizer.username}
                  </Text>
                </Text>
              </Pressable>
            )
          )}

          {/* O aviso de rolê fantasma.
              Informação de segunda mão envelhece: encontro cancelado, data
              que mudou no story e não no post, cartaz do ano passado. Quem
              foi até lá e não achou nada é a única fonte que sabe disso — sem
              um botão, o aviso não chega e o próximo também viaja à toa. */}
          {!!me && !isOrganizer && (
            <Pressable
              onPress={() => setDenunciaAberta(true)}
              className="flex-row items-center justify-center gap-2 py-4 mt-6 active:opacity-60"
              hitSlop={6}
            >
              <TriangleAlert size={14} color={colors.muted} />
              <Text className="text-muted" style={{ fontSize: 13 }}>
                Esse rolê não existe ou está errado?
              </Text>
            </Pressable>
          )}

          {isOrganizer && (
            <Pressable
              onPress={confirmDelete}
              disabled={deleteEvent.isPending}
              className="flex-row items-center justify-center gap-2 py-4 mt-6 active:opacity-60"
            >
              {deleteEvent.isPending ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  Cancelar evento
                </Text>
              )}
            </Pressable>
          )}
        </View>
          </View>
        </View>
      </ScrollView>

      <AttendeesSheet
        eventId={event.id}
        visible={attendeesOpen}
        onClose={() => setAttendeesOpen(false)}
      />

      <ReportSheet
        alvo={{ eventId: event.id }}
        visible={denunciaAberta}
        onClose={() => setDenunciaAberta(false)}
      />
    </View>
  );
}
