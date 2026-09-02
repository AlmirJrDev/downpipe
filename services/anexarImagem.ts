import { descreverImagem } from "@/utils/imagem";

/**
 * Anexa uma imagem local a um FormData — versão do celular.
 *
 * O FormData do React Native aceita {uri, name, type} e resolve a leitura
 * do arquivo por conta própria. O FormData do navegador NÃO aceita isso:
 * qualquer objeto que não seja Blob vira a string "[object Object]", e o
 * servidor recebe um campo de texto no lugar do arquivo — em silêncio.
 *
 * Por isso existe um anexarImagem.web.ts ao lado deste. Os dois nomes
 * precisam ser simétricos (.ts e .web.ts) ou o Metro não troca um pelo
 * outro.
 *
 * É async só para ter a mesma assinatura dos dois lados; aqui não espera
 * nada.
 */
export async function anexarImagem(
  form: FormData,
  campo: string,
  uriLocal: string
): Promise<void> {
  const { filename, mimeType } = descreverImagem(uriLocal);

  // @ts-expect-error -- extensão do React Native ao FormData padrão.
  form.append(campo, { uri: uriLocal, name: filename, type: mimeType });
}
