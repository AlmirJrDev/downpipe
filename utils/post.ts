import type { Post } from "@/types";

/**
 * Imagem que representa o post numa miniatura (grade do perfil).
 *
 * Post de evolução não tem `imageUrl`: as duas fotos ficam em
 * `beforeImageUrl`/`afterImageUrl`, e por isso ele aparecia sem imagem na
 * grade. Usa o "depois" como capa — é o resultado do projeto, que é o que
 * faz sentido mostrar. `media` fecha como último recurso, cobrindo qualquer
 * tipo de post que venha a existir.
 */
export function postThumbnail(post: Post): string | undefined {
  return (
    post.imageUrl ?? post.afterImageUrl ?? post.beforeImageUrl ?? post.media?.[0]?.mediaUrl
  );
}
