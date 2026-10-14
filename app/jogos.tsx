/**
 * Os jogos do Downpipe, dentro do app. A vitrine que o Google lê é a
 * página do servidor (/jogos); esta é a que se abre pelo menu e pelo feed.
 */
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight, Flag, Gamepad2, TrendingUp, Wrench } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { voltarOuIrPara } from "@/utils/navigation";
import { numeroDoDia } from "@/utils/naveDoDia";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import { colors } from "@/constants/theme";

const JOGOS = [
  {
    rota: "/nave-do-dia",
    Icone: Gamepad2,
    selo: () => `DIÁRIO · #${numeroDoDia()}`,
    nome: "Nave do Dia",
    texto: "Adivinhe o carro do dia pelas pistas de marca, país, motor, ano e potência.",
  },
  {
    rota: "/nave-do-dia-brasil",
    Icone: Flag,
    selo: () => `DIÁRIO · #${numeroDoDia()}`,
    nome: "Nave do Dia Brasil",
    texto: "Só carro que rodou muito por aqui: Gol, Opala, Uno, Corolla, Hilux. Outro carro por dia.",
  },
  {
    rota: "/frankenstein",
    Icone: Wrench,
    selo: () => `NOVO · DESAFIO #${numeroDoDia()}`,
    nome: "Frankenstein",
    texto: "Monte uma nave com peça de tudo que é carro e suba a escada de rachas no 402, do Fusca ao McLaren.",
  },
  {
    rota: "/mais-caro",
    Icone: TrendingUp,
    selo: () => "QUANTAS VEZES QUISER",
    nome: "Mais Caro ou Mais Barato?",
    texto: "Dois carros, um preço escondido. Acerte qual vale mais na tabela FIPE e não pare de acertar.",
  },
];

export default function JogosScreen() {
  const largo = useLarguraAmpla();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="JOGOS"
        left={
          <Pressable hitSlop={8} onPress={() => voltarOuIrPara("/(tabs)")} accessibilityRole="button" accessibilityLabel="Voltar">
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: largo ? 32 : 16, gap: 12, maxWidth: 900, width: "100%", alignSelf: "center" }}>
        <Text className="text-on-surface-variant" style={{ fontSize: 14, lineHeight: 20, marginBottom: 6 }}>
          Jogos rápidos pra quem vive carro. Grátis, e dá pra mandar o resultado pra galera.
        </Text>
        <View style={{ flexDirection: largo ? "row" : "column", flexWrap: largo ? "wrap" : "nowrap", gap: 12 }}>
          {JOGOS.map(({ rota, Icone, selo, nome, texto }) => (
            <Pressable
              key={rota}
              onPress={() => router.push(rota as never)}
              className="border border-border p-5 active:bg-white/5"
              style={{ flex: 1, flexBasis: largo ? "45%" : undefined, gap: 8, backgroundColor: colors.surfaceHigh }}
              accessibilityRole="link"
            >
              <View className="flex-row items-center justify-between">
                <Icone size={22} color={colors.primary} />
                <ChevronRight size={18} color={colors.outline} />
              </View>
              <Text className="text-muted" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.3 }}>
                {selo()}
              </Text>
              <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "800" }}>
                {nome}
              </Text>
              <Text className="text-on-surface-variant" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {texto}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
