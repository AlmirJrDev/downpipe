/**
 * Visitante: quem abriu um link compartilhado sem ter conta.
 *
 * Antes, qualquer endereço do app mandava essa pessoa pro login antes de
 * mostrar qualquer coisa — a prévia bonita chegava no WhatsApp, ela tocava e
 * a primeira coisa que via era um formulário de cadastro. Para um app que
 * ninguém conhece ainda, isso encerra a conversa.
 *
 * Agora ela vê o conteúdo, e o login só aparece quando ela quer *fazer*
 * alguma coisa: curtir, comentar, confirmar presença, seguir.
 */
import { router } from "expo-router";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/authStore";

/**
 * As telas que um link leva — e só elas.
 *
 * O resto do app (feed, garagem, notificações, criar coisas) continua
 * exigindo conta: sem uma, não há o que mostrar lá.
 */
const TELAS_DE_CONTEUDO = ["post", "car", "event", "user", "user-posts", "event-posts"];

/**
 * Formulário que abre sem conta: a conta é pedida só no fim, na hora de
 * publicar (ver components/CadastroParaPublicar). Quem veio da agenda
 * divulgar o próprio rolê preenche primeiro e se cadastra depois.
 */
const FORMULARIOS_ABERTOS = ["add-event"];

export function ehTelaPublica(primeiroSegmento: string | undefined): boolean {
  return (
    !!primeiroSegmento &&
    (TELAS_DE_CONTEUDO.includes(primeiroSegmento) || FORMULARIOS_ABERTOS.includes(primeiroSegmento))
  );
}

/**
 * Tela de ver conteúdo, onde a barra de "crie sua conta" faz sentido. No
 * formulário aberto ela cobriria o botão de publicar — e lá a conta já é
 * pedida no momento certo.
 */
export function ehTelaDeConteudo(primeiroSegmento: string | undefined): boolean {
  return !!primeiroSegmento && TELAS_DE_CONTEUDO.includes(primeiroSegmento);
}

/**
 * Segura as boas-vindas de conta nova enquanto um rolê está sendo publicado.
 *
 * Conta recém-criada tem @ provisório, e o app manda a pessoa escolher o @
 * assim que ela entra. Com o cadastro acontecendo no meio da publicação,
 * isso arrancaria a pessoa do formulário antes de o rolê ser salvo. Quem
 * segura é o próprio formulário, enquanto está aberto; depois de publicar
 * ele solta, e aí sim a pessoa escolhe o @ — e volta pro rolê dela.
 */
let segurandoBoasVindas = false;

export function segurarBoasVindas(segurar: boolean) {
  segurandoBoasVindas = segurar;
}

export function boasVindasSeguradas(): boolean {
  return segurandoBoasVindas;
}

/**
 * Pra onde voltar depois de entrar.
 *
 * Mora fora do componente porque o login não recarrega a página: o valor
 * atravessa a navegação inteira, do toque no botão até o fim do onboarding.
 */
let destino: string | null = null;

export function guardarDestino(caminho: string | null) {
  destino = caminho;
}

/** Tem para onde voltar? Espia sem consumir. */
export function temDestino(): boolean {
  return destino !== null;
}

/** Consome o destino: usado uma vez, pra nunca puxar a pessoa de volta depois. */
export function pegarDestino(): string | null {
  const guardado = destino;
  destino = null;
  return guardado;
}

/** O endereço aberto agora, sem o /app do começo. Só existe na web. */
export function caminhoAberto(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const semBase = window.location.pathname.replace(/^\/app(?=\/|$)/, "") || "/";
  return semBase + window.location.search;
}

export function estaDeslogado(): boolean {
  return useAuthStore.getState().status === "signedOut";
}

/**
 * Manda pro login guardando de onde a pessoa saiu.
 *
 * Devolve true quando interceptou — quem chama usa isso pra desistir da ação
 * ("se pediu login, não tenta curtir").
 */
export function pedirParaEntrar(): boolean {
  if (!estaDeslogado()) return false;
  guardarDestino(caminhoAberto());
  router.push("/login");
  return true;
}

/** Versão pra usar dentro de componente, quando o render precisa saber. */
export function useEhVisitante(): boolean {
  return useAuthStore((s) => s.status === "signedOut");
}
