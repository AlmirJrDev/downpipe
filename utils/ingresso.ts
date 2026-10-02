/**
 * O que vai dentro do QR do ingresso: "DP1.<id do rolê>.<código>".
 *
 * O id do rolê vai junto pra portaria distinguir "ingresso de outro rolê"
 * de "ingresso falso" — são conversas diferentes na porta. O "DP1" é a
 * versão do formato: se um dia o QR mudar (assinatura, ingresso pago), a
 * portaria antiga reconhece que não sabe ler em vez de recusar calada.
 *
 * Não há assinatura nesta fase. O código é aleatório e a portaria só aceita
 * o que está na lista que baixou do servidor, então inventar um QR não leva
 * a lugar nenhum.
 */
const PREFIXO = "DP1";

export function montarConteudoDoQr(eventId: string, code: string): string {
  return `${PREFIXO}.${eventId}.${code}`;
}

export type LeituraDoQr =
  | { tipo: "ingresso"; eventId: string; code: string }
  /** Não é QR do Downpipe — um link, um Pix, a nota fiscal da lanchonete. */
  | { tipo: "desconhecido" };

export function lerConteudoDoQr(conteudo: string): LeituraDoQr {
  const partes = conteudo.trim().split(".");
  if (partes.length !== 3 || partes[0] !== PREFIXO) return { tipo: "desconhecido" };
  const [, eventId, code] = partes;
  if (!eventId || !code) return { tipo: "desconhecido" };
  return { tipo: "ingresso", eventId, code: code.toUpperCase() };
}

/** "K7Q2 M9XA" — em blocos, pra quem precisa ditar o código na porta. */
export function codigoLegivel(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}
