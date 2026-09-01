/**
 * Rótulo de exibição das categorias.
 *
 * "Other" é valor do enum do backend (carCategoryEnum e
 * modificationCategoryEnum) — precisa continuar sendo enviado assim nas
 * requisições. Só o que o usuário lê é traduzido; renomear o valor quebraria
 * a validação da API.
 *
 * As demais categorias (JDM, Euro, Muscle, Stance...) ficam em inglês de
 * propósito: são jargão que o público usa, conforme o handoff.
 */
export function categoryLabel(value: string): string {
  return value === "Other" ? "Outros" : value;
}
