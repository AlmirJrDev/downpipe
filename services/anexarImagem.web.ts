import { descreverImagem } from "@/utils/imagem";

/**
 * Anexa uma imagem local a um FormData — versão do navegador.
 *
 * No navegador a URI que o seletor devolve é blob: ou data:, e o FormData
 * só aceita Blob/File de verdade.
 *
 * Os dois casos são tratados separado de propósito. Um data: dá pra decodificar
 * na mão, sem rede: o fetch numa data: URL depende de suporte do navegador e
 * da política de connect-src, e já falhou por causa dessa política uma vez.
 * Não vale arriscar de novo quando a conversão é aritmética de base64.
 */

// Mesmo teto do backend (MAX_IMAGE_SIZE_BYTES em storage.constants.ts).
// Conferir aqui é só pra mensagem: o servidor recusa de qualquer jeito, mas
// "a foto tem 8 MB" é acionável e um erro de multipart não é.
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

function deDataUrl(uri: string): Blob {
  const virgula = uri.indexOf(",");
  if (virgula === -1) throw new Error("data: URL sem corpo");

  const cabecalho = uri.slice(5, virgula);
  const mime = cabecalho.split(";")[0] || "image/jpeg";
  const corpo = uri.slice(virgula + 1);

  if (!cabecalho.includes("base64")) {
    return new Blob([decodeURIComponent(corpo)], { type: mime });
  }

  const binario = atob(corpo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function lerImagem(uri: string): Promise<Blob> {
  if (uri.startsWith("data:")) return deDataUrl(uri);

  const resposta = await fetch(uri);
  if (!resposta.ok) {
    throw new Error(`a imagem respondeu ${resposta.status} ao ser lida`);
  }
  return resposta.blob();
}

export async function anexarImagem(
  form: FormData,
  campo: string,
  uriLocal: string
): Promise<void> {
  let blob: Blob;
  try {
    blob = await lerImagem(uriLocal);
  } catch (err) {
    // O motivo real vai junto: sem ele, todo problema de leitura vira a
    // mesma frase genérica, e foi exatamente isso que atrasou o diagnóstico
    // quando a CSP bloqueava o blob:.
    const motivo = err instanceof Error ? err.message : String(err);
    throw new Error(`não deu pra ler a imagem (${uriLocal.slice(0, 12)}…): ${motivo}`);
  }

  if (blob.size > TAMANHO_MAXIMO) {
    const mb = (blob.size / 1024 / 1024).toFixed(1);
    throw new Error(`a imagem tem ${mb} MB e o limite é 5 MB`);
  }

  const { filename, mimeType } = descreverImagem(uriLocal, blob.type);
  form.append(campo, new File([blob], filename, { type: mimeType }));
}
