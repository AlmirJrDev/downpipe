import type { Car } from "@/types";

/**
 * A FIPE traz o modelo com motor/potência/câmbio grudados no fim
 * ("718 Boxster GTS 2.5 365cv", "Civic Sedan LXR 2.0 Flex 16V Aut.").
 * Corta a partir da cilindrada (primeiro "N.N"), que é onde a parte de
 * especificação começa — o que sobra é o nome que as pessoas realmente usam.
 */
export function shortenModelName(modelName: string): string {
  // \s* e não \s+: a FIPE às vezes cola a cilindrada no texto
  // ("Fox Highline1.6 Flex", "AMAROK CD2.0 16V").
  const match = modelName.match(/^(.*?)\s*\d[.,]\d/);
  const base = (match ? match[1] : modelName).trim();
  // Nome que começa com a cilindrada ("1.8T Sedan") zeraria o resultado —
  // nesse caso vale mais manter o nome inteiro do que devolver vazio.
  return base || modelName.trim();
}

/** Sugestão de nome pra garagem a partir do catálogo: "Porsche 718 Boxster". */
export function suggestCarName(brandName: string, modelName: string): string {
  return `${brandName} ${shortenModelName(modelName)}`.trim();
}

/**
 * Nome do carro na garagem. `version` é o rótulo que o dono escolheu (o
 * backend não tem coluna de apelido, e é exatamente pra isso que esse campo
 * serve), então ele manda; o catálogo é só o fallback pra carro antigo ou
 * criado sem nome.
 */
export function carTitle(car: Car): string {
  const custom = car.version?.trim();
  if (custom) return custom;
  if (car.vehicle) return `${car.vehicle.brand.name} ${car.vehicle.model.name}`;
  return "Carro sem catálogo";
}

/** Nome completo do catálogo FIPE, pra mostrar como informação secundária. */
export function carCatalogName(car: Car): string | undefined {
  if (!car.vehicle) return undefined;
  return `${car.vehicle.brand.name} ${car.vehicle.model.name}`;
}

export function carYear(car: Car): number | undefined {
  return car.vehicle?.year;
}
