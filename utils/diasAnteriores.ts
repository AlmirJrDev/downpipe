/**
 * Os dias anteriores dos jogos diários (Nave do Dia e Frankenstein).
 *
 * Quem chega hoje joga os desafios que perdeu. Dia passado não conta pra
 * sequência de dias seguidos (senão ela perde o sentido: dava pra fazer
 * trinta de uma vez) e, ao compartilhar, sai marcado como jogado depois.
 */
import { hojeEmBrasilia, numeroDoDia } from "./naveDoDia";

const DIA_MS = 86_400_000;

/** "2026-10-14" → o dia anterior, no mesmo formato. */
export const diaAntes = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) - DIA_MS).toISOString().slice(0, 10);

/** De ontem até o #1, do mais novo pro mais velho. */
export function diasAnteriores(hoje = hojeEmBrasilia()): string[] {
  const dias: string[] = [];
  for (let d = diaAntes(hoje); numeroDoDia(d) >= 1; d = diaAntes(d)) dias.push(d);
  return dias;
}

/**
 * O dia pedido no endereço (?dia=2026-10-14), se for um dia passado de
 * verdade. Qualquer outra coisa (futuro, hoje, lixo) é o dia de hoje: não
 * dá pra espiar o carro de amanhã mudando a URL.
 */
export function diaPedido(param: string | string[] | undefined, hoje = hojeEmBrasilia()): string {
  const d = Array.isArray(param) ? param[0] : param;
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return hoje;
  return d < hoje && numeroDoDia(d) >= 1 ? d : hoje;
}

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "qua, 14/10" */
export function dataCurta(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  return `${SEMANA[d.getUTCDay()]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}
