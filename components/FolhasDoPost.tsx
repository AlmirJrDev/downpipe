/**
 * Folhas das publicações, desenhadas uma vez só, fora de qualquer lista.
 *
 * Os cards pedem o que abrir pelo useFolhas; este componente, montado na raiz
 * do app, é quem desenha. Ver o porquê em stores/folhasStore.ts — em resumo,
 * lista dentro de card dentro da lista do feed não rolava.
 */
import React from "react";
import { CommentsSheet } from "@/components/CommentsSheet";
import { LikersSheet } from "@/components/LikersSheet";
import { VisualizadorDeFoto } from "@/components/VisualizadorDeFoto";
import { useFolhas } from "@/stores/folhasStore";

export function FolhasDoPost() {
  const aberta = useFolhas((s) => s.aberta);
  const fechar = useFolhas((s) => s.fechar);

  return (
    <>
      <CommentsSheet
        postId={aberta?.tipo === "comentarios" ? aberta.postId : ""}
        visible={aberta?.tipo === "comentarios"}
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
