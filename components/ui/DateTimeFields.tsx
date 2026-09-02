import React from "react";
import { Text, TextInput, View } from "react-native";
import { colors } from "@/constants/theme";

/**
 * Data e hora do rolê — versão do celular (app nativo).
 *
 * Digita-se só número: a barra e os dois-pontos entram sozinhos. Antes o
 * campo era texto livre com placeholder "DD/MM/AAAA", o que obrigava a
 * pessoa a trocar de teclado pra achar a "/" — ruim em qualquer telefone.
 *
 * Existe um DateTimeFields.web.tsx ao lado, que usa os seletores nativos do
 * navegador. Os dois recebem e devolvem o mesmo formato de texto
 * (DD/MM/AAAA e HH:MM) pra tela não precisar saber em qual está rodando.
 */

export interface DateTimeFieldsProps {
  date: string;
  time: string;
  onChangeDate: (valor: string) => void;
  onChangeTime: (valor: string) => void;
  invalid?: boolean;
}

const LABEL = { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 } as const;
const INPUT = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  padding: 14,
  fontSize: 15,
} as const;

/** 25122026 -> 25/12/2026, cortando o que passar de oito dígitos. */
function mascararData(bruto: string): string {
  const n = bruto.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/** 2030 -> 20:30 */
function mascararHora(bruto: string): string {
  const n = bruto.replace(/\D/g, "").slice(0, 4);
  if (n.length <= 2) return n;
  return `${n.slice(0, 2)}:${n.slice(2)}`;
}

export function DateTimeFields({
  date,
  time,
  onChangeDate,
  onChangeTime,
  invalid = false,
}: DateTimeFieldsProps) {
  const borda = {
    borderWidth: invalid ? 1 : 0,
    borderColor: colors.error,
  };

  return (
    <View className="flex-row gap-3 mb-1">
      <View className="flex-1">
        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          DATA
        </Text>
        <TextInput
          value={date}
          onChangeText={(valor) => onChangeDate(mascararData(valor))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="number-pad"
          maxLength={10}
          style={{ ...INPUT, ...borda }}
        />
      </View>

      <View style={{ width: 110 }}>
        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          HORA
        </Text>
        <TextInput
          value={time}
          onChangeText={(valor) => onChangeTime(mascararHora(valor))}
          placeholder="HH:MM"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="number-pad"
          maxLength={5}
          style={{ ...INPUT, ...borda }}
        />
      </View>
    </View>
  );
}
