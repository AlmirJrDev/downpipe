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
  // Mais de uma foto quando o post compara antes e depois: a tela cheia
  // mostra um seletor entre elas, abrindo na de índice `inicial`.
  | { tipo: "foto"; fotos: FotoAberta[]; inicial?: number }
  // O post inteiro aberto por cima da página, no computador: foto à
  // esquerda, comentários à direita (components/desktop/PostEmModal).
  | { tipo: "post"; postId: string };

export interface FotoAberta {
  url: string;
  rotulo?: string;
}

interface FolhasState {
  aberta: Aberta | null;
  /**
   * O post aberto por cima fica guardado aqui enquanto algo abre sobre ele
   * (quem curtiu, a foto em tela cheia): fechar isso volta pro post, em vez
   * de derrubar tudo e devolver a pessoa pra página.
   */
  embaixo: Aberta | null;
  abrir: (aberta: Aberta) => void;
  fechar: () => void;
  /** Fecha tudo de uma vez — ao sair pra outra tela, por exemplo. */
  fecharTudo: () => void;
}

export const useFolhas = create<FolhasState>((set, get) => ({
  aberta: null,
  embaixo: null,
  abrir: (aberta) => {
    const atual = get().aberta;
    const sobreOPost =
      (atual?.tipo === "post" || atual?.tipo === "comentarios") &&
      (aberta.tipo === "curtidas" || aberta.tipo === "foto");
    set({ aberta, embaixo: sobreOPost ? atual : null });
  },
  fechar: () => set((s) => ({ aberta: s.embaixo, embaixo: null })),
  fecharTudo: () => set({ aberta: null, embaixo: null }),
}));
