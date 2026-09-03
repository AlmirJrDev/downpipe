import { apiService } from "@/services/apiService";

/**
 * Notificação push do PWA — versão do navegador.
 *
 * Só funciona no PWA instalado, e no iPhone só a partir do iOS 16.4 — a
 * Apple não oferece Web Push pro Safari solto numa aba, só pro app
 * instalado na tela inicial. Não tem contorno: é limitação da plataforma,
 * não deste código.
 */

export type StatusPush = "nao-suportado" | "negado" | "inscrito" | "nao-inscrito";

function suportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * O navegador espera a chave VAPID como Uint8Array, não como a string
 * base64url que o servidor devolve — essa conversão é padrão de toda
 * implementação de Web Push, não uma escolha deste código.
 */
function paraUint8Array(base64url: string): Uint8Array {
  const preenchimento = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

export async function statusPush(): Promise<StatusPush> {
  if (!suportado()) return "nao-suportado";
  if (Notification.permission === "denied") return "negado";

  const registro = await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.getSubscription();
  return inscricao ? "inscrito" : "nao-inscrito";
}

export async function inscreverPush(): Promise<void> {
  if (!suportado()) {
    throw new Error("Este navegador não suporta notificação push.");
  }

  const { publicKey } = await apiService.getVapidPublicKey();
  if (!publicKey) {
    // Só acontece se o servidor não tiver as chaves VAPID configuradas —
    // não é algo que a pessoa usando o app possa resolver.
    throw new Error("O servidor ainda não está pronto para notificações push.");
  }

  const registro = await navigator.serviceWorker.ready;

  // subscribe() já dispara o pedido de permissão do navegador quando
  // necessário; rejeita com um erro se a pessoa recusar.
  const inscricao = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    // O TS do lib.dom mais novo tipa Uint8Array como genérico sobre o
    // buffer (Uint8Array<ArrayBufferLike>), que não bate 1:1 com o
    // BufferSource que subscribe() espera — é atrito de tipos, não um
    // valor realmente incompatível em runtime.
    applicationServerKey: paraUint8Array(publicKey) as BufferSource,
  });

  const dados = inscricao.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!dados.endpoint || !dados.keys?.p256dh || !dados.keys?.auth) {
    throw new Error("A inscrição veio incompleta do navegador.");
  }

  await apiService.subscribePush({
    endpoint: dados.endpoint,
    keys: { p256dh: dados.keys.p256dh, auth: dados.keys.auth },
  });
}

export async function desinscreverPush(): Promise<void> {
  if (!suportado()) return;

  const registro = await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.getSubscription();
  if (!inscricao) return;

  const endpoint = inscricao.endpoint;
  // Local primeiro: mesmo que o servidor esteja fora do ar, a pessoa não
  // deve continuar recebendo notificação que pediu pra desligar.
  await inscricao.unsubscribe();
  await apiService.unsubscribePush(endpoint);
}

/**
 * Badging API — o número no ícone do app. Chamada de dentro da página
 * (app aberto) sempre que a contagem do sino muda; o caso de app FECHADO
 * é coberto à parte, pelo service worker (ver public/sw.js), usando a
 * contagem que o próprio push já traz — sem isso o número só atualizaria
 * na próxima vez que alguém abrisse o app.
 *
 * setAppBadge(0) não é bem definido pela spec (alguns navegadores tratam
 * como "mostrar um badge com zero", outros como "sem badge") — por isso
 * zero vira clearAppBadge() explícito.
 */
export async function sincronizarBadge(contagem: number): Promise<void> {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;

  try {
    if (contagem > 0) {
      await (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
        contagem
      );
    } else {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  } catch {
    // Badging API ainda é instável em alguns navegadores — não é crítico
    // o bastante pra propagar erro pra quem chamou.
  }
}
