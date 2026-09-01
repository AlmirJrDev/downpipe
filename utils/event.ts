/**
 * Datas de evento. O backend fala ISO com hora; a tela fala português e,
 * na hora de editar, DD/MM/AAAA + HH:MM — que é como a pessoa digita.
 */

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Blocos do "calendário de folhinha" no card. */
export function eventDateLabel(iso: string): { weekday: string; day: string; month: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { weekday: "—", day: "—", month: "" };
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()).padStart(2, "0"),
    month: MONTHS[date.getMonth()],
  };
}

/** Linha completa: "sábado, 14 de março · 14:00". */
export function eventFullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dia = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export function isoToTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

/**
 * Junta DD/MM/AAAA + HH:MM num ISO com offset. Devolve null se qualquer um
 * dos dois estiver inválido — o formulário usa isso pra bloquear o envio em
 * vez de mandar lixo pro backend, que recusaria com 422.
 */
export function inputsToIso(dateInput: string, timeInput: string): string | null {
  const d = dateInput.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const t = timeInput.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) return null;

  const [, dia, mes, ano] = d;
  const [, hora, minuto] = t;
  if (Number(hora) > 23 || Number(minuto) > 59) return null;

  const date = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto)
  );

  // Pega 31/02: o Date reinterpreta e cai em outro dia, então comparar a
  // volta é o que detecta.
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(dia)) return null;

  return date.toISOString();
}
