/**
 * Abre a política de privacidade e os termos.
 *
 * As duas páginas são HTML servido pelo mesmo backend, e não telas do app:
 * assim o mesmo endereço serve pro app, pro site e pro cadastro nas lojas,
 * que exigem uma URL pública da política. Manter uma cópia dentro do app
 * daria duas versões pra desencontrar.
 */
import { Linking, Platform } from "react-native";

/**
 * Base pública. Na web é a própria origem; no celular vem do .env, que é
 * onde o endereço do servidor já mora.
 */
function base(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return process.env.EXPO_PUBLIC_API_URL ?? "https://downpipe.onrender.com";
}

export function abrirLegal(pagina: "privacidade" | "termos") {
  const url = `${base()}/${pagina}`;
  // openURL rejeita quando não há navegador disponível. Não há o que fazer
  // nesse caso, e derrubar a tela por causa de um link seria pior.
  Linking.openURL(url).catch(() => undefined);
}
