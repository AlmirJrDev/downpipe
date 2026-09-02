/**
 * Nome e tipo do arquivo a enviar, a partir do que se sabe da imagem.
 *
 * Vive fora dos arquivos de plataforma porque os dois lados precisam da
 * mesma regra: o backend valida a extensão e o mime, e divergir aqui faria
 * a mesma foto ser aceita no celular e recusada no navegador.
 */

const POR_EXTENSAO: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

/**
 * @param uri     de onde a imagem veio (caminho no celular, blob: ou data:)
 * @param mimeDoBlob mime que o navegador informou, quando existir — é a
 *                   única pista num blob:, que não tem extensão no endereço
 */
export function descreverImagem(
  uri: string,
  mimeDoBlob?: string
): { filename: string; mimeType: string } {
  const doBlob = mimeDoBlob && POR_MIME[mimeDoBlob] ? mimeDoBlob : null;

  const extensaoDaUri = uri.split("?")[0].split("/").pop()?.split(".").pop()?.toLowerCase();
  const daUri = extensaoDaUri ? POR_EXTENSAO[extensaoDaUri] : undefined;

  // O mime do navegador ganha: ele descreve o conteúdo, enquanto a extensão
  // do endereço é só um nome — e num blob: nem existe.
  const mimeType = doBlob ?? daUri ?? "image/jpeg";
  const extensao = POR_MIME[mimeType] ?? "jpg";

  return { filename: `foto.${extensao}`, mimeType };
}
