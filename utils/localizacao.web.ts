import type { Resposta } from "./localizacao";

/**
 * Localização de quem está usando — versão do navegador.
 *
 * Fala direto com `navigator.geolocation` em vez de passar pelo
 * expo-location. O motivo: a implementação web do expo-location começa por
 * `navigator.permissions.query({ name: 'geolocation' })` e lança
 * UnavailabilityError quando essa API não existe — que é o caso do Safari
 * no iPhone. Ou seja, no PWA em iOS o botão de GPS falhava sempre, e a
 * mensagem na tela dizia "não consegui pegar sua localização", como se
 * fosse falta de sinal.
 *
 * `navigator.geolocation` existe em todo navegador que nos interessa e é
 * ele quem mostra o pedido de permissão do sistema.
 */

export type { Coordenada, Resposta } from "./localizacao";

export async function permissaoJaConcedida(): Promise<boolean> {
  try {
    // Onde a Permissions API não existe (Safari), a resposta honesta é
    // "não sei" — e "não sei" tem de virar false, porque a alternativa
    // seria disparar o pedido de permissão sem a pessoa ter pedido.
    if (!navigator?.permissions?.query) return false;

    const estado = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return estado.state === "granted";
  } catch {
    return false;
  }
}

export async function pedirLocalizacao(): Promise<Resposta> {
  if (!navigator?.geolocation) {
    throw new Error("este navegador não oferece localização");
  }

  return new Promise<Resposta>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (posicao) =>
        resolve({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        }),
      (erro) => {
        // Recusar não é erro: é resposta. Só o resto vira exceção.
        if (erro.code === erro.PERMISSION_DENIED) {
          resolve("negada");
          return;
        }
        reject(new Error(erro.message || "não foi possível obter a posição"));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
