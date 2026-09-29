/**
 * Folhas das publicações, desenhadas uma vez só, fora de qualquer lista.
 *
 * Os cards pedem o que abrir pelo useFolhas; este componente, montado na raiz
 * do app, é quem desenha. Ver o porquê em stores/folhasStore.ts — em resumo,
 * lista dentro de card dentro da lista do feed não rolava.
 *
 * No computador, "comentários" abre o post inteiro por cima da página
 * (PostEmModal), como no Instagram web: a folha que sobe de baixo é gesto de
 * celular, e num monitor ela nasceria colada no rodapé da janela.
 */
import React, { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { CommentsSheet } from "@/components/CommentsSheet";
import { LikersSheet } from "@/components/LikersSheet";
import { VisualizadorDeFoto } from "@/components/VisualizadorDeFoto";
import { PostEmModal } from "@/components/desktop/PostEmModal";
import { useModoDesktop } from "@/hooks/useDesktop";
import { useFolhas, type Aberta } from "@/stores/folhasStore";

/** O post que deve estar aberto por cima, se houver — aberto ou por baixo de outra folha. */
function postPorCima(aberta: Aberta | null, desktop: boolean): string | null {
  if (!aberta) return null;
  if (aberta.tipo === "post") return aberta.postId;
  if (aberta.tipo === "comentarios" && desktop) return aberta.postId;
  return null;
}

export function FolhasDoPost() {
  const aberta = useFolhas((s) => s.aberta);
  const embaixo = useFolhas((s) => s.embaixo);
  const fechar = useFolhas((s) => s.fechar);
  const fecharTudo = useFolhas((s) => s.fecharTudo);
  const desktop = useModoDesktop();

  // Um toque no @ de quem publicou, no carro ou no rolê leva pra outra
  // tela — e o que estava aberto por cima tem de sair junto, ou a página
  // nova nasceria escondida atrás dele.
  const pathname = usePathname();
  const anterior = useRef(pathname);
  useEffect(() => {
    if (anterior.current !== pathname) fecharTudo();
    anterior.current = pathname;
  }, [pathname, fecharTudo]);

  const post = postPorCima(aberta, desktop) ?? postPorCima(embaixo, desktop);

  return (
    <>
      {post && <PostEmModal postId={post} onClose={fecharTudo} />}
      <CommentsSheet
        postId={aberta?.tipo === "comentarios" && !desktop ? aberta.postId : ""}
        visible={aberta?.tipo === "comentarios" && !desktop}
        onClose={fechar}
      />
      <LikersSheet
        postId={aberta?.tipo === "curtidas" ? aberta.postId : ""}
        visible={aberta?.tipo === "curtidas"}
        onClose={fechar}
      />
      <VisualizadorDeFoto
        fotos={aberta?.tipo === "foto" ? aberta.fotos : null}
        inicial={aberta?.tipo === "foto" ? aberta.inicial ?? 0 : 0}
        onClose={fechar}
      />
    </>
  );
}
