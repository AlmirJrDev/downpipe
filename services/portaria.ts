/**
 * A portaria do rolê, do jeito que ela precisa funcionar: sem internet.
 *
 * Encontro de carro acontece em posto de estrada, estacionamento de shopping,
 * autódromo — exatamente onde o sinal some quando chegam 300 celulares. Então
 * a lista de ingressos é baixada antes, fica guardada no aparelho, e cada
 * entrada é decidida aqui mesmo. O servidor só fica sabendo depois, quando
 * a conexão volta.
 *
 * Duas portarias offline podem deixar entrar o mesmo print ao mesmo tempo:
 * cada uma só sabe do que ela mesma leu até sincronizar. O servidor guarda
 * a primeira hora e a lista que volta já mostra "já entrou" nas duas. Pra
 * rolê de um portão só, o caso nem existe.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lerConteudoDoQr } from "@/utils/ingresso";
import type { CheckinEntry, CheckinList } from "@/types";

const VERSAO = "v1";
const chaveDoRole = (eventId: string) => `downpipe:portaria:${eventId}:${VERSAO}`;
const CHAVE_DO_APARELHO = "downpipe:portaria:aparelho";

/** Entrada lida neste celular. `enviada` vira true quando o servidor confirma. */
export interface EntradaLocal {
  at: string;
  enviada: boolean;
}

export interface EstadoDaPortaria {
  eventId: string;
  /** Por código. Vem do servidor; é a lista de quem pode entrar. */
  ingressos: Record<string, CheckinEntry>;
  /** Por código. O que esta portaria liberou. */
  locais: Record<string, EntradaLocal>;
  /** generatedAt da última lista que chegou. null = nunca baixou. */
  baixadaEm: string | null;
}

export function estadoVazio(eventId: string): EstadoDaPortaria {
  return { eventId, ingressos: {}, locais: {}, baixadaEm: null };
}

export async function carregarEstado(eventId: string): Promise<EstadoDaPortaria> {
  try {
    const bruto = await AsyncStorage.getItem(chaveDoRole(eventId));
    if (!bruto) return estadoVazio(eventId);
    const dados = JSON.parse(bruto) as EstadoDaPortaria;
    return dados?.eventId === eventId ? dados : estadoVazio(eventId);
  } catch {
    // Armazenamento corrompido ou bloqueado: começa do zero e baixa de novo.
    // As entradas não enviadas se perderiam — mas isso só acontece se o
    // próprio aparelho falhou, e o servidor ainda tem o que já chegou lá.
    return estadoVazio(eventId);
  }
}

export async function guardarEstado(estado: EstadoDaPortaria): Promise<void> {
  try {
    await AsyncStorage.setItem(chaveDoRole(estado.eventId), JSON.stringify(estado));
  } catch {
    // Sem onde guardar, a portaria segue funcionando na memória.
  }
}

/**
 * Identifica este celular nas entradas enviadas. Não é segredo nem
 * rastreio: serve pro organizador saber por qual portão cada um entrou.
 */
export async function idDoAparelho(): Promise<string> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE_DO_APARELHO);
    if (salvo) return salvo;
    const novo = Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(CHAVE_DO_APARELHO, novo);
    return novo;
  } catch {
    return "desconhecido";
  }
}

/** A lista nova do servidor substitui a antiga; o que é deste celular fica. */
export function aplicarLista(estado: EstadoDaPortaria, lista: CheckinList): EstadoDaPortaria {
  const ingressos: Record<string, CheckinEntry> = {};
  for (const entrada of lista.entries) ingressos[entrada.code] = entrada;
  return { ...estado, ingressos, baixadaEm: lista.generatedAt };
}

export function marcarEnviadas(estado: EstadoDaPortaria, codigos: string[]): EstadoDaPortaria {
  const locais = { ...estado.locais };
  for (const code of codigos) {
    if (locais[code]) locais[code] = { ...locais[code], enviada: true };
  }
  return { ...estado, locais };
}

export function pendentes(estado: EstadoDaPortaria): { code: string; at: string }[] {
  return Object.entries(estado.locais)
    .filter(([, e]) => !e.enviada)
    .map(([code, e]) => ({ code, at: e.at }));
}

/** Hora da entrada, venha ela deste celular ou de outro portão. */
export function horaDaEntrada(estado: EstadoDaPortaria, code: string): string | null {
  return estado.locais[code]?.at ?? estado.ingressos[code]?.checkedInAt ?? null;
}

export function contarPresentes(estado: EstadoDaPortaria): number {
  return Object.keys(estado.ingressos).filter((code) => horaDaEntrada(estado, code)).length;
}

export type ResultadoDaLeitura =
  | { tipo: "liberado"; ingresso: CheckinEntry }
  | {
      tipo: "ja_entrou";
      ingresso: CheckinEntry;
      at: string;
      /** true = foi este celular que liberou; false = outro portão. */
      aqui: boolean;
    }
  /** Ingresso de verdade, mas de outro rolê. */
  | { tipo: "outro_role" }
  /** Formato certo, código fora da lista: falso, presença desmarcada, ou
   * confirmou depois que a lista foi baixada. */
  | { tipo: "nao_encontrado" }
  /** Nem é QR do Downpipe. */
  | { tipo: "invalido" };

/**
 * Decide a entrada. Não muda nada: quem chama registra com `registrarEntrada`
 * quando o resultado é "liberado". Separado assim pra a mesma regra servir
 * à leitura do QR e à busca por nome.
 */
export function avaliarCodigo(estado: EstadoDaPortaria, code: string): ResultadoDaLeitura {
  const ingresso = estado.ingressos[code];
  if (!ingresso) return { tipo: "nao_encontrado" };
  const at = horaDaEntrada(estado, code);
  if (at) return { tipo: "ja_entrou", ingresso, at, aqui: !!estado.locais[code] };
  return { tipo: "liberado", ingresso };
}

export function avaliarQr(estado: EstadoDaPortaria, conteudo: string): ResultadoDaLeitura {
  const leitura = lerConteudoDoQr(conteudo);
  if (leitura.tipo !== "ingresso") return { tipo: "invalido" };
  if (leitura.eventId !== estado.eventId) return { tipo: "outro_role" };
  return avaliarCodigo(estado, leitura.code);
}

export function registrarEntrada(estado: EstadoDaPortaria, code: string): EstadoDaPortaria {
  if (estado.locais[code]) return estado;
  return {
    ...estado,
    locais: { ...estado.locais, [code]: { at: new Date().toISOString(), enviada: false } },
  };
}
