// Username placeholder gerado por handle_new_user() no signup: "u" + pelo
// menos 20 caracteres hex (ver migration 0011_fix_handle_new_user_username).
// Ninguém digita isso por acaso — serve pra saber se o usuário ainda não
// passou pelo onboarding (nunca customizou o próprio @).
const PLACEHOLDER_USERNAME = /^u[0-9a-f]{20,}$/i;

export function isPlaceholderUsername(username: string): boolean {
  return PLACEHOLDER_USERNAME.test(username);
}
