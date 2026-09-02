import { descreverImagem } from "@/utils/imagem";

/**
 * Anexa uma imagem local a um FormData — versão do navegador.
 *
 * No navegador a URI que o seletor de imagem devolve é um blob: ou data:,
 * e o FormData só aceita Blob/File de verdade. Buscar a própria URI é o
 * jeito que funciona para as duas formas sem tratar cada uma.
 *
 * Um blob: não tem extensão no endereço, então o mime do conteúdo é a
 * única pista sobre o formato — daí ele ser passado ao descreverImagem.
 */
export async function anexarImagem(
  form: FormData,
  campo: string,
  uriLocal: string
): Promise<void> {
  const resposta = await fetch(uriLocal);
  if (!resposta.ok) {
    throw new Error("Não foi possível ler a imagem escolhida.");
  }

  const blob = await resposta.blob();
  const { filename, mimeType } = descreverImagem(uriLocal, blob.type);

  form.append(campo, new File([blob], filename, { type: mimeType }));
}
