import * as Location from "expo-location";

/**
 * Localização de quem está usando — versão do celular (app nativo).
 *
 * Existe um par .web.ts porque o expo-location, no navegador, exige
 * `navigator.permissions.query({ name: 'geolocation' })` e lança quando ela
 * não existe. O Safari do iPhone é exatamente esse caso: lá o botão de GPS
 * não tinha como funcionar, e o erro chegava na tela como "não consegui
 * pegar sua localização" — que parece falha de sinal, não de suporte.
 *
 * Os dois lados devolvem a mesma coisa: a coordenada, ou "negada" quando a
 * pessoa recusa. Recusa não é exceção — é uma resposta legítima, e quem
 * chama trata diferente de um erro de verdade.
 */

export type Coordenada = { latitude: number; longitude: number };
export type Resposta = Coordenada | "negada";

/**
 * Já autorizou antes? Não abre pedido — serve pra decidir se dá pra
 * centralizar o mapa sem incomodar ninguém.
 */
export async function permissaoJaConcedida(): Promise<boolean> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/** Pede a permissão (se ainda não houver) e devolve a posição. */
export async function pedirLocalizacao(): Promise<Resposta> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return "negada";

  const posicao = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: posicao.coords.latitude,
    longitude: posicao.coords.longitude,
  };
}
