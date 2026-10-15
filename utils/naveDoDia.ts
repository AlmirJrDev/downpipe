/**
 * Nave do Dia — o "Loldle" do Downpipe.
 *
 * Todo dia um carro secreto, o mesmo pra todo mundo. Cada palpite mostra,
 * característica por característica, o que bate (verde), o que chega perto
 * (amarelo) e o que não tem nada a ver (vermelho); ano, cilindros e
 * potência ganham seta pra cima ou pra baixo.
 *
 * Os números são de fábrica, da versão nomeada, arredondados: cv varia de
 * fonte pra fonte (SAE, DIN, mercado), e a faixa do amarelo absorve isso.
 * Lista curada à mão: carros que a galera conhece de nome, de vários
 * estilos e épocas, pra dar pra raciocinar pelas pistas.
 */

import { BRASILEIROS, NAVES_EXTRAS } from "./navesExtras";

export type Carroceria = "Hatch" | "Sedã" | "Cupê" | "Perua" | "Conversível" | "SUV" | "Picape" | "Van";
export type Aspiracao = "Aspirado" | "Turbo" | "Biturbo" | "Compressor";
export type Tracao = "Dianteira" | "Traseira" | "Integral";

export interface Nave {
  id: string;
  nome: string;
  marca: string;
  pais: string;
  carroceria: Carroceria;
  aspiracao: Aspiracao;
  tracao: Tracao;
  cilindros: number;
  ano: number;
  cv: number;
}

export const CONTINENTE: Record<string, string> = {
  Japão: "Ásia",
  Alemanha: "Europa",
  Itália: "Europa",
  França: "Europa",
  Inglaterra: "Europa",
  "Coreia do Sul": "Ásia",
  Suécia: "Europa",
  EUA: "América",
  Brasil: "América",
};

// prettier-ignore
const NAVES_BASE: Nave[] = [
  // Japão
  { id: "supra-a80", nome: "Toyota Supra (A80)", marca: "Toyota", pais: "Japão", carroceria: "Cupê", aspiracao: "Biturbo", tracao: "Traseira", cilindros: 6, ano: 1993, cv: 330 },
  { id: "gtr-r34", nome: "Nissan Skyline GT-R (R34)", marca: "Nissan", pais: "Japão", carroceria: "Cupê", aspiracao: "Biturbo", tracao: "Integral", cilindros: 6, ano: 1999, cv: 280 },
  { id: "gtr-r35", nome: "Nissan GT-R (R35)", marca: "Nissan", pais: "Japão", carroceria: "Cupê", aspiracao: "Biturbo", tracao: "Integral", cilindros: 6, ano: 2007, cv: 480 },
  { id: "350z", nome: "Nissan 350Z", marca: "Nissan", pais: "Japão", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 6, ano: 2002, cv: 290 },
  { id: "silvia-s15", nome: "Nissan Silvia (S15)", marca: "Nissan", pais: "Japão", carroceria: "Cupê", aspiracao: "Turbo", tracao: "Traseira", cilindros: 4, ano: 1999, cv: 250 },
  { id: "civic-ek9", nome: "Honda Civic Type R (EK9)", marca: "Honda", pais: "Japão", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1997, cv: 185 },
  { id: "civic-si-fg2", nome: "Honda Civic Si Cupê (FG2)", marca: "Honda", pais: "Japão", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 2006, cv: 200 },
  { id: "s2000", nome: "Honda S2000", marca: "Honda", pais: "Japão", carroceria: "Conversível", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1999, cv: 250 },
  { id: "nsx-na1", nome: "Honda NSX (NA1)", marca: "Honda", pais: "Japão", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 6, ano: 1990, cv: 280 },
  { id: "ae86", nome: "Toyota Corolla AE86", marca: "Toyota", pais: "Japão", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1983, cv: 130 },
  { id: "gr-yaris", nome: "Toyota GR Yaris", marca: "Toyota", pais: "Japão", carroceria: "Hatch", aspiracao: "Turbo", tracao: "Integral", cilindros: 3, ano: 2020, cv: 272 },
  { id: "evo-ix", nome: "Mitsubishi Lancer Evolution IX", marca: "Mitsubishi", pais: "Japão", carroceria: "Sedã", aspiracao: "Turbo", tracao: "Integral", cilindros: 4, ano: 2005, cv: 280 },
  { id: "eclipse-gsx", nome: "Mitsubishi Eclipse GSX (2ª geração)", marca: "Mitsubishi", pais: "Japão", carroceria: "Cupê", aspiracao: "Turbo", tracao: "Integral", cilindros: 4, ano: 1995, cv: 213 },
  { id: "wrx-sti-gd", nome: "Subaru Impreza WRX STI (GD)", marca: "Subaru", pais: "Japão", carroceria: "Sedã", aspiracao: "Turbo", tracao: "Integral", cilindros: 4, ano: 2004, cv: 300 },
  { id: "miata-na", nome: "Mazda MX-5 Miata (NA)", marca: "Mazda", pais: "Japão", carroceria: "Conversível", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1989, cv: 116 },

  // Europa
  { id: "golf-gti-mk2", nome: "VW Golf GTI (MK2)", marca: "Volkswagen", pais: "Alemanha", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1984, cv: 112 },
  { id: "golf-gti-mk7", nome: "VW Golf GTI (MK7)", marca: "Volkswagen", pais: "Alemanha", carroceria: "Hatch", aspiracao: "Turbo", tracao: "Dianteira", cilindros: 4, ano: 2013, cv: 220 },
  { id: "golf-r-mk7", nome: "VW Golf R (MK7)", marca: "Volkswagen", pais: "Alemanha", carroceria: "Hatch", aspiracao: "Turbo", tracao: "Integral", cilindros: 4, ano: 2014, cv: 300 },
  { id: "m3-e30", nome: "BMW M3 (E30)", marca: "BMW", pais: "Alemanha", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1986, cv: 195 },
  { id: "m3-e46", nome: "BMW M3 (E46)", marca: "BMW", pais: "Alemanha", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 6, ano: 2000, cv: 343 },
  { id: "911-turbo-993", nome: "Porsche 911 Turbo (993)", marca: "Porsche", pais: "Alemanha", carroceria: "Cupê", aspiracao: "Biturbo", tracao: "Integral", cilindros: 6, ano: 1995, cv: 408 },
  { id: "rs4-b7", nome: "Audi RS4 Avant (B7)", marca: "Audi", pais: "Alemanha", carroceria: "Perua", aspiracao: "Aspirado", tracao: "Integral", cilindros: 8, ano: 2006, cv: 420 },
  { id: "audi-quattro", nome: "Audi Quattro", marca: "Audi", pais: "Alemanha", carroceria: "Cupê", aspiracao: "Turbo", tracao: "Integral", cilindros: 5, ano: 1980, cv: 200 },
  { id: "190e-evo2", nome: "Mercedes-Benz 190E 2.5-16 Evo II", marca: "Mercedes-Benz", pais: "Alemanha", carroceria: "Sedã", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1990, cv: 235 },
  { id: "f40", nome: "Ferrari F40", marca: "Ferrari", pais: "Itália", carroceria: "Cupê", aspiracao: "Biturbo", tracao: "Traseira", cilindros: 8, ano: 1987, cv: 478 },
  { id: "countach", nome: "Lamborghini Countach LP400", marca: "Lamborghini", pais: "Itália", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 12, ano: 1974, cv: 375 },
  { id: "uno-turbo", nome: "Fiat Uno Turbo i.e.", marca: "Fiat", pais: "Itália", carroceria: "Hatch", aspiracao: "Turbo", tracao: "Dianteira", cilindros: 4, ano: 1994, cv: 118 },
  { id: "tempra-turbo", nome: "Fiat Tempra Turbo", marca: "Fiat", pais: "Itália", carroceria: "Sedã", aspiracao: "Turbo", tracao: "Dianteira", cilindros: 4, ano: 1994, cv: 165 },
  { id: "205-gti", nome: "Peugeot 205 GTI 1.9", marca: "Peugeot", pais: "França", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1986, cv: 130 },
  { id: "clio-v6", nome: "Renault Clio V6", marca: "Renault", pais: "França", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 6, ano: 2001, cv: 230 },
  { id: "mini-cooper-s-r53", nome: "Mini Cooper S (R53)", marca: "Mini", pais: "Inglaterra", carroceria: "Hatch", aspiracao: "Compressor", tracao: "Dianteira", cilindros: 4, ano: 2002, cv: 163 },

  // Feitos no Brasil, de marca de fora
  { id: "gol-gti", nome: "VW Gol GTI", marca: "Volkswagen", pais: "Alemanha", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1988, cv: 120 },
  { id: "fusca-1300", nome: "VW Fusca 1300", marca: "Volkswagen", pais: "Alemanha", carroceria: "Sedã", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1967, cv: 46 },
  { id: "sp2", nome: "VW SP2", marca: "Volkswagen", pais: "Alemanha", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 4, ano: 1972, cv: 75 },
  { id: "opala-ss-250s", nome: "Chevrolet Opala SS 250-S", marca: "Chevrolet", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 6, ano: 1976, cv: 171 },
  { id: "kadett-gsi", nome: "Chevrolet Kadett GSi", marca: "Chevrolet", pais: "EUA", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1989, cv: 121 },
  { id: "maverick-gt", nome: "Ford Maverick GT V8", marca: "Ford", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 1973, cv: 199 },
  { id: "escort-xr3", nome: "Ford Escort XR3", marca: "Ford", pais: "EUA", carroceria: "Hatch", aspiracao: "Aspirado", tracao: "Dianteira", cilindros: 4, ano: 1983, cv: 83 },
  { id: "charger-rt-br", nome: "Dodge Charger R/T (brasileiro)", marca: "Dodge", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 1971, cv: 215 },

  // EUA
  { id: "mustang-1965", nome: "Ford Mustang GT (1965)", marca: "Ford", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 1965, cv: 228 },
  { id: "mustang-gt500-2020", nome: "Ford Mustang Shelby GT500 (2020)", marca: "Ford", pais: "EUA", carroceria: "Cupê", aspiracao: "Compressor", tracao: "Traseira", cilindros: 8, ano: 2020, cv: 770 },
  { id: "camaro-ss-2010", nome: "Chevrolet Camaro SS (5ª geração)", marca: "Chevrolet", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 2010, cv: 432 },
  { id: "corvette-c2", nome: "Chevrolet Corvette Sting Ray (C2)", marca: "Chevrolet", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 1963, cv: 304 },
  { id: "charger-1969", nome: "Dodge Charger R/T (1969)", marca: "Dodge", pais: "EUA", carroceria: "Cupê", aspiracao: "Aspirado", tracao: "Traseira", cilindros: 8, ano: 1969, cv: 380 },
  { id: "challenger-hellcat", nome: "Dodge Challenger SRT Hellcat", marca: "Dodge", pais: "EUA", carroceria: "Cupê", aspiracao: "Compressor", tracao: "Traseira", cilindros: 8, ano: 2015, cv: 717 },
];

export const NAVES: Nave[] = [...NAVES_BASE, ...NAVES_EXTRAS];

// ---------------------------------------------------------------- os modos

/**
 * "geral" é o jogo de sempre; "brasil", só com carro que veio e foi popular
 * aqui. Cada modo tem a sua ordem (semente própria) e o seu carro do dia.
 */
export type Modo = "geral" | "brasil";

interface ConfigDoModo {
  titulo: string;
  /** Endereço no app, sem o /app. */
  caminho: string;
  semente: number;
  /** Carros que já saíram, na ordem: a lista cresceu depois da estreia e o passado não pode mudar. */
  jaJogados: string[];
  lista: Nave[];
}

export const MODOS: Record<Modo, ConfigDoModo> = {
  geral: { titulo: "Nave do Dia", caminho: "/nave-do-dia", semente: 20261013, jaJogados: ["m3-e30"], lista: NAVES },
  brasil: {
    titulo: "Nave do Dia Brasil",
    caminho: "/nave-do-dia-brasil",
    semente: 55011500,
    jaJogados: ["opala-ss-250s"],
    lista: NAVES.filter((n) => BRASILEIROS.has(n.id)),
  },
};

// ------------------------------------------------------------------ o dia

/** Dia em Brasília, "2026-10-13": todo mundo troca de carro à meia-noite daqui. */
export const hojeEmBrasilia = (agora = new Date()) =>
  agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const INICIO = "2026-10-13";

/** Número do desafio: #1 no dia em que o jogo estreou. */
export function numeroDoDia(dia = hojeEmBrasilia()): number {
  const ms = Date.parse(`${dia}T12:00:00Z`) - Date.parse(`${INICIO}T12:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Embaralha a lista sempre do mesmo jeito: a ordem dos carros é fixa e ninguém adivinha pelo alfabeto. */
function ordemFixa({ semente, lista: original, jaJogados }: ConfigDoModo): Nave[] {
  let s = semente;
  const aleatorio = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const lista = [...original];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  // Os que já saíram voltam pros primeiros dias, cada um no seu.
  jaJogados.forEach((id, dia) => {
    const i = lista.findIndex((n) => n.id === id);
    if (i >= 0) [lista[dia], lista[i]] = [lista[i], lista[dia]];
  });
  return lista;
}
const ORDEM: Record<Modo, Nave[]> = { geral: ordemFixa(MODOS.geral), brasil: ordemFixa(MODOS.brasil) };

export function naveDoDia(dia = hojeEmBrasilia(), modo: Modo = "geral"): Nave {
  const n = numeroDoDia(dia) - 1;
  const ordem = ORDEM[modo];
  return ordem[((n % ordem.length) + ordem.length) % ordem.length];
}

// --------------------------------------------------------------- comparar

export type Cor = "verde" | "amarelo" | "vermelho";
export interface Pista {
  chave: "marca" | "pais" | "carroceria" | "aspiracao" | "tracao" | "cilindros" | "ano" | "cv";
  rotulo: string;
  valor: string;
  cor: Cor;
  /** Pra que lado está o carro do dia (só nos números). */
  seta?: "cima" | "baixo";
}

const TURBO = new Set<Aspiracao>(["Turbo", "Biturbo"]);

function numero(chave: Pista["chave"], rotulo: string, chute: number, alvo: number, perto: number, sufixo = ""): Pista {
  const valor = `${chute}${sufixo}`;
  if (chute === alvo) return { chave, rotulo, valor, cor: "verde" };
  return {
    chave,
    rotulo,
    valor,
    cor: Math.abs(chute - alvo) <= perto ? "amarelo" : "vermelho",
    seta: alvo > chute ? "cima" : "baixo",
  };
}

/**
 * O que um palpite revela do carro do dia.
 *
 * Amarelo: país no mesmo continente; turbo e biturbo (os dois são turbo);
 * ano a até 5 anos; potência a até 15%; cilindros a 2 de distância.
 */
export function comparar(chute: Nave, alvo: Nave): Pista[] {
  const igual = (a: string, b: string): Cor => (a === b ? "verde" : "vermelho");
  return [
    { chave: "marca", rotulo: "Marca", valor: chute.marca, cor: igual(chute.marca, alvo.marca) },
    {
      chave: "pais",
      rotulo: "País",
      valor: chute.pais,
      cor: chute.pais === alvo.pais ? "verde" : CONTINENTE[chute.pais] === CONTINENTE[alvo.pais] ? "amarelo" : "vermelho",
    },
    { chave: "carroceria", rotulo: "Carroceria", valor: chute.carroceria, cor: igual(chute.carroceria, alvo.carroceria) },
    {
      chave: "aspiracao",
      rotulo: "Motor",
      valor: chute.aspiracao,
      cor:
        chute.aspiracao === alvo.aspiracao
          ? "verde"
          : TURBO.has(chute.aspiracao) && TURBO.has(alvo.aspiracao)
            ? "amarelo"
            : "vermelho",
    },
    { chave: "tracao", rotulo: "Tração", valor: chute.tracao, cor: igual(chute.tracao, alvo.tracao) },
    numero("cilindros", "Cilindros", chute.cilindros, alvo.cilindros, 2),
    numero("ano", "Ano", chute.ano, alvo.ano, 5),
    numero("cv", "Potência", chute.cv, alvo.cv, Math.round(alvo.cv * 0.15), " cv"),
  ];
}

/** Quadradinhos pra compartilhar: 🟩🟨🟥 por palpite, como os "dle" fazem. */
export function textoDeCompartilhar(palpites: Nave[], alvo: Nave, dia = hojeEmBrasilia(), modo: Modo = "geral"): string {
  const emoji: Record<Cor, string> = { verde: "🟩", amarelo: "🟨", vermelho: "🟥" };
  const linhas = palpites.map((p) => comparar(p, alvo).map((x) => emoji[x.cor]).join(""));
  const resumo = palpites.length === 1 ? "de primeira" : `em ${palpites.length} palpites`;
  return [
    `${MODOS[modo].titulo} #${numeroDoDia(dia)} · acertei ${resumo}`,
    ...linhas.slice(-6),
    `downpipe.com.br/app${MODOS[modo].caminho}`,
  ].join("\n");
}
