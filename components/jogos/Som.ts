/**
 * Os sons dos jogos, sintetizados na hora (Web Audio): nada de arquivo pra
 * baixar. Só no navegador; no app nativo ficam mudos.
 *
 * Começa ligado e o botão de mudo vale pra sempre naquele aparelho. O
 * navegador só deixa tocar depois de um toque da pessoa, e todo som aqui
 * nasce de um (rolar, ir pro racha, acelerar).
 */
import { Platform } from "react-native";

const CHAVE = "jogos:som";
let contexto: AudioContext | null = null;

export function somLigado(): boolean {
  try {
    return Platform.OS === "web" && localStorage.getItem(CHAVE) !== "desligado";
  } catch {
    return Platform.OS === "web";
  }
}

export function ligarSom(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? "ligado" : "desligado");
  } catch {
    // sem storage: vale só agora
  }
}

function ctx(): AudioContext | null {
  if (Platform.OS !== "web" || !somLigado() || typeof window === "undefined") return null;
  const Classe = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Classe) return null;
  contexto ??= new Classe();
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

/** Bip da árvore de largada: âmbar grave, verde agudo. */
export function bip(agudo = false) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const volume = c.createGain();
  osc.type = "square";
  osc.frequency.value = agudo ? 1046 : 523;
  volume.gain.setValueAtTime(0.06, c.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (agudo ? 0.35 : 0.15));
  osc.connect(volume).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.4);
}

/**
 * O ronco do motor subindo de giro: serrilhado filtrado, com a rotação
 * subindo e caindo a cada troca de marcha. `segundos` é a duração da
 * corrida na tela.
 */
export function ronco(segundos: number, marchas = 4) {
  const c = ctx();
  if (!c) return;
  const agora = c.currentTime;
  const osc = c.createOscillator();
  const sub = c.createOscillator();
  const filtro = c.createBiquadFilter();
  const volume = c.createGain();
  osc.type = "sawtooth";
  sub.type = "square";
  filtro.type = "lowpass";
  filtro.frequency.value = 900;
  const porMarcha = segundos / marchas;
  for (let m = 0; m < marchas; m++) {
    const t0 = agora + m * porMarcha;
    osc.frequency.setValueAtTime(70 + m * 8, t0);
    osc.frequency.exponentialRampToValueAtTime(190 + m * 12, t0 + porMarcha * 0.95);
    sub.frequency.setValueAtTime(35 + m * 4, t0);
    sub.frequency.exponentialRampToValueAtTime(95 + m * 6, t0 + porMarcha * 0.95);
  }
  volume.gain.setValueAtTime(0.0001, agora);
  volume.gain.exponentialRampToValueAtTime(0.09, agora + 0.08);
  volume.gain.setValueAtTime(0.09, agora + segundos - 0.25);
  volume.gain.exponentialRampToValueAtTime(0.0001, agora + segundos + 0.3);
  osc.connect(filtro);
  sub.connect(filtro);
  filtro.connect(volume).connect(c.destination);
  osc.start(agora);
  sub.start(agora);
  osc.stop(agora + segundos + 0.4);
  sub.stop(agora + segundos + 0.4);
}
