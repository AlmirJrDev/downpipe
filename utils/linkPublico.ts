/**
 * Endereço público de cada coisa compartilhável do app.
 *
 * O link aponta pra /app/..., que o servidor devolve com a prévia daquele
 * conteúdo (foto, nome, descrição) pro WhatsApp e companhia montarem o
 * cartão — ver shared/web/linkPreview.ts no backend. Quem toca abre direto
 * na tela certa; quem não tem conta entra e é levado até ela depois.
 */
import { Platform } from "react-native";

/**
 * Base pública. Na web é a própria origem; no celular vem do .env, que é
 * onde o endereço do servidor já mora.
 */
export function basePublica(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return process.env.EXPO_PUBLIC_API_URL ?? "https://downpipe.onrender.com";
}

export const linkPublico = {
  post: (id: string) => `${basePublica()}/app/post/${id}`,
  evento: (id: string) => `${basePublica()}/app/event/${id}`,
  perfil: (username: string) => `${basePublica()}/app/user/${username}`,
  carro: (id: string) => `${basePublica()}/app/car/${id}`,
};
