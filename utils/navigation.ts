import { router } from "expo-router";

/**
 * Volta pra tela anterior quando existe uma. Sem histórico, router.back()
 * não navega pra lugar nenhum — o botão de voltar simplesmente não faz
 * nada, o que parece bug pra quem tocou nele.
 *
 * Chegar numa tela sem nada atrás não é caso raro: é o normal de quem abre
 * o app a partir de um link direto — notificação push, item compartilhado,
 * ou a própria página recarregada no meio da navegação. Nos três casos o
 * histórico do navegador começou vazio bem naquela tela.
 *
 * @param fallback Pra onde ir quando não há como voltar. Cada tela escolhe
 * o que é "o lugar mais parecido com voltar" pra ela — o pai natural do
 * conteúdo, não sempre a home.
 */
export function voltarOuIrPara(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
