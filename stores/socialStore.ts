// Curtidas, follows e comentários — hooks sobre React Query + apiService.
// "Salvar" (isSaved) não tem endpoint no backend (não existe /posts/:id/save);
// virou puramente decorativo, com estado local no componente que renderiza o
// post — não passa por aqui, não persiste entre sessões.
import { Alert } from "@/utils/alert";
import { useInfiniteQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, type PaginatedResult } from "@/services/api";
import { apiService, type CreatePostInput } from "@/services/apiService";
import type { Comment, Post, User } from "@/types";

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => apiService.createPost(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts-by-username"] });
    },
  });
}

/**
 * Editar e excluir publicação mexem em todas as listas onde o post pode
 * estar: feed, publicações do perfil e publicações do carro.
 */
function invalidatePostLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["posts-by-username"] });
  queryClient.invalidateQueries({ queryKey: ["posts-by-car"] });
}

export interface UpdatePostFields {
  title?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  cost?: number | null;
  progressPercent?: number | null;
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdatePostFields }) =>
      apiService.updatePost(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] });
      invalidatePostLists(queryClient);
    },
  });
}

/** O perfil não tem contador de publicações (só seguidores/seguindo/carros/
 * projetos), então não há nada além das listas pra invalidar aqui. */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deletePost(id),
    onSuccess: () => invalidatePostLists(queryClient),
  });
}

interface InfiniteFeedData {
  pages: PaginatedResult<Post>[];
  pageParams: unknown[];
}

/** Os dois formatos em que uma lista de Post vive no cache. */
type CacheDePosts = InfiniteFeedData | PaginatedResult<Post>;

/**
 * Todo cache que guarda Post.
 *
 * O PostCard lê `likedByMe`/`savedByMe` direto do objeto, sem estado
 * próprio: o que não estiver nesta lista simplesmente não reage ao toque.
 * Era o caso de Salvos e das publicações do rolê — o coração não pintava e
 * o número não mexia, porque só o feed e o perfil eram atualizados aqui.
 */
const CHAVES_DE_POST = [
  ["feed"],
  ["posts-by-username"],
  ["posts-by-car"],
  ["saved-posts"],
  ["event-posts"],
];

type CopiaDeCache = [readonly unknown[], CacheDePosts | undefined][];

/** Aplica a mudança otimista em todos eles, devolvendo o antes pro rollback. */
function mexerNosPosts(
  queryClient: QueryClient,
  transformar: (post: Post) => Post
): CopiaDeCache {
  const anteriores: CopiaDeCache = [];

  for (const chave of CHAVES_DE_POST) {
    anteriores.push(...queryClient.getQueriesData<CacheDePosts>({ queryKey: chave }));

    queryClient.setQueriesData<CacheDePosts>({ queryKey: chave }, (old) => {
      if (!old) return old;
      if ("pages" in old) {
        return {
          ...old,
          pages: old.pages.map((page) => ({ ...page, data: page.data.map(transformar) })),
        };
      }
      return { ...old, data: old.data.map(transformar) };
    });
  }

  return anteriores;
}

async function pausarPosts(queryClient: QueryClient) {
  await Promise.all(
    CHAVES_DE_POST.map((chave) => queryClient.cancelQueries({ queryKey: chave }))
  );
}

function revalidarPosts(queryClient: QueryClient) {
  CHAVES_DE_POST.forEach((chave) => queryClient.invalidateQueries({ queryKey: chave }));
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked ? apiService.unlikePost(postId) : apiService.likePost(postId),
    onMutate: async ({ postId, liked }) => {
      await pausarPosts(queryClient);

      const anteriores = mexerNosPosts(queryClient, (post) =>
        post.id === postId
          ? { ...post, likedByMe: !liked, likesCount: post.likesCount + (liked ? -1 : 1) }
          : post
      );

      return { anteriores };
    },
    onError: (err, _vars, context) => {
      // ALREADY_LIKED (409) e LIKE_NOT_FOUND (404) não são falha de verdade:
      // o servidor já está no estado que o toque pediu, normalmente porque o
      // likedByMe veio velho no cache (curtido em outro aparelho, feed
      // carregado antes). Desfazer aqui deixaria a tela no estado errado —
      // melhor manter o otimismo e deixar o refetch abaixo trazer o número
      // real.
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "ALREADY_LIKED" || code === "LIKE_NOT_FOUND") return;

      context?.anteriores.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _err, variables) => {
      revalidarPosts(queryClient);
      // A lista de quem curtiu mudou junto.
      queryClient.invalidateQueries({ queryKey: ["likers", variables.postId] });
    },
  });
}

/**
 * Salvar post. Mesmo desenho do curtir — otimista, porque a resposta é
 * instantânea aos olhos do usuário — mas sem contador público: salvar é
 * privado e ninguém além do dono vê.
 */
export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, saved }: { postId: string; saved: boolean }) =>
      saved ? apiService.unsavePost(postId) : apiService.savePost(postId),
    onMutate: async ({ postId, saved }) => {
      await pausarPosts(queryClient);

      const anteriores = mexerNosPosts(queryClient, (post) =>
        post.id === postId ? { ...post, savedByMe: !saved } : post
      );

      return { anteriores };
    },
    onError: (err, _vars, context) => {
      // ALREADY_SAVED / SAVE_NOT_FOUND: o servidor já está no estado pedido.
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "ALREADY_SAVED" || code === "SAVE_NOT_FOUND") return;

      context?.anteriores.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      // Só a lista de Salvos muda de conteúdo ao salvar; nas outras o marcador
      // já foi corrigido acima. Revalidar o feed aqui custaria um refetch de
      // todas as páginas carregadas a cada toque, sem nada novo pra mostrar.
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
}

/** Lista "Salvos", ordenada por quando foi salvo — não por data do post. */
export function useSavedPosts() {
  return useInfiniteQuery({
    queryKey: ["saved-posts"],
    queryFn: ({ pageParam }) => apiService.getSavedPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
}

/** Quem curtiu o post. Rota pública e paginada; só busca com a folha aberta. */
export function usePostLikers(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["likers", postId],
    queryFn: ({ pageParam }) => apiService.getPostLikers(postId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled,
  });
}

export function useToggleFollow(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, following }: { userId: string; following: boolean }) =>
      following ? apiService.unfollowUser(userId) : apiService.followUser(userId),
    onMutate: async ({ following }) => {
      await queryClient.cancelQueries({ queryKey: ["user", username] });
      const previous = queryClient.getQueryData<User>(["user", username]);

      queryClient.setQueryData<User>(["user", username], (old) =>
        old
          ? {
              ...old,
              isFollowing: !following,
              followersCount: old.followersCount + (following ? -1 : 1),
            }
          : old
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      // Mesmo caso das curtidas: ALREADY_FOLLOWING (409) e FOLLOW_NOT_FOUND
      // (404) querem dizer que o servidor já está no estado pedido, então
      // desfazer deixaria o botão mentindo.
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "ALREADY_FOLLOWING" || code === "FOLLOW_NOT_FOUND") return;

      if (context?.previous) queryClient.setQueryData(["user", username], context.previous);
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", username] });
      // Seguir alguém mexe no MEU followingCount, e as duas listas do outro
      // perfil ganharam/perderam uma pessoa.
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["followers", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      // O feed é montado a partir de quem eu sigo.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/** Seguidores e seguindo. Rotas públicas, paginadas e por id (não username). */
export function useFollowers(userId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["followers", userId],
    queryFn: ({ pageParam }) => apiService.getFollowers(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: enabled && !!userId,
  });
}

export function useFollowing(userId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["following", userId],
    queryFn: ({ pageParam }) => apiService.getFollowing(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: enabled && !!userId,
  });
}

/**
 * Dono do carro responde à marcação. Invalida bastante coisa de propósito:
 * aceitar faz a foto aparecer na página do carro, e recusar desfaz o
 * vínculo — os dois mudam listas diferentes.
 */
export function useRespondCarTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, accept }: { postId: string; accept: boolean }) =>
      apiService.respondCarTag(postId, accept),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts-by-car"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      invalidatePostLists(queryClient);
    },
    // Sem isso a falha era invisível: o toque não mudava nada na tela e não
    // dizia por quê. Aceitar/recusar é decisão do dono sobre o carro dele —
    // ficar em silêncio quando dá errado é o pior jeito de responder.
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Sem conexão com o servidor.";
      Alert.alert("Não deu para responder a marcação", msg);
    },
  });
}

interface InfiniteComments {
  pages: PaginatedResult<Comment>[];
  pageParams: unknown[];
}

/**
 * Mexe no commentsCount direto no cache do feed e do perfil, em vez de
 * invalidar as duas listas. Invalidar recarregaria o feed inteiro com a
 * folha de comentários aberta por cima — o post podia até trocar de lugar
 * embaixo dela.
 */
function bumpCommentsCount(queryClient: QueryClient, postId: string, delta: number) {
  const apply = (post: Post): Post =>
    post.id === postId
      ? { ...post, commentsCount: Math.max(0, post.commentsCount + delta) }
      : post;

  queryClient.setQueriesData<InfiniteFeedData>({ queryKey: ["feed"] }, (old) =>
    old
      ? { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map(apply) })) }
      : old
  );
  queryClient.setQueriesData<PaginatedResult<Post>>({ queryKey: ["posts-by-username"] }, (old) =>
    old ? { ...old, data: old.data.map(apply) } : old
  );
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => apiService.addComment(postId, text),
    onSuccess: (created) => {
      // A lista vem do mais antigo pro mais novo, então o comentário novo
      // entra no fim. Escrever no cache (em vez de invalidar) é o que faz
      // ele aparecer na hora: invalidar recarregaria só as páginas já
      // abertas, e num post com muitos comentários o novo está numa página
      // que ainda não foi carregada — o usuário comentava e não via nada.
      queryClient.setQueryData<InfiniteComments>(["comments", postId], (old) => {
        if (!old || old.pages.length === 0) return old;
        const pages = [...old.pages];
        const last = pages[pages.length - 1];
        pages[pages.length - 1] = {
          ...last,
          data: [...last.data, created],
          pagination: { ...last.pagination, total: last.pagination.total + 1 },
        };
        return { ...old, pages };
      });
      bumpCommentsCount(queryClient, postId, +1);
    },
  });
}

/** Editar não mexe no contador — só troca o texto onde ele já está. */
export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => apiService.updateComment(id, text),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<InfiniteComments>(["comments", postId], (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((c) => (c.id === variables.id ? updated : c)),
              })),
            }
          : old
      );
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteComment(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<InfiniteComments>(["comments", postId], (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.filter((c) => c.id !== id),
              })),
            }
          : old
      );
      bumpCommentsCount(queryClient, postId, -1);
    },
  });
}
