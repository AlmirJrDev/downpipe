/**
 * Tempo relativo curto, no estilo de rede social: "agora", "12min", "3h",
 * "5d", e a data seca a partir de uma semana. Usado nas notificações e nos
 * comentários — o feed tem a própria versão, mais grossa (sem minutos).
 */
export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
