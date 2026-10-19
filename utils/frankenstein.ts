/**
 * Frankenstein — monte uma nave com peça de tudo que é carro e encare uma
 * escada de rachas no 402 m.
 *
 * Cada rolada sorteia um carro "doador" da garagem da Nave do Dia; dele sai
 * uma peça só (motor, câmbio, tração, chassi ou pneus). Com as cinco
 * vagas cheias, a nave corre contra rivais de verdade, do Fusca ao McLaren,
 * e entre uma fase e outra passa pela oficina pra trocar uma peça.
 *
 * O tempo do 402 é física de botequim, não simulador: a fórmula de Hale
 * (tempo ∝ raiz cúbica de peso/potência), com perda na largada quando a
 * tração não dá conta da potência. Calibrada pra carros de série baterem
 * perto do tempo real; o resto é a graça de pôr V12 em Uno.
 */
import { NAVES, hojeEmBrasilia, numeroDoDia, type Aspiracao, type Nave, type Tracao } from "./naveDoDia";

// ------------------------------------------------------------------ pesos

/** Peso em ordem de marcha (kg), da versão nomeada, arredondado. */
// prettier-ignore
const PESOS: Record<string, number> = {
  "supra-a80": 1510, "gtr-r34": 1560, "gtr-r35": 1740, "350z": 1430, "silvia-s15": 1240, "civic-ek9": 1050,
  "civic-si-fg2": 1290, "s2000": 1250, "nsx-na1": 1370, "ae86": 940, "gr-yaris": 1280, "evo-ix": 1400,
  "eclipse-gsx": 1440, "wrx-sti-gd": 1470, "miata-na": 950, "golf-gti-mk2": 920, "golf-gti-mk7": 1350,
  "golf-r-mk7": 1480, "m3-e30": 1200, "m3-e46": 1570, "911-turbo-993": 1500, "rs4-b7": 1710, "audi-quattro": 1290,
  "190e-evo2": 1340, "f40": 1100, "countach": 1200, "uno-turbo": 910, "tempra-turbo": 1250, "205-gti": 880,
  "clio-v6": 1400, "mini-cooper-s-r53": 1140, "gol-gti": 960, "fusca-1300": 790, "sp2": 890,
  "opala-ss-250s": 1180, "kadett-gsi": 1050, "maverick-gt": 1360, "escort-xr3": 920, "charger-rt-br": 1500,
  "mustang-1965": 1300, "mustang-gt500-2020": 1910, "camaro-ss-2010": 1750, "corvette-c2": 1400,
  "charger-1969": 1700, "challenger-hellcat": 2000,
  "m3-e36": 1460, "m3-e92": 1580, "m3-f80": 1540, "m4-g82": 1730, "m5-e39": 1720, "m5-e60": 1830, "m2-f87": 1500,
  "1m-coupe": 1495, "325i-e30": 1180, "z4-e85": 1360, "330i-g20": 1550, "c63-w204": 1730, "sls-amg": 1620,
  "a45-amg": 1480, "300sl": 1300, "r8-v10": 1620, "tt-8n": 1400, "rs3-8v": 1520, "s3-8l": 1400, "rs6-c5": 1840,
  "911-964": 1350, "911-gt3-996": 1350, "911-turbo-930": 1140, "carrera-gt": 1380, "944-turbo": 1280,
  "boxster-986": 1250, "golf-gti-mk1": 810, "golf-r32-mk4": 1480, "golf-gti-mk4": 1250, "golf-gti-mk5": 1340,
  "scirocco-r": 1350, "jetta-gli-mk7": 1450, "polo-gts": 1200, "up-tsi": 960, "karmann-ghia": 800,
  "amarok-v6": 2080, "t-cross": 1230, "nivus": 1210, "brasilia": 890, "kombi-14": 1240, "santana-18": 1070,
  "gol-g4": 900, "fox-16": 1000, "voyage-16": 1000, "saveiro-16": 1030, "chevette": 860, "monza-20": 1080,
  "omega-cd-41": 1480, "vectra-gsi": 1260, "corsa-wind": 820, "astra-20": 1150, "celta": 860, "agile": 1100,
  "cruze-ltz": 1400, "onix-turbo": 1050, "tracker-turbo": 1200, "s10-28": 2030, "camaro-z28-1969": 1500,
  "corvette-z06-c6": 1420, "corvette-c8": 1530, "ford-gt-2005": 1520, "focus-rs-mk3": 1550,
  "fiesta-st-mk7": 1160, "sierra-cosworth": 1220, "escort-cosworth": 1280, "f150-raptor": 2650,
  "mustang-boss-302": 1500, "ka-3cil": 1000, "ecosport-16": 1200, "viper-gts": 1560, "dart-br": 1500,
  "jeep-wrangler-jl": 2000, "jeep-compass-diesel": 1640, "jeep-renegade-18": 1390, "willys-cj5": 1100,
  "fiat-147": 790, "uno-mille": 760, "palio-10": 890, "stilo-abarth": 1350, "marea-turbo": 1350,
  "fiat-coupe-turbo": 1310, "mobi": 920, "argo-10": 1060, "pulse-abarth": 1250, "strada-13": 1110,
  "toro-diesel": 1770, "delta-integrale": 1340, "alfa-4c": 1000, "testarossa": 1510, "ferrari-458": 1480,
  "ferrari-enzo": 1365, "diablo": 1580, "huracan": 1520, "miura": 1180, "supra-a90": 1540,
  "celica-gt4-st205": 1400, "mr2-sw20": 1260, "gt86": 1240, "hilux-srx-2016": 2120, "corolla-18-2003": 1200,
  "corolla-xei-2020": 1370, "etios-15": 990, "lexus-lfa": 1480, "mx5-nd": 1050, "mazdaspeed3": 1440,
  "gtr-r32": 1430, "gtr-r33": 1530, "370z": 1490, "kicks-16": 1140, "civic-type-r-fk8": 1380,
  "integra-dc2": 1100, "crx-sir": 890, "civic-lxs-2007": 1240, "civic-touring-2017": 1330, "fit-14": 1050,
  "hrv-18": 1290, "evo-vi": 1360, "3000gt-vr4": 1740, "l200-triton": 1990, "pajero-tr4": 1290,
  "impreza-22b": 1270, "swift-sport-zc33s": 970, "veloster-n": 1400, "hb20-10": 960, "creta-20": 1310,
  "tucson-20": 1550, "stinger-gt": 1830, "r5-turbo": 970, "megane-rs-3": 1390, "kwid": 760, "sandero-16": 1050,
  "duster-16": 1220, "peugeot-206-14": 1000, "peugeot-208-16": 1080, "c3-14": 1050, "mclaren-f1": 1140,
  "mclaren-720s": 1420, "elise-s1": 730, "db5": 1500, "e-type": 1230, "volvo-850-t5r": 1500,
  "troller-t4": 1950, "gurgel-br800": 650, "puma-gte": 720, "corcel-ii": 960, "del-rey": 1050,
  "fiesta-supercharger": 1000, "ranger-32": 2150, "passat-ts": 900, "parati-18": 1000, "gol-1000": 850,
  "siena-10": 990, "palio-weekend-16": 1120, "prisma-14": 1050, "montana-14": 1100, "vectra-22": 1300,
  "clio-10": 960, "logan-16": 1080, "sw4-28": 2150, "march-10": 930,
};

/** Os carros que entram no jogo: os da Nave do Dia que têm peso conhecido. */
export const DOADORES: Nave[] = NAVES.filter((n) => PESOS[n.id] != null);

// ------------------------------------------------------------------ peças

export type Parte = "motor" | "cambio" | "tracao" | "chassi" | "pneus";
export const PARTES: Parte[] = ["motor", "cambio", "tracao", "chassi", "pneus"];
export const NOME_DA_PARTE: Record<Parte, string> = {
  motor: "Motor",
  cambio: "Câmbio",
  tracao: "Tração",
  chassi: "Chassi",
  pneus: "Pneus",
};

export interface Cambio {
  rotulo: string;
  /** Quanto da potência chega na roda (0–1). */
  eficiencia: number;
}

/**
 * O câmbio do doador, pela época e pela potência: a ficha não tem o câmbio,
 * e chutar por era acerta a maioria (4 marchas nos 60, 5 nos 80, 6 e dupla
 * embreagem nos esportivos de agora).
 */
export function cambioDe(n: Nave): Cambio {
  if (n.ano < 1975) return { rotulo: "4 marchas", eficiencia: 0.88 };
  if (n.ano < 1992) return { rotulo: "5 marchas", eficiencia: 0.91 };
  if (n.ano < 2008) return n.cv >= 300 ? { rotulo: "6 marchas", eficiencia: 0.94 } : { rotulo: "5 marchas", eficiencia: 0.92 };
  if (n.cv >= 300) return { rotulo: "Dupla embreagem", eficiencia: 0.97 };
  if (n.cv >= 150) return { rotulo: "6 marchas", eficiencia: 0.95 };
  return { rotulo: "5 marchas", eficiencia: 0.93 };
}

/** Aderência dos pneus (0,85 a ~1,13): borracha melhorou com o tempo e esportivo sai de fábrica com pneu largo. */
export function aderenciaDe(n: Nave): number {
  const era = Math.min(1, Math.max(0, (n.ano - 1950) / 70)) * 0.18;
  const largura = n.cv >= 500 ? 0.1 : n.cv >= 300 ? 0.07 : n.cv >= 180 ? 0.04 : 0;
  return Math.round((0.85 + era + largura) * 100) / 100;
}

export const pesoDe = (n: Nave) => PESOS[n.id] ?? 1300;

/** O que cada vaga recebe do doador, em texto curto pro cartão. */
export function descreverPeca(parte: Parte, n: Nave): string {
  switch (parte) {
    case "motor":
      return `${n.cv} cv · ${n.cilindros} cil. ${n.aspiracao === "Aspirado" ? "aspirado" : n.aspiracao.toLowerCase()}`;
    case "cambio":
      return cambioDe(n).rotulo;
    case "tracao":
      return n.tracao;
    case "chassi":
      return `${pesoDe(n)} kg · ${n.carroceria}`;
    case "pneus":
      return `Aderência ${Math.round(aderenciaDe(n) * 100)}`;
  }
}

// ----------------------------------------------------------------- a nave

export type Montagem = Partial<Record<Parte, Nave>>;

export interface Ficha {
  cv: number;
  peso: number;
  tracao: Tracao;
  aspiracao: Aspiracao;
  cambio: Cambio;
  aderencia: number;
}

/** Junta as peças. O motor muda o peso: V12 pesa mais que 4 cilindros, e tração integral traz eixo e diferencial a mais. */
export function fichaDa(m: Required<Montagem>): Ficha {
  const chassi = m.chassi;
  let peso = pesoDe(chassi) + (m.motor.cilindros - chassi.cilindros) * 20;
  if (m.tracao.tracao === "Integral" && chassi.tracao !== "Integral") peso += 60;
  if (m.tracao.tracao !== "Integral" && chassi.tracao === "Integral") peso -= 60;
  return {
    cv: m.motor.cv,
    peso: Math.max(500, peso),
    tracao: m.tracao.tracao,
    aspiracao: m.motor.aspiracao,
    cambio: cambioDe(m.cambio),
    aderencia: aderenciaDe(m.pneus),
  };
}

/** Quantos cv por tonelada cada tração põe no chão na largada, com pneu de aderência 1. */
const CAPACIDADE: Record<Tracao, number> = { Dianteira: 150, Traseira: 230, Integral: 380 };
const PILOTO_KG = 75;

/** Tempo no 402 m (s), sem o tempo de reação. */
export function tempoNo402(f: Ficha): number {
  const libras = (f.peso + PILOTO_KG) * 2.2046;
  const hp = f.cv * 0.986 * f.cambio.eficiencia;
  let t = 5.825 * Math.cbrt(libras / hp);

  // Potência que a tração não segura vira fumaça na largada.
  const cvPorTonelada = f.cv / (f.peso / 1000);
  const capacidade = CAPACIDADE[f.tracao] * f.aderencia;
  if (cvPorTonelada > capacidade) t += 1.6 * (1 - capacidade / cvPorTonelada);
  if (f.tracao === "Integral") t -= 0.1;
  if (f.aspiracao === "Turbo") t += 0.1;
  if (f.aspiracao === "Biturbo") t += 0.05;
  return Math.max(6.5, Math.round(t * 1000) / 1000);
}

/** O carro de série como ficha: é assim que os rivais correm. */
export function fichaDeSerie(n: Nave): Ficha {
  return fichaDa({ motor: n, cambio: n, tracao: n, chassi: n, pneus: n });
}

// ------------------------------------------------------------------- fases

/**
 * A escada de rachas, do mais lento ao chefão. Cada rival larga mais
 * afiado que o anterior: o tempo de reação dele cai fase a fase.
 */
const ESCADA = [
  "fusca-1300", "uno-mille", "chevette", "gol-gti", "civic-si-fg2", "golf-gti-mk7",
  "m3-e46", "supra-a80", "gtr-r35", "challenger-hellcat", "mclaren-720s",
];

export interface Rival {
  nave: Nave;
  tempo: number;
  reacao: number;
}

export const RIVAIS: Rival[] = ESCADA.map((id) => DOADORES.find((n) => n.id === id))
  .filter((n): n is Nave => !!n)
  .map((nave) => ({ nave, tempo: tempoNo402(fichaDeSerie(nave)), reacao: 0 }))
  .sort((a, b) => b.tempo - a.tempo)
  .map((r, i, todos) => ({ ...r, reacao: Math.round((0.45 - (0.27 * i) / (todos.length - 1)) * 1000) / 1000 }));

// ----------------------------------------------------------------- sorteio

function gerador(semente: number) {
  let s = semente | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A fila de doadores da partida. No desafio do dia a semente é o número do
 * dia: todo mundo recebe os mesmos carros, na mesma ordem, e a diferença
 * fica nas escolhas e no pé na largada.
 */
export function filaDeDoadores(semente: number): Nave[] {
  const aleatorio = gerador(semente);
  const lista = [...DOADORES];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

export const sementeDoDia = (dia = hojeEmBrasilia()) => 7_000_000 + numeroDoDia(dia);

/** Quantas vezes dá pra trocar o doador enquanto monta. */
export const TROCAS = 3;

// -------------------------------------------------------------- compartilhar

export const formatarTempo = (s: number) => s.toFixed(3).replace(".", ",");

export function textoDeCompartilhar(opcoes: {
  numero: number | null;
  vitorias: number;
  derrotaFinal: boolean;
  melhorTempo: number | null;
  montagem: Required<Montagem>;
  /** Desafio de um dia passado: sai marcado, pra não parecer o de hoje. */
  depois?: boolean;
}): string {
  const { numero, vitorias, derrotaFinal, melhorTempo, montagem, depois } = opcoes;
  const total = RIVAIS.length;
  const campeao = vitorias >= total;
  const linha = "🟩".repeat(vitorias) + (derrotaFinal && !campeao ? "🟥" : "");
  const cabeca = numero ? `Frankenstein #${numero}${depois ? " (jogado depois)" : ""}` : "Frankenstein";
  const placar = campeao ? `zerei as ${total} fases!` : `passei ${vitorias} de ${total} fases`;
  const curto = (n: Nave) => n.nome.replace(/^(VW|Chevrolet|Ford|Fiat|Toyota|Honda|Nissan) /, "");
  return [
    `${cabeca} · ${placar}`,
    linha,
    `${nomeDaNave(montagem)}: motor do ${curto(montagem.motor)} no chassi do ${curto(montagem.chassi)}`,
    melhorTempo ? `402 m em ${formatarTempo(melhorTempo)} s` : "",
    "downpipe.com.br/app/frankenstein",
  ]
    .filter(Boolean)
    .join("\n");
}

// ------------------------------------------------------------- a criatura

/** O modelo sem a marca e sem a geração: "VW Golf GTI (MK7)" → "Golf". */
function modeloCurto(n: Nave): string {
  const sem = n.nome
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(new RegExp(`^(VW|${n.marca.replace(/-/g, "\\-")})\\s+`, "i"), "")
    .trim();
  return sem.split(/\s+/)[0] || n.marca;
}

/**
 * O nome da criatura: chassi + motor, com o sobrenome da tração e da
 * aspiração. "Uno-Opala Turbo 4x4" diz o que é melhor que a ficha.
 */
export function nomeDaNave(m: Required<Montagem>): string {
  const corpo = modeloCurto(m.chassi);
  const motor = modeloCurto(m.motor);
  const base = m.chassi.id === m.motor.id || corpo === motor ? corpo : `${corpo}-${motor}`;
  const asp = m.motor.aspiracao === "Aspirado" ? "" : m.motor.aspiracao === "Compressor" ? " Supercharger" : ` ${m.motor.aspiracao}`;
  const tracao = m.tracao.tracao === "Integral" ? " 4x4" : "";
  return `${base}${asp}${tracao}`;
}

// --------------------------------------------------------- treino: palpite

/**
 * Peças de referência pra estimar uma nave ainda incompleta: um carro de
 * rua comum. No treino, cada peça oferecida mostra o tempo da nave com ela
 * e as vagas abertas preenchidas com estas.
 */
const REFERENCIA = "voyage-16";

export function tempoComPeca(montagem: Montagem, parte: Parte, doador: Nave): number {
  const base = DOADORES.find((n) => n.id === REFERENCIA) ?? DOADORES[0];
  const m = { motor: base, cambio: base, tracao: base, chassi: base, pneus: base, ...montagem, [parte]: doador };
  return tempoNo402(fichaDa(m as Required<Montagem>));
}

// ------------------------------------------------------- por que perdeu

/**
 * O que faltou, em até três frases: a diferença, a largada (se foi ela) e
 * a peça que mais pesou. Perder sem saber por quê é o que faz desistir.
 */
export function porQuePerdeu(
  m: Required<Montagem>,
  racha: { reacao: number; tempo: number; rivalReacao: number; rivalTempo: number },
  rivalNome: string
): string[] {
  const f = fichaDa(m);
  const seu = racha.reacao + racha.tempo;
  const dele = racha.rivalReacao + racha.rivalTempo;
  const alvo = dele - racha.reacao; // o 402 que você precisava
  const frases = [`Faltaram ${formatarTempo(seu - dele)} s pro ${rivalNome}.`];

  if (racha.reacao > racha.rivalReacao + 0.05) {
    frases.push(
      `Na largada você reagiu em ${formatarTempo(racha.reacao)} s e ele em ${formatarTempo(racha.rivalReacao)} s: ${formatarTempo(
        racha.reacao - racha.rivalReacao
      )} s perdidos antes de andar.`
    );
  }

  const opcoes: { frase: string; tempo: number }[] = [];
  const cvPorTon = f.cv / (f.peso / 1000);
  if (cvPorTon > CAPACIDADE[f.tracao] * f.aderencia) {
    if (f.tracao !== "Integral") {
      const t = tempoNo402({ ...f, tracao: "Integral", peso: f.peso + 60 });
      opcoes.push({ frase: `A tração ${f.tracao.toLowerCase()} patinou com tanta potência: com tração integral a nave faria ${formatarTempo(t)} s.`, tempo: t });
    }
    const t = tempoNo402({ ...f, aderencia: 1.13 });
    if (f.aderencia < 1.1) opcoes.push({ frase: `Os pneus não seguraram: com pneu de esportivo moderno ela faria ${formatarTempo(t)} s.`, tempo: t });
  }
  const leve = tempoNo402({ ...f, peso: Math.max(500, f.peso - 250) });
  opcoes.push({ frase: `Com um chassi 250 kg mais leve ela faria ${formatarTempo(leve)} s.`, tempo: leve });

  // Quanto de motor precisava, com o resto igual.
  let cv = f.cv;
  while (cv < 2000 && tempoNo402({ ...f, cv }) > alvo) cv += 10;
  if (cv < 2000 && cv > f.cv) opcoes.push({ frase: `Com esse peso, precisava de uns ${cv} cv (tem ${f.cv}).`, tempo: alvo });

  // A sugestão que mais aproxima da vitória.
  const melhor = opcoes.sort((a, b) => a.tempo - b.tempo)[0];
  if (melhor) frases.push(melhor.frase);
  return frases;
}
