import { create } from "zustand";

/**
 * O que está aberto por cima das publicações: comentários, quem curtiu, ou
 * uma foto em tela cheia.
 *
 * Mora aqui, desenhado uma vez na raiz do app, e não dentro de cada card. O
 * motivo principal é um defeito medido: uma folha com lista desenhada dentro
 * do card fica, pro React Native, "dentro" da lista do feed — mesmo
 * aparecendo num modal, porque o contexto do React atravessa o modal. Lista
 * aninhada na mesma direção vira uma caixa sem rolagem, esperando que a lista
 * de fora role por ela. Num post com 12 comentários, só os primeiros cabiam e
 * o resto ficava inalcançável.
 *
 * De quebra, cada card deixa de montar as próprias folhas: eram duas por
 * post, mesmo fechadas, em toda publicação do feed.
 */
export type Aberta =
  | { tipo: "comentarios"; postId: string }
  | { tipo: "curtidas"; postId: string }
  | { tipo: "foto"; url: string };

interface FolhasState {
  aberta: Aberta | null;
  abrir: (aberta: Aberta) => void;
  fechar: () => void;
}

export const useFolhas = create<FolhasState>((set) => ({
  aberta: null,
  abrir: (aberta) => set({ aberta }),
  fechar: () => set({ aberta: null }),
}));
