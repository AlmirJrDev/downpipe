import { categoryLabel } from "@/utils/labels";
import type { ModificationCategory } from "@/types";

interface ModParaCompartilhar {
  name: string;
  category: ModificationCategory | null;
  cost: number | null;
}

/**
 * A tela de atualização do projeto já preenchida com a modificação.
 *
 * Registrar a mod e depois digitar tudo de novo pra publicar era o que fazia
 * ninguém publicar: a mod ficava escondida na aba do carro e o feed nunca
 * sabia dela. Com isto falta só a foto.
 */
export function rotaDeCompartilharMod(carId: string, mod: ModParaCompartilhar): string {
  const params = new URLSearchParams({
    carId,
    subtitle: `Nova mod · ${mod.category ? categoryLabel(mod.category) : "Outros"}`,
    // O nome, e não a descrição: a legenda é a linha grande sobre a foto.
    caption: mod.name,
  });
  if (mod.cost) params.set("cost", String(mod.cost));
  return `/add-project-update?${params.toString()}`;
}
