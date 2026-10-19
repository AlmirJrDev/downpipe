/**
 * O que ajuda a jogar a Nave do Dia sem mexer na regra: achar o carro
 * digitando de qualquer jeito e dar uma dica pra quem empacou.
 */
import type { Nave } from "./naveDoDia";

// ------------------------------------------------------------------ busca

/** "GT-R", "gtr" e "Gê-tê-érre" viram a mesma coisa: minúsculo, sem acento, sem pontuação. */
export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compacto = (s: string) => normalizar(s).replace(/ /g, "");

/** Distância de edição até 1 (uma letra trocada, sobrando ou faltando): o erro de digitação comum. */
function quaseIgual(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let erros = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++erros > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return erros + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Os carros que batem com o que foi digitado, os melhores primeiro.
 *
 * Cada palavra digitada precisa aparecer no nome (ou na marca, ou no ano),
 * em qualquer ordem e sem ligar pra hífen: "civic si" acha o Civic Si,
 * "gtr r34" acha o Skyline GT-R. Sem nada assim, aceita um erro de
 * digitação por palavra ("corola", "chevete").
 */
export function buscarNaves(lista: Nave[], texto: string, jaChutados: string[], limite = 6): Nave[] {
  const termos = normalizar(texto).split(" ").filter(Boolean);
  if (termos.length === 0) return [];

  const candidatos = lista
    .filter((n) => !jaChutados.includes(n.id))
    .map((n) => {
      const palavras = normalizar(`${n.nome} ${n.marca} ${n.ano}`).split(" ");
      const tudoJunto = compacto(`${n.nome} ${n.marca}`);
      return { n, palavras, tudoJunto };
    });

  const pontuar = (palavras: string[], termo: string) =>
    palavras.includes(termo) ? 0 : palavras.some((p) => p.startsWith(termo)) ? 1 : 2;

  const exatos = candidatos
    .filter(({ palavras, tudoJunto }) => termos.every((t) => tudoJunto.includes(t) || palavras.some((p) => p.includes(t))))
    .map((c) => ({ ...c, peso: termos.reduce((s, t) => s + pontuar(c.palavras, t), 0) }))
    .sort((a, b) => a.peso - b.peso || a.n.ano - b.n.ano);
  if (exatos.length > 0) return exatos.slice(0, limite).map((c) => c.n);

  // Nenhum bateu: tolera um erro de digitação em palavras de 4+ letras.
  return candidatos
    .filter(({ palavras }) =>
      termos.every((t) => palavras.some((p) => p.includes(t) || (t.length >= 4 && quaseIgual(p, t))))
    )
    .slice(0, limite)
    .map((c) => c.n);
}

// ------------------------------------------------------------------ dicas

/** Quantos palpites até cada dica aparecer. */
export const DICAS_EM = [6, 9, 12];

/**
 * Dicas que vão abrindo com os palpites: a década, depois a primeira letra
 * do modelo, depois quantas letras ele tem. Nunca a resposta inteira.
 */
export function dicas(alvo: Nave, palpites: number): string[] {
  const modelo = alvo.nome.replace(new RegExp(`^(VW|${alvo.marca})\\s+`, "i"), "");
  const letras = modelo.replace(/\s*\(.*\)\s*/g, "").replace(/[^A-Za-zÀ-ú0-9]/g, "");
  const decada = Math.floor(alvo.ano / 10) * 10;
  const todas = [
    `É dos anos ${decada < 2000 ? String(decada).slice(2) : decada} (${decada} a ${decada + 9}).`,
    `O modelo começa com "${letras[0]?.toUpperCase() ?? "?"}".`,
    `O nome do modelo tem ${letras.length} caracteres, sem contar a marca e a geração.`,
  ];
  return todas.filter((_, i) => palpites >= DICAS_EM[i]);
}
