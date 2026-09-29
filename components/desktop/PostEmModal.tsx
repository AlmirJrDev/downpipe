/**
 * A publicação aberta por cima da página, no computador.
 *
 * É o post do Instagram web: a foto grande à esquerda, e à direita quem
 * publicou, a legenda, os comentários e curtir/salvar. Abrir por cima, e não
 * numa tela nova, mantém a pessoa onde estava — fechou, está de volta na
 * mesma grade, na mesma rolagem.
 *
 * Não é uma rota de propósito: a tela de trás perderia o foco, e com ele a
 * largura que pediu (useLarguraAmpla) — o perfil encolheria atrás do post.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { apiService } from "@/services/apiService";
import { EngagementBar, EventTag, PostHeader, fotosDoPost } from "@/components/cards/PostCard";
import { ComentariosDoPost } from "@/components/ComentariosDoPost";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useFolhas, type FotoAberta } from "@/stores/folhasStore";
import { colors } from "@/constants/theme";
import { timeAgo } from "@/utils/time";
import type { Post } from "@/types";

const LARGURA_DA_COLUNA = 420;
/** Folga em volta da caixa: o fundo escuro precisa aparecer pra ser clicável. */
const FOLGA = 48;

/** As fotos na ordem de mostrar, com rótulo quando o post compara. */
function fotosDoModal(post: Post): FotoAberta[] {
  if (post.type === "evolution") {
    const fotos: FotoAberta[] = [];
    if (post.beforeImageUrl) fotos.push({ url: post.beforeImageUrl, rotulo: "ANTES" });
    if (post.afterImageUrl) fotos.push({ url: post.afterImageUrl, rotulo: "DEPOIS" });
    return fotos;
  }
  if (post.type === "project_update") return post.imageUrl ? [{ url: post.imageUrl }] : [];
  return fotosDoPost(post).map((url) => ({ url }));
}

/**
 * O post que a grade ou o feed já tem na memória, pra caixa abrir cheia em
 * vez de piscar um carregando. A busca pelo id confirma logo depois.
 */
function postJaCarregado(queryClient: QueryClient, postId: string): Post | undefined {
  for (const chave of [["posts-by-username"], ["feed"], ["saved-posts"], ["posts-by-car"], ["event-posts"]]) {
    for (const [, dados] of queryClient.getQueriesData<unknown>({ queryKey: chave })) {
      const paginas: { data?: Post[] }[] =
        dados && typeof dados === "object" && "pages" in dados
          ? (dados as { pages: { data?: Post[] }[] }).pages
          : dados && typeof dados === "object" && "data" in dados
            ? [dados as { data?: Post[] }]
            : [];
      for (const pagina of paginas) {
        const achado = pagina.data?.find((p) => p?.id === postId);
        if (achado) return achado;
      }
    }
  }
  return undefined;
}

export function PostEmModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const abrir = useFolhas((s) => s.abrir);

  const { data: post, isPending } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiService.getPostById(postId),
    placeholderData: () => postJaCarregado(queryClient, postId),
  });

  const fotos = useMemo(() => (post ? fotosDoModal(post) : []), [post]);
  const [indice, setIndice] = useState(0);
  useEffect(() => setIndice(0), [postId]);

  // Setas do teclado trocam a foto — menos quando a pessoa está escrevendo
  // um comentário e quer só andar o cursor.
  useEffect(() => {
    if (Platform.OS !== "web" || fotos.length < 2) return;
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") setIndice((i) => Math.min(fotos.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndice((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fotos.length]);

  const altura = Math.min(height - FOLGA * 2, 880);
  const temFoto = fotos.length > 0;
  // A foto é quadrada até onde a altura deixar; em janela estreita ela cede
  // largura, e a coluna dos comentários fica sempre inteira.
  const larguraDaFoto = temFoto
    ? Math.max(320, Math.min(altura, width - FOLGA * 2 - 80 - LARGURA_DA_COLUNA))
    : 0;
  const foto = fotos[Math.min(indice, fotos.length - 1)];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Fechar publicação"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }}
        />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          style={{ position: "absolute", top: 16, right: 20 }}
        >
          <X size={28} color={colors.onSurface} />
        </Pressable>

        {!post ? (
          <View
            style={{
              width: 420,
              padding: 32,
              alignItems: "center",
              backgroundColor: colors.surfaceLow,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text className="text-on-surface" style={{ fontSize: 15, fontWeight: "600" }}>
                  Publicação não encontrada
                </Text>
                <Text className="text-on-surface-variant mt-1" style={{ fontSize: 13 }}>
                  Ela pode ter sido apagada por quem publicou.
                </Text>
              </>
            )}
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              height: altura,
              backgroundColor: colors.surfaceLow,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            {temFoto && foto && (
              <View style={{ width: larguraDaFoto, height: altura, backgroundColor: "#000" }}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => abrir({ tipo: "foto", fotos, inicial: indice })}
                  accessibilityLabel="Ver a foto em tela cheia"
                >
                  <Image
                    source={{ uri: foto.url }}
                    recyclingKey={`${post.id}-${indice}`}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={150}
                  />
                </Pressable>

                {foto.rotulo && (
                  <View
                    pointerEvents="none"
                    className="absolute top-3 left-3 bg-primary-container px-2 py-1"
                  >
                    <Text
                      className="text-on-primary-container"
                      style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}
                    >
                      {foto.rotulo}
                    </Text>
                  </View>
                )}

                {fotos.length > 1 && (
                  <>
                    {indice > 0 && (
                      <SetaDaFoto lado="esquerda" onPress={() => setIndice(indice - 1)} />
                    )}
                    {indice < fotos.length - 1 && (
                      <SetaDaFoto lado="direita" onPress={() => setIndice(indice + 1)} />
                    )}
                    <View
                      pointerEvents="none"
                      className="absolute bottom-4 left-0 right-0 flex-row justify-center"
                      style={{ gap: 6 }}
                    >
                      {fotos.map((f, i) => (
                        <View
                          key={f.url}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: i === indice ? colors.onSurface : colors.overlayMedium,
                          }}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            <View
              style={{
                width: temFoto ? LARGURA_DA_COLUNA : 560,
                height: altura,
                borderLeftWidth: temFoto ? 1 : 0,
                borderLeftColor: colors.border,
              }}
            >
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <PostHeader post={post} />
              </View>

              <ComentariosDoPost
                key={post.id}
                postId={post.id}
                ativo
                modo="painel"
                onSairPraPerfil={onClose}
                cabecalho={<Legenda post={post} onSair={onClose} />}
                antesDoCampo={
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 8 }}>
                    <EngagementBar post={post} />
                    <Text className="text-muted px-4" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                      {timeAgo(post.createdAt).toUpperCase()}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function SetaDaFoto({ lado, onPress }: { lado: "esquerda" | "direita"; onPress: () => void }) {
  const Icone = lado === "esquerda" ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={lado === "esquerda" ? "Foto anterior" : "Próxima foto"}
      style={{
        position: "absolute",
        top: "50%",
        marginTop: -16,
        [lado === "esquerda" ? "left" : "right"]: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(240,240,240,0.85)",
      }}
    >
      <Icone size={18} color="#111" />
    </Pressable>
  );
}

/**
 * A legenda no topo da lista, como o primeiro comentário — é assim que o
 * Instagram faz, e deixa ela rolar junto em vez de roubar altura fixa.
 */
function Legenda({ post, onSair }: { post: Post; onSair: () => void }) {
  const autor = post.author;
  const projeto = post.type === "project_update";
  const car = post.car;
  if (!post.caption && !projeto && !post.event) return null;

  return (
    <View className="px-5 pt-4 pb-3" style={{ gap: 10 }}>
      <View className="flex-row gap-3">
        <UserAvatar uri={autor?.avatarUrl ?? ""} size={32} />
        <View className="flex-1" style={{ gap: 4 }}>
          {projeto && post.title && (
            <Text className="text-on-surface" style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
              {post.title.toUpperCase()}
            </Text>
          )}
          {!!post.caption && (
            <Text className="text-on-surface" style={{ fontSize: 13, lineHeight: 19 }}>
              <Text
                style={{ fontWeight: "600" }}
                onPress={() => {
                  if (!autor) return;
                  onSair();
                  router.push(`/user/${autor.username}`);
                }}
              >
                @{autor?.username}{" "}
              </Text>
              {post.caption}
            </Text>
          )}
          {projeto && (
            <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
              Investimento: R$ {(post.cost ?? 0).toLocaleString("pt-BR")} · evolução{" "}
              {post.progressPercent ?? 0}%
            </Text>
          )}
          <Text className="text-muted" style={{ fontSize: 11 }}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>
      {post.event && (
        <View style={{ paddingLeft: 44 }}>
          <EventTag post={post} />
        </View>
      )}
      {projeto && car && (
        <Pressable
          onPress={() => {
            onSair();
            router.push(`/project/${car.id}`);
          }}
          className="border border-outline py-2.5 items-center active:bg-white/5"
          style={{ marginLeft: 44 }}
        >
          <Text className="text-on-surface" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            VER O PROJETO
          </Text>
        </Pressable>
      )}
    </View>
  );
}
