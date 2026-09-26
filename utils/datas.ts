/**
 * Datas sem hora ("2026-09-26") — as que o banco guarda como `date`.
 *
 * `new Date("2026-09-26")` é interpretado como meia-noite em UTC. No Brasil
 * (UTC-3) isso vira 21h do dia anterior, e a data registrada hoje aparecia
 * como ontem na tela. Ancorar no meio-dia local resolve o dia inteiro, em
 * qualquer fuso do país, sem depender de biblioteca.
 */
export function dataLocal(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
}

/** "26/09/2026". Data inválida vira "—" em vez de "Invalid Date". */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = dataLocal(iso);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}
