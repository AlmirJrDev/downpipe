import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Alert } from "@/utils/alert";
import { Share } from "@/utils/share";
import { linkPublico } from "@/utils/linkPublico";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  Clock,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Bookmark,
  Wrench,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/apiService";
import { useArteDeStory } from "@/hooks/useArteDeStory";
import { ApiError } from "@/services/api";
import { ReportSheet } from "@/components/ReportSheet";
import { colors, spacing } from "@/constants/theme";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  useToggleLike,
  useToggleSave,
  useDeletePost,
  useRespondCarTag,
} from "@/stores/socialStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Post } from "@/types";
import { useFolhas, type FotoAberta } from "@/stores/folhasStore";
import { BeforeAfter } from "@/components/BeforeAfter";
import { AdCard } from "./AdCard";
import { HouseAdCard } from "./HouseAdCard";

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function carLabel(car: Post["car"]): string | null {
  if (!car) return null;
  if (car.vehicle) return `${car.vehicle.brand} ${car.vehicle.model} ${car.vehicle.year}`;
  return car.version;
}

/**
 * Menu da publicação.
 *
 * Pro dono, editar e excluir. Pra qualquer outra pessoa, denunciar e
 * bloquear — antes o menu simplesmente não existia pra ela, e quem visse
 * algo errado não tinha nenhuma saída dentro do app.
 *
 * Author só traz username (não id), e username é único: é por ele que dá
 * pra saber se o post é meu.
 */
function OwnerMenu({ post }: { post: Post }) {
  const { data: me } = useCurrentUser();
  const arte = useArteDeStory();
  const deletePost = useDeletePost();
  const queryClient = useQueryClient();
  const [denunciando, setDenunciando] = useState(false);

  const bloquear = useMutation({
    mutationFn: (userId: string) => apiService.bloquear(userId),
    onSuccess: () => {
      // O feed inteiro muda: as publicações da pessoa somem de todas as
      // listas de uma vez.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts-by-username"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Não deu para bloquear.";
      Alert.alert("Não foi possível bloquear", msg);
    },
  });

  if (!me || !post.author) return null;

  const souDono = post.author.username === me.username;
  const autor = post.author;

  const confirmDelete = () =>
    Alert.alert("Excluir publicação", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deletePost.mutate(post.id) },
    ]);

  const confirmarBloqueio = () =>
    Alert.alert(
      `Bloquear @${autor.username}?`,
      "Vocês param de ver as publicações um do outro, e quem seguia deixa de seguir.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: () => {
            // O id do autor não vem no post; o perfil resolve pelo @.
            apiService
              .getUserByUsername(autor.username)
              .then((u) => u && bloquear.mutate(u.id))
              .catch(() => Alert.alert("Não foi possível bloquear", "Tente de novo."));
          },
        },
      ]
    );

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (souDono) {
      Alert.alert("Publicação", undefined, [
        // Só pro dono: a arte carrega o @ de quem publicou.
        ...(arte.disponivel
          ? [
              {
                text: "Arte pro Stories",
                onPress: () => router.push(`/arte/post?id=${post.id}`),
              },
            ]
          : []),
        { text: "Editar", onPress: () => router.push(`/edit-post/${post.id}`) },
        { text: "Excluir", style: "destructive", onPress: confirmDelete },
        { text: "Cancelar", style: "cancel" },
      ]);
      return;
    }

    Alert.alert("Publicação", undefined, [
      { text: "Denunciar", onPress: () => setDenunciando(true) },
      { text: `Bloquear @${autor.username}`, style: "destructive", onPress: confirmarBloqueio },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  if (deletePost.isPending || bloquear.isPending) {
    return <ActivityIndicator size="small" color={colors.onSurfaceVariant} />;
  }

  return (
    <>
      <Pressable onPress={openMenu} hitSlop={10}>
        <MoreHorizontal size={20} color={colors.onSurfaceVariant} />
      </Pressable>
      <ReportSheet
        alvo={{ postId: post.id }}
        visible={denunciando}
        onClose={() => setDenunciando(false)}
      />
    </>
  );
}

/**
 * Etiqueta do rolê onde a foto foi tirada. É o fio que liga a publicação ao
 * encontro: daqui a pessoa chega na página dele e vê tudo que rolou lá.
 */
function EventTag({ post }: { post: Post }) {
  if (!post.event) return null;

  return (
    <Pressable
      onPress={() => router.push(`/event/${post.event!.id}`)}
      className="flex-row items-center gap-1.5 self-start px-2 py-1 border border-outline-variant active:opacity-70"
    >
      <MapPin size={11} color={colors.primary} />
      <Text className="text-primary" style={{ fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
        {post.event.name}
      </Text>
    </Pressable>
  );
}

/**
 * Marcação de carro esperando resposta.
 *
 * Pro dono do carro, aceitar ou recusar. Pra quem publicou, só o aviso de
 * que está aguardando — sem isso ele não entenderia por que a foto não
 * apareceu na página do carro.
 *
 * Ninguém mais vê nada: pra terceiros a publicação é uma foto normal.
 */
function CarTagPending({ post }: { post: Post }) {
  const { data: me } = useCurrentUser();
  const respond = useRespondCarTag();

  if (post.carTagStatus !== "pending" || !post.car || !me) return null;

  const souAutor = post.author?.username === me.username;
  // Só o dono do carro decide. O backend já recusa o resto com 403, mas isso
  // não basta: oferecer um botão que não é seu faz qualquer um achar que
  // manda no carro dos outros, e só descobrir o contrário no erro.
  const podeResponder = post.car.ownerId === me.id;

  if (souAutor) {
    return (
      <View className="flex-row items-center gap-2 px-4 pb-3">
        <Clock size={12} color={colors.warning} />
        <Text className="text-muted flex-1" style={{ fontSize: 11 }}>
          Aguardando o dono aceitar a marcação do carro.
        </Text>
      </View>
    );
  }

  if (!podeResponder) return null;

  return (
    <View className="px-4 pb-3" style={{ gap: 8 }}>
      <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
        Marcaram seu carro nesta foto. Aceitar faz ela aparecer na página dele.
      </Text>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => respond.mutate({ postId: post.id, accept: true })}
          disabled={respond.isPending}
          className="flex-1 items-center py-2.5 bg-primary-container active:opacity-80"
        >
          <Text
            className="text-on-primary-container"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}
          >
            ACEITAR
          </Text>
        </Pressable>
        <Pressable
          onPress={() => respond.mutate({ postId: post.id, accept: false })}
          disabled={respond.isPending}
          className="flex-1 items-center py-2.5 border border-outline active:bg-white/5"
        >
          <Text
            className="text-on-surface-variant"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}
          >
            RECUSAR
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Foto do card que responde a toque.
 *
 * Toque simples abre a foto em tela cheia, com zoom. Toque duplo curte ou
 * descurte, com um coração grande por cima da foto pra confirmar o que
 * aconteceu — sem ele, o toque duplo que descurte passaria despercebido.
 *
 * Exclusive, e não Simultaneous: o toque simples espera o tempo de um
 * possível segundo toque antes de abrir a foto. Sem isso, todo toque duplo
 * abriria a tela cheia por cima do coração.
 */
function FotoTocavel({
  post,
  fotos,
  inicial = 0,
  horizontal = false,
  children,
}: {
  post: Post;
  /** O que a tela cheia mostra. No antes e depois, as duas. */
  fotos: FotoAberta[];
  inicial?: number;
  /** Dentro do carrossel: o dedo também precisa poder arrastar pro lado. */
  horizontal?: boolean;
  children: React.ReactNode;
}) {
  const toggleLike = useToggleLike();
  const abrir = useFolhas((s) => s.abrir);
  const [coracaoCheio, setCoracaoCheio] = useState(true);
  const escala = useSharedValue(0);
  const opacidade = useSharedValue(0);

  const curtirOuDescurtir = () => {
    const liked = !!post.likedByMe;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoracaoCheio(!liked);
    escala.value = withSequence(withTiming(1.15, { duration: 160 }), withTiming(1, { duration: 120 }));
    opacidade.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 380 }),
      withTiming(0, { duration: 220 })
    );
    toggleLike.mutate({ postId: post.id, liked });
  };

  // maxDistance nos dois toques: no antes e depois, arrastar o divisor não
  // pode terminar contando como toque e abrir a tela cheia ao soltar.
  const toqueDuplo = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(10)
    .runOnJS(true)
    .onEnd((_e, sucesso) => {
      if (sucesso) curtirOuDescurtir();
    });

  const toqueSimples = Gesture.Tap()
    .maxDistance(10)
    .runOnJS(true)
    .onEnd((_e, sucesso) => {
      if (sucesso && fotos.length > 0) abrir({ tipo: "foto", fotos, inicial });
    });

  const coracaoStyle = useAnimatedStyle(() => ({
    opacity: opacidade.value,
    transform: [{ scale: escala.value }],
  }));

  return (
    <GestureDetector
      gesture={Gesture.Exclusive(toqueDuplo, toqueSimples)}
      // Só no navegador. O padrão da biblioteca é "none", que entrega todo
      // toque ao gesto e trava a rolagem do feed sempre que o dedo começa
      // numa foto — que é quase a tela inteira. "pan-y" devolve a rolagem
      // vertical ao navegador e, de quebra, desliga o zoom da página no
      // toque duplo, que brigaria com o curtir.
      // No carrossel, "manipulation" (pan-x + pan-y): sem o eixo horizontal
      // liberado, o navegador nunca vê o deslizar entre as fotos. O zoom de
      // toque duplo que esse valor também libera não acontece aqui — o
      // viewport do app é travado em maximum-scale=1.
      touchAction={horizontal ? "manipulation" : "pan-y"}
    >
      <View>
        {children}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <Animated.View style={coracaoStyle}>
            <Heart
              size={96}
              color={colors.onPrimaryContainer}
              fill={coracaoCheio ? colors.primaryContainer : "transparent"}
              strokeWidth={coracaoCheio ? 1 : 1.5}
            />
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}

/**
 * Publicação com mais de uma foto.
 *
 * O backend sempre guardou várias mídias por publicação; o app mostrava só a
 * primeira, e quem voltava de um rolê com vinte fotos tinha que escolher uma
 * ou publicar cinco vezes. Aqui elas viram um carrossel — com contador no
 * canto e bolinhas embaixo, que é como todo mundo já sabe que funciona.
 */
function Carrossel({ post, fotos, altura }: { post: Post; fotos: string[]; altura: number }) {
  // Antes do primeiro layout, a largura da janela menos a margem do feed é
  // um palpite bom o suficiente pra foto não nascer com zero de largura.
  const janela = useWindowDimensions().width;
  const [largura, setLargura] = useState(Math.max(1, janela - spacing.marginMobile * 2));
  const [indice, setIndice] = useState(0);

  const abertas: FotoAberta[] = fotos.map((url, i) => ({ url, rotulo: String(i + 1) }));

  return (
    <View onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndice(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, largura)))
        }
      >
        {fotos.map((url, i) => (
          <FotoTocavel key={url} post={post} fotos={abertas} inicial={i} horizontal>
            <Image
              source={{ uri: url }}
              recyclingKey={`${post.id}-${i}`}
              style={{ width: largura, height: altura }}
              contentFit="cover"
              transition={200}
            />
          </FotoTocavel>
        ))}
      </ScrollView>

      <View className="absolute top-3 right-3 px-2 py-0.5" style={{ backgroundColor: colors.overlayMedium }}>
        <Text className="text-on-surface" style={{ fontSize: 11, fontWeight: "600" }}>
          {indice + 1}/{fotos.length}
        </Text>
      </View>

      <View className="absolute bottom-3 left-0 right-0 flex-row justify-center" style={{ gap: 5 }}>
        {fotos.map((url, i) => (
          <View
            key={url}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === indice ? colors.onSurface : colors.overlayMedium,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** As fotos de uma publicação normal, na ordem em que foram enviadas. */
function fotosDoPost(post: Post): string[] {
  const doServidor = (post.media ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((m) => m.mediaUrl);
  return doServidor.length > 0 ? doServidor : post.imageUrl ? [post.imageUrl] : [];
}

/**
 * Os comentários mais recentes, abaixo da legenda, e o convite pra ver o
 * resto. Tocar em qualquer parte abre a lista inteira.
 */
function PreviaDeComentarios({ post }: { post: Post }) {
  const abrir = useFolhas((s) => s.abrir);
  const previa = post.commentsPreview ?? [];
  if (post.commentsCount === 0) return null;

  const restantes = post.commentsCount - previa.length;

  return (
    <Pressable
      onPress={() => abrir({ tipo: "comentarios", postId: post.id })}
      style={{ gap: 4 }}
      className="active:opacity-70"
    >
      {restantes > 0 && (
        <Text className="text-muted" style={{ fontSize: 13 }}>
          {post.commentsCount === 1 ? "Ver o comentário" : `Ver os ${post.commentsCount} comentários`}
        </Text>
      )}
      {previa.map((c) => (
        <Text key={c.id} className="text-on-surface" style={{ fontSize: 13 }} numberOfLines={2}>
          <Text style={{ fontWeight: "600" }}>@{c.author.username} </Text>
          {c.text}
        </Text>
      ))}
    </Pressable>
  );
}

function EngagementBar({ post }: { post: Post }) {
  const { data: me } = useCurrentUser();
  const arte = useArteDeStory();
  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const abrir = useFolhas((s) => s.abrir);
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const liked = !!post.likedByMe;
  const saved = !!post.savedByMe;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(withTiming(1.3, { duration: 100 }), withTiming(1, { duration: 120 }));
    toggleLike.mutate({ postId: post.id, liked });
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave.mutate({ postId: post.id, saved });
  };

  /** O link abre esta publicação, com a foto na prévia do WhatsApp. */
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const autor = post.author ? `@${post.author.username}` : "alguém";
    const carro = post.car ? carLabel(post.car) : null;
    const linhas = [
      post.title ? post.title : `Build de ${autor} no Downpipe`,
      carro,
      post.caption,
    ].filter(Boolean);

    try {
      await Share.share({ message: linhas.join("\n"), url: linkPublico.post(post.id) });
    } catch {
      // Cancelar o menu de compartilhamento não é erro — nada a fazer.
    }
  };

  return (
    <>
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
        <View className="flex-row items-center gap-5">
          {/* Coração e número são toques diferentes: o coração curte, o
              número abre quem curtiu. Juntos num Pressable só, não havia
              como chegar na lista. */}
          <View className="flex-row items-center gap-1.5">
            <Pressable onPress={handleLike} hitSlop={6}>
              <Animated.View style={heartStyle}>
                <Heart
                  size={22}
                  color={liked ? colors.primaryContainer : colors.onSurface}
                  fill={liked ? colors.primaryContainer : "transparent"}
                />
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={() => abrir({ tipo: "curtidas", postId: post.id })}
              disabled={post.likesCount === 0}
              hitSlop={6}
            >
              <Text className="text-on-surface" style={{ fontSize: 14 }}>
                {formatCount(post.likesCount)}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => abrir({ tipo: "comentarios", postId: post.id })}
            className="flex-row items-center gap-1.5"
          >
            <MessageCircle size={21} color={colors.onSurface} />
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              {formatCount(post.commentsCount)}
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-5">
          <Pressable onPress={handleSave} hitSlop={6}>
            <Bookmark
              size={20}
              color={saved ? colors.primary : colors.onSurface}
              fill={saved ? colors.primary : "transparent"}
            />
          </Pressable>
          {/* Só pro dono, e só onde a arte existe: ela leva o @ de quem
              publicou. Pra visitante a barra fica como antes. */}
          {arte.disponivel && !!me && post.author?.username === me.username && (
            <Pressable
              onPress={() => router.push(`/arte/post?id=${post.id}`)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Arte pro Stories"
            >
              <Instagram size={20} color={colors.onSurface} />
            </Pressable>
          )}
          <Pressable onPress={handleShare} hitSlop={6}>
            <Share2 size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

function PostHeader({ post }: { post: Post }) {
  const author = post.author;
  const car = post.car;
  if (!author) return null;
  return (
    <Pressable
      onPress={() => car && router.push(`/car/${car.id}`)}
      className="flex-row items-center px-4 py-3 gap-3"
    >
      <Pressable
        onPress={() => router.push(`/user/${author.username}`)}
        className="flex-row items-center gap-3 flex-1"
        hitSlop={4}
      >
        <UserAvatar uri={author.avatarUrl ?? ""} size={38} />
        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
            @{author.username}
          </Text>
          {car && (
            <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
              {carLabel(car)}
            </Text>
          )}
        </View>
      </Pressable>
      <View className="flex-row items-center gap-3">
        <Text className="text-muted" style={{ fontSize: 12 }}>
          {timeAgo(post.createdAt)}
        </Text>
        <OwnerMenu post={post} />
      </View>
    </Pressable>
  );
}

function NormalPost({ post }: { post: Post }) {
  const author = post.author;
  const fotos = fotosDoPost(post);
  return (
    <View className="mb-6 border border-border bg-card">
      <PostHeader post={post} />
      {fotos.length > 1 ? (
        <Carrossel post={post} fotos={fotos} altura={420} />
      ) : (
        fotos[0] && (
          <FotoTocavel post={post} fotos={[{ url: fotos[0] }]}>
            <Image
              source={{ uri: fotos[0] }}
              // A FlatList reaproveita a linha ao rolar. Sem isto, o card novo
              // mostra por um instante a foto do post anterior, que já estava
              // carregada, e depois troca.
              recyclingKey={post.id}
              style={{ width: "100%", height: 420 }}
              contentFit="cover"
              transition={200}
            />
          </FotoTocavel>
        )
      )}
      <EngagementBar post={post} />
      <View className="px-4 pb-4 pt-1" style={{ gap: 8 }}>
        <Text className="text-on-surface" style={{ fontSize: 14 }}>
          <Text
            style={{ fontWeight: "600" }}
            onPress={() => author && router.push(`/user/${author.username}`)}
          >
            @{author?.username}{" "}
          </Text>
          {post.caption}
        </Text>
        <PreviaDeComentarios post={post} />
        <EventTag post={post} />
      </View>
      <CarTagPending post={post} />
    </View>
  );
}

function ProjectUpdatePost({ post }: { post: Post }) {
  const car = post.car;
  return (
    <View className="mb-6 border border-border bg-card">
      {/* O título ocupa a linha inteira. O badge vive sobre a foto (mesmo
          padrão do StatusChip no GarageCard) porque na mesma linha ele
          comprimia o título até truncar no meio da palavra. */}
      <View className="px-4 py-3 flex-row items-start gap-3">
        <View className="flex-1">
          <Text
            className="text-on-surface"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}
            numberOfLines={2}
          >
            {(post.title ?? "").toUpperCase()}
          </Text>
          <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 12 }}>
            {post.subtitle}
          </Text>
        </View>
        {/* Este tipo de card não usa PostHeader (não tem linha de autor), então
            o menu do dono entra aqui. */}
        <OwnerMenu post={post} />
      </View>

      <FotoTocavel post={post} fotos={post.imageUrl ? [{ url: post.imageUrl }] : []}>
        <View style={{ height: 300 }}>
          {post.imageUrl && (
            <Image
              source={{ uri: post.imageUrl }}
              recyclingKey={post.id}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          )}
          <View className="absolute top-3 right-3 bg-primary-container px-2 py-1 flex-row items-center gap-1.5">
            <View style={{ width: 6, height: 6, backgroundColor: colors.onPrimaryContainer }} />
            <Text
              className="text-on-primary-container"
              style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
            >
              PROJETO EM BUILD
            </Text>
          </View>
          {/* Faixa escura: sem ela o texto branco desaparece em foto clara. */}
          <View
            className="absolute bottom-0 left-0 right-0 px-4 py-3 flex-row items-center gap-2"
            style={{ backgroundColor: colors.overlayMedium }}
          >
            <Wrench size={16} color={colors.onSurface} />
            <Text
              className="text-on-surface flex-1"
              style={{ fontSize: 17, fontWeight: "600" }}
              numberOfLines={1}
            >
              {post.caption}
            </Text>
          </View>
        </View>
      </FotoTocavel>

      <View className="px-4 py-4">
        <Text className="text-on-surface-variant" style={{ fontSize: 10, letterSpacing: 1.5 }}>
          INVESTIMENTO
        </Text>
        <Text className="text-primary mt-1" style={{ fontSize: 26, fontWeight: "700" }}>
          R$ {(post.cost ?? 0).toLocaleString("pt-BR")}
        </Text>
        <View className="mt-3 mb-1">
          <ProgressBar progress={post.progressPercent ?? 0} />
        </View>
        <Text className="text-muted mt-1" style={{ fontSize: 12 }}>
          Evolução do projeto: {post.progressPercent}%
        </Text>

        <Pressable
          onPress={() => car && router.push(`/project/${car.id}`)}
          className="border border-outline mt-4 py-3.5 items-center"
        >
          <Text
            className="text-on-surface"
            style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
          >
            VER DETALHES DO BUILD
          </Text>
        </Pressable>
      </View>

      <EngagementBar post={post} />
      <View className="px-4 pt-1 pb-4">
        <PreviaDeComentarios post={post} />
      </View>
    </View>
  );
}

function EvolutionPost({ post }: { post: Post }) {
  const hasBoth = !!post.beforeImageUrl && !!post.afterImageUrl;

  return (
    <View className="mb-6 border border-border bg-card">
      <PostHeader post={post} />

      <View className="relative">
        {hasBoth ? (
          // Abre no depois, que é o que a pessoa quer ver primeiro; o seletor
          // da tela cheia leva ao antes.
          <FotoTocavel
            post={post}
            fotos={[
              { url: post.beforeImageUrl!, rotulo: "ANTES" },
              { url: post.afterImageUrl!, rotulo: "DEPOIS" },
            ]}
            inicial={1}
          >
            <BeforeAfter beforeUri={post.beforeImageUrl!} afterUri={post.afterImageUrl!} />
          </FotoTocavel>
        ) : (
          // Post marcado como evolução mas com uma foto só (ex.: upload
          // parcial) — mostra o que existe em vez de quebrar o card.
          <FotoTocavel post={post} fotos={[{ url: (post.beforeImageUrl ?? post.afterImageUrl)! }]}>
            <Image
              source={{ uri: post.beforeImageUrl ?? post.afterImageUrl }}
              recyclingKey={post.id}
              style={{ width: "100%", aspectRatio: 4 / 3 }}
              contentFit="cover"
            />
          </FotoTocavel>
        )}
        <View className="absolute top-3 right-3 bg-primary-container px-2 py-1">
          <Text
            className="text-on-primary-container"
            style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
          >
            ANTES / DEPOIS
          </Text>
        </View>
      </View>

      <EngagementBar post={post} />
      <View className="px-4 pb-4 pt-1" style={{ gap: 8 }}>
        <Text className="text-on-surface" style={{ fontSize: 14 }}>
          {post.caption}
        </Text>
        <PreviaDeComentarios post={post} />
        <EventTag post={post} />
      </View>
    </View>
  );
}

export function PostCard({ post }: { post: Post }) {
  if (post.type === "ad") return <AdCard post={post} />;
  if (post.type === "house_ad") return <HouseAdCard post={post} />;
  if (post.type === "project_update") return <ProjectUpdatePost post={post} />;
  if (post.type === "evolution") return <EvolutionPost post={post} />;
  return <NormalPost post={post} />;
}
