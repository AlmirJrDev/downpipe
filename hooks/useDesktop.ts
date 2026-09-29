/**
 * O app no computador, no modelo do Instagram web.
 *
 * O Instagram não redesenha cada tela pro desktop: o feed do instagram.com
 * continua sendo uma coluna de largura de celular. O que muda é a moldura em
 * volta — um menu lateral no lugar da barra de baixo — e algumas telas que
 * pedem mais espaço (o post aberto, o perfil com a grade). Aqui é igual:
 *
 * - quem está logado, numa janela de 1024 px ou mais, ganha o menu lateral
 *   e o conteúdo numa coluna central de 600 px;
 * - a tela que quer mais (ver useLarguraAmpla) abre a coluna até 1120 px;
 * - quem está de visita continua com a moldura de celular de antes — sem
 *   conta não há menu pra mostrar.
 */
import { Platform, useWindowDimensions } from "react-native";
import { create } from "zustand";
import { useAuthStore } from "@/stores/authStore";

export const LARGURA_DE_DESKTOP = 1024;
export const LARGURA_DO_MENU = 244;
export const COLUNA_PADRAO = 600;
export const COLUNA_AMPLA = 1120;
/** A moldura de celular de quem está de visita (ver app/+html.tsx). */
const MOLDURA_DE_VISITA = 460;
const MOLDURA_AMPLA_DE_VISITA = 1180;
/** Abaixo disto a moldura de celular nem existe: é celular de verdade. */
const COMECO_DA_MOLDURA = 860;

/**
 * Se a tela aberta agora pediu largura (quem mexe é o useLarguraAmpla), e se
 * o painel de notificações está aberto ao lado do menu.
 */
export const useLayoutStore = create<{
  larguraAmpla: boolean;
  setLarguraAmpla: (ampla: boolean) => void;
  notificacoesAbertas: boolean;
  setNotificacoesAbertas: (abertas: boolean) => void;
}>((set) => ({
  larguraAmpla: false,
  setLarguraAmpla: (larguraAmpla) => set({ larguraAmpla }),
  notificacoesAbertas: false,
  setNotificacoesAbertas: (notificacoesAbertas) => set({ notificacoesAbertas }),
}));

/** Menu lateral e coluna central: web, janela larga, e alguém logado. */
export function useModoDesktop(): boolean {
  const { width } = useWindowDimensions();
  const logado = useAuthStore((s) => s.status === "signedIn");
  return Platform.OS === "web" && width >= LARGURA_DE_DESKTOP && logado;
}

/**
 * A largura que o conteúdo tem de verdade — o que as grades devem usar no
 * lugar da largura da janela.
 *
 * No computador a janela tem 1440 px, mas o conteúdo mora numa coluna (ou
 * na moldura de visita). Grade que se mede pela janela nasce com miniaturas
 * de 460 px dentro de uma coluna de 600 — e esse erro já existia antes do
 * menu lateral, com a moldura.
 */
export function useLarguraDoConteudo(): number {
  const { width } = useWindowDimensions();
  const logado = useAuthStore((s) => s.status === "signedIn");
  const ampla = useLayoutStore((s) => s.larguraAmpla);

  if (Platform.OS !== "web" || width < COMECO_DA_MOLDURA) return width;

  if (logado && width >= LARGURA_DE_DESKTOP) {
    const disponivel = width - LARGURA_DO_MENU;
    return Math.min(disponivel, ampla ? COLUNA_AMPLA : COLUNA_PADRAO);
  }

  return Math.min(width, ampla && width >= LARGURA_DE_DESKTOP ? MOLDURA_AMPLA_DE_VISITA : MOLDURA_DE_VISITA);
}
