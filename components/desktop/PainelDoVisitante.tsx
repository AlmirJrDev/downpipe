/**
 * A coluna da direita de quem está de visita, no computador.
 *
 * Post, fotos de rolê e perfil abrem na coluna de 600 px, como no
 * Instagram web; numa janela larga sobrava um bloco preto do lado. Aqui
 * entra o que mais segura quem chegou de fora: os jogos do dia e o
 * calendário de encontros.
 */
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { CalendarDays, ChevronRight, Flag, Gamepad2, TrendingUp, Wrench, type LucideIcon } from "lucide-react-native";
import { numeroDoDia } from "@/utils/naveDoDia";
import { colors } from "@/constants/theme";

export const LARGURA_DO_PAINEL = 300;

interface Cartao {
  Icone: LucideIcon;
  selo: string;
  nome: string;
  abrir: () => void;
}

function Linha({ Icone, selo, nome, abrir }: Cartao) {
  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="link"
      style={(estado) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: (estado as unknown as { hovered?: boolean }).hovered ? colors.surfaceHigh : colors.surfaceContainer,
      })}
    >
      <Icone size={20} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.muted, fontSize: 10.5, fontWeight: "700", letterSpacing: 1.1 }}>{selo}</Text>
        <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: "700" }}>{nome}</Text>
      </View>
      <ChevronRight size={16} color={colors.outline} />
    </Pressable>
  );
}

export function PainelDoVisitante() {
  const n = numeroDoDia();
  const jogos: Cartao[] = [
    { Icone: Gamepad2, selo: `DIÁRIO · #${n}`, nome: "Nave do Dia", abrir: () => router.push("/nave-do-dia") },
    { Icone: Flag, selo: `DIÁRIO · #${n}`, nome: "Nave do Dia Brasil", abrir: () => router.push("/nave-do-dia-brasil") },
    { Icone: Wrench, selo: `DESAFIO · #${n}`, nome: "Frankenstein", abrir: () => router.push("/frankenstein") },
    { Icone: TrendingUp, selo: "TABELA FIPE", nome: "Mais Caro ou Mais Barato?", abrir: () => router.push("/mais-caro") },
  ];

  return (
    <ScrollView style={{ width: LARGURA_DO_PAINEL, flexGrow: 0 }} contentContainerStyle={{ paddingTop: 28, paddingBottom: 28, gap: 22 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>JOGOS DE HOJE</Text>
        {jogos.map((j) => (
          <Linha key={j.nome} {...j} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 }}>ENCONTROS</Text>
        <Linha
          Icone={CalendarDays}
          selo="CALENDÁRIO"
          nome="Encontros de carro pelo Brasil"
          abrir={() => {
            // Página do site, fora do app.
            if (typeof window !== "undefined") window.location.href = "/encontros";
          }}
        />
      </View>
    </ScrollView>
  );
}
