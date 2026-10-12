/**
 * Modo demonstração: o app inteiro com dados inventados.
 *
 * Existe pra fazer material de divulgação e design sem expor ninguém de
 * verdade — nem nome, nem carro, nem foto de quem usa o app. Liga abrindo
 * qualquer tela com ?demo=1 e desliga com ?demo=0 (ou saindo da conta).
 *
 * Com ele ligado, nenhuma chamada sai pro servidor: o apiService responde
 * com os dados de services/demo/dados.ts, e o que a pessoa "cria" ali não
 * é gravado em lugar nenhum.
 */
import { Platform } from "react-native";

const CHAVE = "downpipe_demo";

function lerDoNavegador(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    const parametro = new URLSearchParams(window.location.search).get("demo");
    if (parametro === "1") window.localStorage.setItem(CHAVE, "1");
    if (parametro === "0") window.localStorage.removeItem(CHAVE);
    return window.localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

/** Lido uma vez, na abertura: trocar de modo no meio misturaria os dados. */
const ligado = lerDoNavegador();

export function emModoDemo(): boolean {
  return ligado;
}

export function sairDoModoDemo() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // sem localStorage não há o que limpar
  }
}
