import React from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ComentariosDoPost } from "@/components/ComentariosDoPost";

export function CommentsSheet({
  postId,
  visible,
  onClose,
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Comentários">
      {/* A chave pelo post remonta a lista a cada abertura: um comentário
          deixado pela metade em edição não reaparece no próximo post. */}
      <ComentariosDoPost
        key={postId}
        postId={postId}
        ativo={visible}
        modo="folha"
        onSairPraPerfil={onClose}
      />
    </BottomSheet>
  );
}
