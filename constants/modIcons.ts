import type { ComponentType } from "react";
import {
  Cog,
  Gauge,
  Wind,
  WindArrowDown,
  Cpu,
  Wrench,
  CircleDot,
  Armchair,
  Disc,
} from "lucide-react-native";

/**
 * Ícone da modificação é um conceito só do app — o backend guarda `icon`
 * como string livre. Esta lista é a fonte única: o formulário oferece estes
 * valores e o card desenha a partir dela, então adicionar um ícone novo
 * exige mexer num lugar só. Qualquer string desconhecida (registrada fora
 * do app, ou de uma versão futura) cai no genérico em vez de quebrar.
 */
export interface ModIconOption {
  value: string;
  label: string;
  Icon: ComponentType<any>;
}

export const MOD_ICONS: ModIconOption[] = [
  { value: "generic", label: "Geral", Icon: Cog },
  { value: "engine", label: "Motor", Icon: Gauge },
  { value: "intake", label: "Admissão", Icon: Wind },
  { value: "ecu", label: "ECU", Icon: Cpu },
  { value: "suspension", label: "Suspensão", Icon: Wrench },
  { value: "brake", label: "Freios", Icon: Disc },
  { value: "wheel", label: "Rodas", Icon: CircleDot },
  { value: "interior", label: "Interior", Icon: Armchair },
  { value: "aero", label: "Aero", Icon: WindArrowDown },
];

export function modIconComponent(value: string | null | undefined): ComponentType<any> {
  return MOD_ICONS.find((option) => option.value === value)?.Icon ?? Cog;
}
