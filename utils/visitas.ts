/**
 * Avisa o servidor de cada tela aberta, pra tela Tráfego (ver
 * modules/visitas no backend).
 *
 * O app é uma página só: o servidor vê o primeiro carregamento e nunca
 * mais. Sem este aviso, "abriu o app" e "foi pro cadastro" seriam
 * invisíveis.
 *
 * Só no site publicado: rodando local o banco é o mesmo, e teste na
 * máquina viraria visita. No modo demonstração também não.
 */
import { Platform } from "react-native";
import { emModoDemo } from "@/services/demo/modoDemo";

let primeira = true;

export function registrarVisita(caminho: string) {
  if (Platform.OS !== "web" || __DEV__ || typeof window === "undefined" || emModoDemo()) return;
  const corpo: Record<string, string> = { caminho: caminho === "/" ? "/app" : `/app${caminho}` };
  // Só o primeiro aviso leva de onde veio: depois disso a pessoa já está
  // andando por dentro.
  if (primeira) {
    if (document.referrer) corpo.ref = document.referrer;
    if (window.location.search) corpo.busca = window.location.search;
    primeira = false;
  }
  fetch("/visitas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
    keepalive: true,
  }).catch(() => undefined);
}
