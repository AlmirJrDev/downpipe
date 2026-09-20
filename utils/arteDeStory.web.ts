/**
 * Arte 9:16 pro Stories, desenhada no canvas do navegador.
 *
 * Postar o print da tela do app no Stories fica feio e não diz de onde veio.
 * Aqui sai uma imagem 1080x1920 na identidade do app — foto grande, os
 * números do build e o @ de quem é — pronta pro botão de compartilhar do
 * celular (que oferece o Instagram) ou pra baixar no computador.
 *
 * Tudo é desenhado à mão, sem biblioteca: html2canvas e afins pesam mais que
 * o app inteiro e renderizam pior do que este canvas.
 */
import { FONT_STACK, colors } from "@/constants/theme";
import type { ArteDeStory, DestaqueDaArte } from "@/utils/arteDeStory";

export type { ArteDeStory, DestaqueDaArte };

const L = 1080;
const A = 1920;
/** Margem lateral. Instagram corta as beiradas em telas estreitas. */
const M = 88;
/** Alturas do bloco de baixo, usadas pra medir antes de desenhar. */
const RESPIRO_APOS_A_FOTO = 40;
const LINHA_DO_TITULO = 88;
const LINHA_DO_SUBTITULO = 54;
const BLOCO_DE_DESTAQUES = 194;
const RESPIRO_ANTES_DO_RODAPE = 60;
const RODAPE = 200;

export const arteDeStoryDisponivel = true;

/** A foto cobrindo o retângulo, cortando o excedente (igual ao contentFit cover). */
function desenharCobrindo(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  largura: number,
  altura: number
) {
  const escala = Math.max(largura / img.width, altura / img.height);
  const l = img.width * escala;
  const a = img.height * escala;
  ctx.drawImage(img, x + (largura - l) / 2, y + (altura - a) / 2, l, a);
}

/** Quebra o texto em no máximo `maxLinhas`, com reticências na última. */
function quebrar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  largura: number,
  maxLinhas: number
): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= largura || !atual) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavra;
      if (linhas.length === maxLinhas) break;
    }
  }
  if (linhas.length < maxLinhas && atual) linhas.push(atual);

  if (linhas.length === maxLinhas) {
    let ultima = linhas[maxLinhas - 1];
    const sobrou = palavras.join(" ").length > linhas.join(" ").length;
    if (sobrou) {
      while (ultima && ctx.measureText(`${ultima}…`).width > largura) {
        ultima = ultima.slice(0, -1);
      }
      linhas[maxLinhas - 1] = `${ultima}…`;
    }
  }
  return linhas;
}

function carregarFoto(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // O storage do Supabase responde com CORS liberado; sem isto o canvas
    // fica "tainted" e o toBlob no fim falha.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function espacar(ctx: CanvasRenderingContext2D, valor: string) {
  // letterSpacing não existe em navegador antigo — sem ele o texto só sai
  // mais apertado, então não vale um fallback desenhando letra a letra.
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = valor;
  } catch {
    // segue sem espaçamento
  }
}

async function desenhar(arte: ArteDeStory): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não desenha a arte.");

  ctx.fillStyle = colors.surfaceLowest;
  ctx.fillRect(0, 0, L, A);

  // Mede o texto primeiro e dá o resto pra foto. Altura fixa dava os dois
  // defeitos: com pouco texto sobrava um vão preto, e com muito o @ do
  // rodapé encostava nos números.
  ctx.font = `700 76px ${FONT_STACK}`;
  const linhasDoTitulo = quebrar(ctx, arte.titulo, L - M * 2, 2);
  ctx.font = `400 38px ${FONT_STACK}`;
  const linhasDoSubtitulo = arte.subtitulo ? quebrar(ctx, arte.subtitulo, L - M * 2, 1) : [];
  const destaques = (arte.destaques ?? []).slice(0, 3);

  const alturaDoTexto =
    RESPIRO_APOS_A_FOTO +
    linhasDoTitulo.length * LINHA_DO_TITULO +
    linhasDoSubtitulo.length * LINHA_DO_SUBTITULO +
    (destaques.length > 0 ? BLOCO_DE_DESTAQUES : 0) +
    RESPIRO_ANTES_DO_RODAPE +
    RODAPE;
  // Limites pra foto nunca virar uma tarja nem engolir o texto.
  const alturaDaFoto = Math.round(
    Math.min(Math.max(A - alturaDoTexto, A * 0.52), A * 0.72)
  );
  const img = arte.foto ? await carregarFoto(arte.foto) : null;
  if (img) {
    desenharCobrindo(ctx, img, 0, 0, L, alturaDaFoto);
  } else {
    ctx.fillStyle = colors.surfaceContainer;
    ctx.fillRect(0, 0, L, alturaDaFoto);
  }

  // Degradê: o texto branco some em foto clara, e o corte reto da foto
  // deixava a arte com cara de colagem.
  const degrade = ctx.createLinearGradient(0, alturaDaFoto - 420, 0, alturaDaFoto);
  degrade.addColorStop(0, "rgba(10,10,10,0)");
  degrade.addColorStop(1, colors.surfaceLowest);
  ctx.fillStyle = degrade;
  ctx.fillRect(0, alturaDaFoto - 420, L, 420);

  // Topo escurecido pro wordmark aparecer sobre foto clara.
  const topo = ctx.createLinearGradient(0, 0, 0, 260);
  topo.addColorStop(0, "rgba(10,10,10,0.75)");
  topo.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = topo;
  ctx.fillRect(0, 0, L, 260);

  // Wordmark.
  ctx.textBaseline = "alphabetic";
  espacar(ctx, "10px");
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillStyle = colors.onSurface;
  ctx.fillText("DOWNPIPE", M, 118);
  const larguraDoNome = ctx.measureText("DOWNPIPE").width;
  espacar(ctx, "0px");
  ctx.fillStyle = colors.primary;
  ctx.fillRect(M, 134, larguraDoNome - 10, 5);

  // Selo sobre a foto.
  if (arte.selo) {
    espacar(ctx, "6px");
    ctx.font = `700 26px ${FONT_STACK}`;
    const texto = arte.selo.toUpperCase();
    const larguraDoSelo = ctx.measureText(texto).width;
    ctx.fillStyle = colors.primaryContainer;
    // Colado no fim da foto: no meio dela o selo fica boiando.
    ctx.fillRect(M, alturaDaFoto - 190, larguraDoSelo + 56, 70);
    ctx.fillStyle = colors.onPrimaryContainer;
    ctx.fillText(texto, M + 28, alturaDaFoto - 143);
    espacar(ctx, "0px");
  }

  // Bloco de texto.
  let y = alturaDaFoto + RESPIRO_APOS_A_FOTO;

  ctx.font = `700 76px ${FONT_STACK}`;
  ctx.fillStyle = colors.onSurface;
  for (const linha of linhasDoTitulo) {
    ctx.fillText(linha, M, y + 62);
    y += LINHA_DO_TITULO;
  }

  ctx.font = `400 38px ${FONT_STACK}`;
  ctx.fillStyle = colors.onSurfaceVariant;
  for (const linha of linhasDoSubtitulo) {
    ctx.fillText(linha, M, y + 46);
    y += LINHA_DO_SUBTITULO;
  }

  if (destaques.length > 0) {
    y += 46;
    ctx.fillStyle = colors.primary;
    ctx.fillRect(M, y, 96, 6);
    y += 58;

    const coluna = (L - M * 2) / destaques.length;
    destaques.forEach((destaque, i) => {
      const x = M + coluna * i;
      espacar(ctx, "4px");
      ctx.font = `700 24px ${FONT_STACK}`;
      ctx.fillStyle = colors.muted;
      ctx.fillText(destaque.rotulo.toUpperCase(), x, y + 24);
      espacar(ctx, "0px");
      ctx.font = `700 52px ${FONT_STACK}`;
      ctx.fillStyle = colors.onSurface;
      ctx.fillText(destaque.valor, x, y + 90);
    });
  }

  // Rodapé: quem é e onde ver o resto.
  if (arte.arroba) {
    ctx.font = `600 40px ${FONT_STACK}`;
    ctx.fillStyle = colors.onSurface;
    ctx.fillText(`@${arte.arroba}`, M, A - 150);
  }
  espacar(ctx, "3px");
  ctx.fillStyle = colors.muted;
  const endereco = arte.link.toUpperCase();
  // Encolhe até caber: texto de canvas não quebra nem corta sozinho — ele
  // simplesmente vaza pra fora da imagem.
  let corpo = 32;
  do {
    corpo -= 2;
    ctx.font = `400 ${corpo}px ${FONT_STACK}`;
  } while (ctx.measureText(endereco).width > L - M * 2 && corpo > 18);
  ctx.fillText(endereco, M, A - 92);
  espacar(ctx, "0px");

  return canvas;
}

function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem."))),
      // JPEG, não PNG: a arte é uma foto, e em PNG ela sai com quase 3 MB —
      // peso que atrapalha o compartilhamento pelo celular sem ganho nenhum
      // de qualidade visível.
      "image/jpeg",
      0.92
    );
  });
}

/**
 * Gera a arte e entrega pra pessoa: no celular abre o compartilhamento do
 * sistema (onde o Instagram aparece); no computador baixa o arquivo, que é o
 * que dá pra fazer por lá.
 */
export async function compartilharArteDeStory(
  arte: ArteDeStory
): Promise<"compartilhado" | "baixado"> {
  const blob = await paraBlob(await desenhar(arte));
  const arquivo = new File([blob], `${arte.nome}.jpg`, { type: "image/jpeg" });

  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo] });
      return "compartilhado";
    } catch (erro) {
      // Cancelar não é erro, e não deve virar download por tabela.
      if (erro instanceof DOMException && erro.name === "AbortError") return "compartilhado";
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo.name;
  link.click();
  // Revogar na hora cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "baixado";
}
