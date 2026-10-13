/**
 * Mais Caro ou Mais Barato? — o jogo da tabela FIPE.
 *
 * Dois carros: o da esquerda mostra o preço, o da direita esconde. A pessoa
 * chuta se o escondido vale mais ou menos; acertou, ele vira o da esquerda
 * e entra outro. Vai até errar.
 *
 * Os preços vêm de data/fipe-do-jogo.json, montado pelo backend
 * (npm run jogo:fipe) a partir da API pública da FIPE. O jogo não consulta
 * a FIPE ao vivo: a tabela muda uma vez por mês, e o arquivo também.
 */
import dados from "@/data/fipe-do-jogo.json";

export interface CarroDoJogo {
  id: string;
  nome: string;
  ano: number;
  combustivel: string;
  preco: number;
}

export const CARROS: CarroDoJogo[] = (dados.carros as CarroDoJogo[]).filter((c) => c.preco > 0);

/** "outubro de 2026" — o mês da tabela, como a FIPE escreve. */
export const REFERENCIA = String(dados.referencia ?? "").trim();

export const reais = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Diferença mínima de preço entre os dois carros, conforme a sequência.
 * Começa fácil (35%: um Mobi contra uma Hilux) e aperta até 8% — mais perto
 * que isso vira cara ou coroa, e aí não é mais jogo.
 */
export function diferencaMinima(sequencia: number): number {
  return Math.max(0.08, 0.35 - sequencia * 0.025);
}

const diferenca = (a: number, b: number) => Math.abs(a - b) / Math.min(a, b);

/**
 * O próximo carro a esconder: um que não apareceu agora há pouco e cujo
 * preço não fique perto demais do que está à mostra. Sem candidato com essa
 * folga (lista pequena), afrouxa em vez de travar.
 */
export function proximoCarro(
  atual: CarroDoJogo,
  recentes: string[],
  sequencia: number,
  aleatorio: () => number = Math.random
): CarroDoJogo {
  const livres = CARROS.filter((c) => c.id !== atual.id && !recentes.includes(c.id) && c.preco !== atual.preco);
  for (let folga = diferencaMinima(sequencia); folga >= 0.02; folga -= 0.03) {
    const bons = livres.filter((c) => diferenca(c.preco, atual.preco) >= folga);
    // Na sequência alta, prefere os mais próximos que ainda passam na folga:
    // é o que faz o jogo ficar difícil de verdade.
    if (bons.length) {
      if (sequencia >= 8) {
        bons.sort((a, b) => diferenca(a.preco, atual.preco) - diferenca(b.preco, atual.preco));
        const topo = bons.slice(0, Math.max(3, Math.ceil(bons.length / 4)));
        return topo[Math.floor(aleatorio() * topo.length)];
      }
      return bons[Math.floor(aleatorio() * bons.length)];
    }
  }
  return livres[Math.floor(aleatorio() * livres.length)] ?? CARROS[0];
}

export function primeiroCarro(aleatorio: () => number = Math.random): CarroDoJogo {
  return CARROS[Math.floor(aleatorio() * CARROS.length)];
}

export type Chute = "mais" | "menos";

export function acertou(chute: Chute, mostrado: CarroDoJogo, escondido: CarroDoJogo): boolean {
  return chute === "mais" ? escondido.preco > mostrado.preco : escondido.preco < mostrado.preco;
}

export function textoDeCompartilhar(sequencia: number): string {
  const resumo = sequencia === 0 ? "Errei de cara" : `Acertei ${sequencia} seguido${sequencia === 1 ? "" : "s"}`;
  return [
    "Mais Caro ou Mais Barato? 💰",
    `${resumo} na tabela FIPE.`,
    "Duvido fazer mais: downpipe.com.br/app/mais-caro",
  ].join("\n");
}
