import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Car, Wrench, Camera, Flag, GitCompareArrows, CalendarPlus, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";
import type { AddAction } from "@/types";

const actions: {
  key: AddAction;
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  route: string;
}[] = [
  {
    key: "carro",
    icon: Car,
    title: "Novo carro",
    subtitle: "Adicione um novo carro à sua garagem",
    route: "/add-car",
  },
  {
    key: "modificacao",
    icon: Wrench,
    title: "Modificação",
    subtitle: "Registre uma peça ou serviço no projeto",
    route: "/add-modification",
  },
  {
    key: "post",
    icon: Camera,
    title: "Publicação",
    subtitle: "Compartilhe uma foto do seu carro",
    route: "/add-post",
  },
  {
    key: "atualizacao",
    icon: Flag,
    title: "Atualização do projeto",
    subtitle: "Registre o progresso do projeto",
    route: "/add-project-update",
  },
  {
    key: "evolucao",
    icon: GitCompareArrows,
    title: "Antes e depois",
    subtitle: "Compare duas fotos do mesmo carro",
    route: "/add-evolution",
  },
  {
    key: "evento",
    icon: CalendarPlus,
    title: "Encontro",
    subtitle: "Marque um rolê e veja quem confirma",
    route: "/add-event",
  },
];

export default function AddActionScreen() {
  const insets = useSafeAreaInsets();

  const go = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace(route as any);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.overlaySheet,
        paddingTop: insets.top + 32,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <Text
        className="text-on-surface text-center mb-6"
        style={{ fontSize: 22, fontWeight: "600", letterSpacing: 3 }}
      >
        SELECIONAR AÇÃO
      </Text>

      {/* A lista ocupa a altura que sobra e os cards a dividem por igual
          (flex: 1 em cada). Antes cada card tinha altura de conteúdo fixa, e
          bastou entrar a quinta ação pra estourar a tela — o último card e o
          botão de fechar ficavam fora do visível. Assim cabe qualquer
          quantidade de ações, em qualquer tamanho de celular. */}
      <View style={{ flex: 1, gap: 12 }}>
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Pressable
              key={a.key}
              onPress={() => go(a.route)}
              className="border border-outline-variant active:bg-white/5"
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 20,
                paddingVertical: 12,
                overflow: "hidden",
              }}
            >
              <Icon size={24} color={colors.onSurface} strokeWidth={1.6} />
              <Text
                className="text-on-surface mt-2"
                style={{ fontSize: 16, fontWeight: "600" }}
                numberOfLines={1}
              >
                {a.title}
              </Text>
              {/* Uma linha só: com 5 ações o card fica baixo, e um subtítulo
                  quebrando em duas linhas estourava a altura em telas menores. */}
              <Text
                className="text-on-surface-variant mt-1 text-center"
                style={{ fontSize: 12 }}
                numberOfLines={1}
              >
                {a.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* flexShrink: 0 — o botão fica fora da lista e nunca é espremido. */}
      <Pressable
        onPress={() => router.back()}
        style={{ flexShrink: 0, marginTop: 24 }}
        className="self-center w-14 h-14 rounded-full border border-outline-variant items-center justify-center"
      >
        <X size={22} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}
