/**
 * Arte 9:16 pro Stories — versão nativa (ainda não existe).
 *
 * O app roda como PWA hoje, e a arte é desenhada no canvas do navegador
 * (ver arteDeStory.web.ts). No iOS/Android empacotados isso vai precisar de
 * react-native-view-shot ou de um endpoint que renderize no servidor, então
 * aqui a função só avisa que não dá — e a tela esconde o botão.
 */
export interface DestaqueDaArte {
  rotulo: string;
  valor: string;
}

/** Os três formatos que a arte pode ter. */
export type EstiloDaArte = "classico" | "capa" | "moldura";

export interface ArteDeStory {
  /** Foto principal. Sem ela a arte sai só com o fundo e o texto. */
  foto: string | null;
  titulo: string;
  subtitulo?: string | null;
  /** Etiqueta pequena sobre a foto, ex.: "PROJETO EM BUILD". */
  selo?: string | null;
  destaques?: DestaqueDaArte[];
  /** @ do Instagram (do carro ou da pessoa), sem o "@". */
  arroba?: string | null;
  /** Link que vai impresso no rodapé da arte. */
  link: string;
  /** Formato da arte. Sem isto, o clássico. */
  estilo?: EstiloDaArte;
  /** Nome do arquivo gerado, sem extensão. */
  nome: string;
}

export const arteDeStoryDisponivel = false;

export async function gerarArteDeStory(_arte: ArteDeStory): Promise<Blob> {
  throw new Error("A arte pro story só existe na versão web por enquanto.");
}

export async function compartilharArteDeStory(_arte: ArteDeStory): Promise<"compartilhado" | "baixado"> {
  throw new Error("A arte pro story só existe na versão web por enquanto.");
}
