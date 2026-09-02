import React from "react";
import { Text, View } from "react-native";
import { colors, FONT_STACK } from "@/constants/theme";
import type { DateTimeFieldsProps } from "./DateTimeFields";

/**
 * Data e hora do rolê — versão do navegador.
 *
 * Usa <input type="date"> e <input type="time"> de verdade: no celular o
 * próprio sistema abre o seletor de rolagem, e ninguém digita barra nem
 * dois-pontos. É o motivo desta versão existir — o campo de texto que havia
 * antes obrigava a trocar de teclado pra achar a "/".
 *
 * Elemento do DOM em JSX funciona aqui porque na web o app é renderizado
 * pelo React DOM; no celular este arquivo nem é lido.
 *
 * A tela conversa em DD/MM/AAAA e HH:MM, que é o que o resto do app já usa;
 * o <input type="date"> conversa em AAAA-MM-DD. A tradução mora aqui pra
 * não vazar formato de navegador pro resto do código.
 */

const LABEL = { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 } as const;

function paraInput(br: string): string {
  const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function paraTela(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export function DateTimeFields({
  date,
  time,
  onChangeDate,
  onChangeTime,
  invalid = false,
}: DateTimeFieldsProps) {
  const estilo: React.CSSProperties = {
    backgroundColor: colors.inputSurface,
    color: colors.onInputSurface,
    padding: 14,
    fontSize: 15,
    width: "100%",
    boxSizing: "border-box",
    border: invalid ? `1px solid ${colors.error}` : "none",
    borderRadius: 0,
    // Não use "inherit" aqui: o que se herda é o Inter declarado no
    // tailwind.config, que não é carregado — e cai em serifa, destoando de
    // todos os outros campos da mesma tela.
    fontFamily: FONT_STACK,
    // O Safari centraliza o texto do campo de data e ainda deixa a altura
    // menor que a dos outros campos. Estes dois alinham com o resto do
    // formulário.
    textAlign: "left",
    minHeight: 48,
    // Sem isto o iOS pinta o campo de branco e o texto some no tema escuro.
    WebkitAppearance: "none",
    colorScheme: "dark",
    // Mesmo peso e altura de linha dos TextInput vizinhos, senão o campo de
    // data parece de outra família mesmo com a fonte certa.
    fontWeight: 400,
    lineHeight: "20px",
  };

  return (
    <View className="flex-row gap-3 mb-1">
      <View className="flex-1">
        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          DATA
        </Text>
        <input
          type="date"
          value={paraInput(date)}
          onChange={(e) => onChangeDate(paraTela(e.target.value))}
          style={estilo}
        />
      </View>

      <View style={{ width: 130 }}>
        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          HORA
        </Text>
        <input
          type="time"
          value={time}
          onChange={(e) => onChangeTime(e.target.value)}
          style={estilo}
        />
      </View>
    </View>
  );
}
