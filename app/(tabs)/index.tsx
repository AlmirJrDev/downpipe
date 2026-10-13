import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiService } from "@/services/apiService";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/cards/PostCard";
import { QuemSeguir } from "@/components/QuemSeguir";
import { GettingStarted } from "@/components/GettingStarted";
import { FeedEventCard } from "@/components/cards/FeedEventCard";
import { FeedCarCard } from "@/components/cards/FeedCarCard";
import { useEvents } from "@/stores/eventsStore";
import type { Car, CarEvent, Post } from "@/types";
import { FeedSkeleton } from "@/components/ui/States";
import { EmptyState } from "@/components/ui/States";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { colors, spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadCount } from "@/stores/notificationsStore";
import { Bell } from "lucide-react-native";
import { useLarguraDoConteudo, useModoDesktop } from "@/hooks/useDesktop";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import {
  ColunaDaDireita,
  LARGURA_DA_COLUNA_DIREITA,
} from "@/components/desktop/ColunaDaDireita";

type ItemDoFeed =
  | { tipo: "post"; post: Post }
  | { tipo: "encontro"; event: CarEvent }
  | { tipo: "carro"; car: Car };

/** De quantas em quantas publicações entra uma sugestão (encontro ou carro). */
const POSTS_POR_SUGESTAO = 4;
/** Quantas sugestões fecham o feed quando as publicações acabam. */
const SUGESTOES_NO_FIM = 3;

const chaveDe = (item: ItemDoFeed) =>
  item.tipo === "post" ? item.post.id : item.tipo === "encontro" ? `encontro-${item.event.id}` : `carro-${item.car.id}`;

const fotoDe = (item: ItemDoFeed) =>
  item.tipo === "post" ? item.post.imageUrl : item.tipo === "encontro" ? item.event.photoUrl : item.car.photoUrl;

/** O feed no computador tem a largura do feed do Instagram web. */
const LARGURA_DO_FEED = 600;
const VAO_ENTRE_COLUNAS = 40;

/** Quantas publicações à frente já começam a baixar a foto. */
const ADIANTAR = 4;

// Conta como visível a partir de 30% do card na tela. Esperar o card inteiro
// avisaria tarde demais pra adiantar alguma coisa.
const VISIBILIDADE = { itemVisiblePercentThreshold: 30 };

export default function HomeScreen() {
  const { data: me } = useCurrentUser();
  const { data: unreadCount = 0 } = useUnreadCount();

  /**
   * No computador: o feed numa coluna de 600 e, quando cabe, a coluna da
   * direita com os próximos rolês e quem seguir — o modelo do Instagram web.
   * O feed pede a largura toda pra caber as duas lado a lado; numa janela
   * estreita demais pra isso, fica só o feed, com os blocos no topo dele
   * como no celular.
   */
  const desktop = useModoDesktop();
  useLarguraAmpla();
  const conteudo = useLarguraDoConteudo();
  const comColunaDireita =
    desktop && conteudo >= LARGURA_DO_FEED + VAO_ENTRE_COLUNAS + LARGURA_DA_COLUNA_DIREITA;

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => apiService.getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });

  // likesCount/likedByMe já são atualizados direto no cache dessa query
  // (useToggleLike faz optimistic update aqui) — não precisa mais mesclar
  // com nenhuma store local.
  const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  /**
   * Sugestões no meio do feed: um encontro que vem aí ou um carro da
   * garagem do pessoal, de vez em quando — na vaga que era dos anúncios.
   * Não seguem a linha do tempo: um feed com todos os encontros enfileirados
   * pela data de cadastro parecia um mural de quem cadastrou, e não o que
   * a galera está fazendo.
   *
   * Um a cada POSTS_POR_SUGESTAO publicações, alternando encontro e carro.
   * Encontros pelo mais próximo de acontecer; carros pelo mais novo. Os da
   * própria pessoa ficam de fora. Feed curto (conta nova) ainda ganha
   * algumas no fim, pra não abrir vazio.
   */
  const { data: encontrosData } = useEvents({});
  const { data: carrosData } = useQuery({
    queryKey: ["feed-cars"],
    queryFn: () => apiService.getExploreCars(1, 30),
    staleTime: 60_000,
  });
  const feed = useMemo<ItemDoFeed[]>(() => {
    // "Da própria pessoa" é o encontro que ela organiza. O que ela só
    // cadastrou pra outro organizador (tem o @ dele) continua sugestão —
    // senão quem alimenta a agenda nunca vê encontro nenhum no feed.
    const encontros: ItemDoFeed[] = (encontrosData?.pages.flatMap((p) => p.data) ?? [])
      .filter((e) => e.visibility === "public" && (e.organizerId !== me?.id || !!e.organizerInstagram))
      .map((event) => ({ tipo: "encontro", event }));
    // Carro sem foto não tem o que mostrar num cartão de feed.
    const carros: ItemDoFeed[] = (carrosData?.data ?? [])
      .filter((c) => !!c.photoUrl && c.ownerId !== me?.id)
      .map((car) => ({ tipo: "carro", car }));

    let e = 0;
    let c = 0;
    let vez = 0;
    const proxima = (): ItemDoFeed | null => {
      // Alterna; se um dos dois acabou, segue com o outro.
      const querEncontro = vez++ % 2 === 0;
      if (querEncontro && e < encontros.length) return encontros[e++];
      if (c < carros.length) return carros[c++];
      if (e < encontros.length) return encontros[e++];
      return null;
    };

    const itens: ItemDoFeed[] = [];
    posts.forEach((post, i) => {
      itens.push({ tipo: "post", post });
      if ((i + 1) % POSTS_POR_SUGESTAO === 0) {
        const s = proxima();
        if (s) itens.push(s);
      }
    });
    if (!hasNextPage) {
      for (let k = 0; k < SUGESTOES_NO_FIM; k++) {
        const s = proxima();
        if (!s) break;
        itens.push(s);
      }
    }
    return itens;
  }, [posts, encontrosData, carrosData, hasNextPage, me?.id]);

  /**
   * Começa a baixar as fotos das próximas publicações antes de elas entrarem
   * na tela.
   *
   * O feed é foto grande. Esperar o card aparecer pra só então pedir a imagem
   * é o que faz a rolagem parecer lenta: a pessoa chega antes do arquivo. Com
   * isso, o download começa enquanto ela ainda está lendo o card de cima.
   *
   * Só as ADIANTAR seguintes, e cada uma uma vez só, pra não puxar o feed
   * inteiro no plano de dados de quem parou de rolar.
   */
  const feedRef = useRef(feed);
  feedRef.current = feed;
  const jaPedidas = useRef(new Set<string>());

  const adiantarProximasFotos = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const ultimoVisivel = viewableItems[viewableItems.length - 1]?.index;
      if (ultimoVisivel == null) return;

      const proximas = feedRef.current
        .slice(ultimoVisivel + 1, ultimoVisivel + 1 + ADIANTAR)
        .map(fotoDe)
        .filter((url): url is string => !!url && !jaPedidas.current.has(url));

      if (proximas.length === 0) return;
      proximas.forEach((url) => jaPedidas.current.add(url));
      // Sem await: é adiantamento, e falhar aqui não muda nada — a imagem
      // será pedida de novo quando o card aparecer.
      void Image.prefetch(proximas);
    }
  ).current;

  return (
    <View className="flex-1 bg-surface">
      {/* No computador o menu lateral já tem a logo, as notificações e o
          perfil — o cabeçalho de celular só repetiria os três. */}
      {!desktop && (
      <AppHeader
        left={
          <Pressable hitSlop={8} onPress={() => router.push("/notifications")}>
            <Bell size={20} color={colors.onSurfaceVariant} />
            {/* Badge com o número; vira "9+" pra não estourar o círculo. */}
            {unreadCount > 0 && (
              <View
                className="absolute items-center justify-center"
                style={{
                  top: -5,
                  right: -6,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor: colors.primaryContainer,
                }}
              >
                <Text
                  className="text-on-primary-container"
                  style={{ fontSize: 9, fontWeight: "700" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        }
        right={
          <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/profile")}>
            <UserAvatar uri={me?.avatarUrl ?? ""} size={28} />
          </Pressable>
        }
      />
      )}

      <View
        style={
          desktop
            ? { flex: 1, flexDirection: "row", justifyContent: "center", gap: VAO_ENTRE_COLUNAS }
            : { flex: 1 }
        }
      >
      <View style={desktop ? { flex: 1, maxWidth: LARGURA_DO_FEED } : { flex: 1 }}>
      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <EmptyState title="Erro ao carregar feed" description="Tente novamente em instantes." />
      ) : (
        // Feed vazio vira ListEmptyComponent em vez de um branch separado:
        // assim o checklist de primeiros passos (ListHeaderComponent) aparece
        // também pra quem ainda não tem nada no feed — justamente o usuário
        // novo, que é quem mais precisa dele.
        <FlatList
          data={feed}
          keyExtractor={chaveDe}
          renderItem={({ item }) =>
            item.tipo === "post" ? (
              <PostCard post={item.post} />
            ) : item.tipo === "encontro" ? (
              <FeedEventCard event={item.event} />
            ) : (
              <FeedCarCard car={item.car} />
            )
          }
          // Fundo explícito: é o que aparece na área de overscroll do
          // pull-to-refresh, que não é coberta pelo contentContainer.
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingHorizontal: spacing.marginMobile,
            paddingBottom: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <GettingStarted />
              {/* Com a coluna da direita, mora lá. Os encontros não têm mais
                  trilho próprio aqui: entram no feed como publicação. */}
              {!comColunaDireita && <QuemSeguir />}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              title="Seu feed começa por quem você segue"
              description="Siga a galera que você conhece daqui ou publique a primeira foto do seu carro."
            />
          }
          onViewableItemsChanged={adiantarProximasFotos}
          viewabilityConfig={VISIBILIDADE}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
      </View>
      {comColunaDireita && <ColunaDaDireita />}
      </View>
    </View>
  );
}
