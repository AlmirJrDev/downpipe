/**
 * Limpa o que a pessoa digitou (ou colou) no campo de Instagram.
 *
 * O caminho mais comum é colar o link inteiro vindo do botão de compartilhar
 * do próprio Instagram, com "https://", "www" e o "?igsh=..." no fim. O
 * servidor normaliza de novo — aqui é pra ela já ver o @ certo enquanto digita.
 */
export function soOArroba(texto: string): string {
  return texto
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");
}
