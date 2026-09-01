import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { useMyGarage } from "@/stores/garageStore";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isPlaceholderUsername } from "@/utils/profile";

interface Step {
  label: string;
  done: boolean;
  route: string;
}

function StepRow({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (!step.done) router.push(step.route as never);
      }}
      disabled={step.done}
      className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-outline-variant"}`}
    >
      <View
        className="items-center justify-center"
        style={{
          width: 20,
          height: 20,
          borderWidth: 1,
          borderColor: step.done ? colors.primaryContainer : colors.outline,
          backgroundColor: step.done ? colors.primaryContainer : "transparent",
        }}
      >
        {step.done && <Check size={12} color={colors.onPrimaryContainer} strokeWidth={3} />}
      </View>
      <Text
        className={step.done ? "text-muted flex-1" : "text-on-surface flex-1"}
        style={{ fontSize: 14, textDecorationLine: step.done ? "line-through" : "none" }}
      >
        {step.label}
      </Text>
      {!step.done && <ChevronRight size={16} color={colors.outline} />}
    </Pressable>
  );
}

/**
 * Card "comece por aqui" no topo do feed. Some sozinho quando os três
 * passos estão feitos — não tem botão de dispensar de propósito: é curto,
 * e some com o uso normal do app em vez de precisar de um flag persistido.
 */
export function GettingStarted() {
  const { data: me } = useCurrentUser();
  const { data: cars } = useMyGarage();
  // limit 1 e a key com os params: só precisa saber "existe algum post?".
  // Sem os params na key, isso colidiria com a query de 30 posts da tela de
  // Perfil, que usa o mesmo prefixo.
  const { data: postsPage } = useQuery({
    queryKey: ["posts-by-username", me?.username, 1, 1],
    queryFn: () => apiService.getPostsByUsername(me!.username, 1, 1),
    enabled: !!me?.username,
  });

  // Espera os dados chegarem pra não piscar um checklist errado.
  if (!me || cars === undefined || postsPage === undefined) return null;

  const firstCar = cars[0];

  const steps: Step[] = [
    { label: "Personalizar seu perfil", done: !isPlaceholderUsername(me.username), route: "/edit-profile" },
    { label: "Adicionar seu primeiro carro", done: cars.length > 0, route: "/add-car" },
    {
      label: "Criar o projeto do seu build",
      // projectsCount vem de /profile/me. Sem carro não dá pra criar projeto,
      // então o passo aponta pra adicionar carro antes.
      done: me.projectsCount > 0,
      route: firstCar ? `/edit-project/${firstCar.id}` : "/add-car",
    },
    { label: "Fazer sua primeira publicação", done: postsPage.data.length > 0, route: "/add-post" },
  ];

  if (steps.every((s) => s.done)) return null;

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <View className="border border-border bg-card px-4 pt-4 pb-2 mb-6">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-on-surface" style={typography.labelCaps}>
          Comece por aqui
        </Text>
        <Text className="text-muted" style={{ fontSize: 12, fontWeight: "600" }}>
          {doneCount}/{steps.length}
        </Text>
      </View>
      <Text className="text-on-surface-variant mb-2" style={{ fontSize: 13 }}>
        Monte sua garagem e mostre seu build pra comunidade.
      </Text>
      {steps.map((step, i) => (
        <StepRow key={step.label} step={step} isLast={i === steps.length - 1} />
      ))}
    </View>
  );
}
