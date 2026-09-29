/**
 * Rascunho do rolê de quem ainda não tem conta.
 *
 * O visitante preenche o formulário inteiro antes de se cadastrar. Se ele
 * fechar a aba pra procurar o e-mail, ou o celular recarregar a página, não
 * pode perder o que digitou — é o tipo de coisa que faz a pessoa desistir de
 * vez.
 *
 * Fica no navegador (localStorage), só o texto. A foto não entra: arquivo
 * escolhido não sobrevive a um recarregamento, e guardar a imagem inteira
 * aqui estouraria o espaço. Some depois que o rolê é publicado.
 *
 * Todo acesso é protegido: aba anônima e navegador com dados bloqueados
 * jogam erro no localStorage, e rascunho é conveniência, nunca motivo de
 * a tela quebrar.
 */
import { Platform } from "react-native";

const CHAVE = "downpipe:rascunho-role:v1";

export interface RascunhoDoRole {
  name: string;
  dateInput: string;
  timeInput: string;
  location: string;
  city: string;
  description: string;
  endTimeInput: string;
  endEstimated: boolean;
  entryNote: string;
  attractions: string[];
  rules: string[];
  kind: string | null;
  carCategories: string[];
}

function armazenamento(): Storage | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function lerRascunho(): RascunhoDoRole | null {
  try {
    const bruto = armazenamento()?.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as RascunhoDoRole;
    return typeof dados?.name === "string" ? dados : null;
  } catch {
    return null;
  }
}

export function guardarRascunho(rascunho: RascunhoDoRole) {
  try {
    // Formulário ainda em branco não é rascunho: guardar isso só faria a
    // próxima visita abrir com campos "restaurados" vazios.
    const temAlgo = rascunho.name.trim() || rascunho.location.trim() || rascunho.dateInput.trim();
    const s = armazenamento();
    if (!s) return;
    if (temAlgo) s.setItem(CHAVE, JSON.stringify(rascunho));
    else s.removeItem(CHAVE);
  } catch {
    // Sem espaço ou sem permissão: segue sem rascunho.
  }
}

export function apagarRascunho() {
  try {
    armazenamento()?.removeItem(CHAVE);
  } catch {
    // Idem.
  }
}
