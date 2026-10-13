/**
 * "Como você vive carro?" — a primeira pergunta do onboarding.
 *
 * Múltipla escolha e obrigatória. O perfil principal (o primeiro marcado,
 * na ordem de PRIORIDADE) decide a tela que vem depois do @; todos os
 * marcados montam o "Comece por aqui" do feed. Fica no perfil do servidor
 * (profiles.vive_carro).
 */
import { Camera, CalendarDays, Car, Heart, type LucideIcon } from "lucide-react-native";

export type ViveCarro = "carro" | "fotografo" | "organizador" | "sem_carro";

export const OPCOES: { id: ViveCarro; titulo: string; descricao: string; Icone: LucideIcon }[] = [
  { id: "carro", titulo: "Tenho carro / projeto", descricao: "Montar a garagem e documentar o build", Icone: Car },
  { id: "fotografo", titulo: "Fotografo carros", descricao: "Postar ensaios e marcar os donos", Icone: Camera },
  {
    id: "organizador",
    titulo: "Organizo encontros e eventos",
    descricao: "Publicar com mapa, regras e lista de quem vai",
    Icone: CalendarDays,
  },
  {
    id: "sem_carro",
    titulo: "Curto, mas sem carro (ainda)",
    descricao: "Acompanhar builds e colar nos encontros",
    Icone: Heart,
  },
];

/** Marcou mais de um? Vale esta ordem pra escolher a próxima tela. */
const PRIORIDADE: ViveCarro[] = ["carro", "organizador", "fotografo", "sem_carro"];

export function perfilPrincipal(lista: readonly string[] | undefined): ViveCarro | null {
  return PRIORIDADE.find((p) => lista?.includes(p)) ?? null;
}

/** A tela depois do @, conforme o perfil principal. Todas são puláveis. */
export function telaDepoisDoArroba(lista: readonly string[] | undefined): string {
  switch (perfilPrincipal(lista)) {
    case "organizador":
      return "/add-event?onboarding=1";
    case "fotografo":
      return "/add-post?onboarding=1";
    case "sem_carro":
      return "/seguir-garagens?onboarding=1";
    case "carro":
    default:
      // Conta de antes da pergunta segue o caminho de sempre.
      return "/add-car?onboarding=1";
  }
}

/** O exemplo da bio muda com o perfil: mostra o tipo de coisa que cabe ali. */
export function exemploDeBio(lista: readonly string[] | undefined): string {
  switch (perfilPrincipal(lista)) {
    case "organizador":
      return "Ex: Organizo o encontro de sábado no posto da Anhanguera";
    case "fotografo":
      return "Ex: Fotógrafo automotivo em Campinas, ensaios e encontros";
    case "sem_carro":
      return "Ex: Ainda sem carro, mas não perco um encontro";
    case "carro":
    default:
      return "Fale sobre você e seus carros...";
  }
}
