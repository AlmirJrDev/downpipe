/**
 * Notificação push do PWA — versão do celular (app nativo).
 *
 * Push do jeito Web Push (o que este arquivo trata) não existe fora do
 * navegador: não há Service Worker, PushManager nem Notification API no
 * app nativo do Expo Go. Notificação push nativa é outra infraestrutura
 * inteira (expo-notifications + APNs/FCM) e não faz parte deste recorte —
 * o pedido era o PWA.
 *
 * Existe um webPush.web.ts ao lado, com a implementação de verdade. Os dois
 * nomes precisam ser simétricos (.ts e .web.ts) ou o Metro não troca um
 * pelo outro.
 */

export type StatusPush = "nao-suportado" | "negado" | "inscrito" | "nao-inscrito";

export async function statusPush(): Promise<StatusPush> {
  return "nao-suportado";
}

export async function inscreverPush(): Promise<void> {
  throw new Error("Notificação push não está disponível neste app.");
}

export async function desinscreverPush(): Promise<void> {
  // Nada a desfazer onde nunca houve inscrição.
}

/** Badging API — mesma história: só existe no navegador. */
export async function sincronizarBadge(_contagem: number): Promise<void> {
  // no-op
}
