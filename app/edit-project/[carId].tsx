import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Target } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/States";
import { useCarById } from "@/stores/garageStore";
import { useProjectByCarId, useCreateProject, useUpdateProject } from "@/stores/projectStore";
import { carTitle } from "@/utils/car";
import { ApiError } from "@/services/api";

/**
 * Cria ou edita o projeto de um carro — a mesma tela pros dois casos, porque
 * o backend permite só um projeto por carro (`POST /cars/:carId/project`
 * devolve 409 se já existir). Se já houver projeto, vira PATCH.
 */
export default function EditProjectScreen() {
  const { carId, onboarding } = useLocalSearchParams<{ carId: string; onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const { data: car, isLoading: carLoading } = useCarById(carId);
  const { data: project, isPending: projectPending } = useProjectByCarId(carId);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [powerFrom, setPowerFrom] = useState("");
  const [powerTo, setPowerTo] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!project;

  useEffect(() => {
    if (projectPending || hydrated) return;
    if (project) {
      setTitle(project.title);
      setPowerFrom(project.powerGoalFrom != null ? String(project.powerGoalFrom) : "");
      setPowerTo(project.powerGoalTo != null ? String(project.powerGoalTo) : "");
      setBudget(project.budgetTotal != null ? String(project.budgetTotal) : "");
    } else if (car) {
      // Sugere o nome do carro como título — quase sempre é o que a pessoa
      // escreveria, e evita começar com o campo vazio.
      setTitle(carTitle(car));
    }
    setHydrated(true);
  }, [project, projectPending, car, hydrated]);

  const toNumber = (v: string) => (v.trim() ? Number(v) : null);
  const from = toNumber(powerFrom);
  const to = toNumber(powerTo);
  // Mesma regra do backend (createProjectSchema.refine), validada aqui pra dar
  // uma mensagem clara em vez de esperar o 422.
  const powerGoalInvalid = from != null && to != null && from > to;
  const isValid = title.trim().length > 0 && !powerGoalInvalid;

  const submit = () => {
    if (!isValid) return;
    setError(null);

    const input = {
      title: title.trim(),
      powerGoalFrom: from,
      powerGoalTo: to,
      budgetTotal: toNumber(budget),
    };

    // No onboarding volta pro feed (onde o checklist mostra o que ainda
    // falta); fora dele, abre o projeto que acabou de ser salvo.
    const onSuccess = () => router.replace(isOnboarding ? "/(tabs)" : `/project/${carId}`);
    const onError = (err: unknown) =>
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");

    if (project) {
      updateProject.mutate({ id: project.id, carId, patch: input }, { onSuccess, onError });
    } else {
      createProject.mutate({ carId, input }, { onSuccess, onError });
    }
  };

  if (carLoading || projectPending) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!car) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader
          title="PROJETO"
          left={
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          }
        />
        <EmptyState title="Carro não encontrado" description="Ele pode ter sido removido da garagem." />
      </View>
    );
  }

  const saving = createProject.isPending || updateProject.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title={isEditing ? "EDITAR PROJETO" : "NOVO PROJETO"}
        left={
          // No onboarding chegamos por replace: não há tela anterior pra
          // voltar, então o botão vira "pular" implícito indo pro feed.
          <Pressable
            hitSlop={8}
            onPress={() => (isOnboarding ? router.replace("/(tabs)") : router.back())}
          >
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
        right={
          isOnboarding ? (
            <Pressable hitSlop={8} onPress={() => router.replace("/(tabs)")}>
              <Text
                className="text-on-surface-variant"
                style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}
              >
                PULAR
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-on-surface-variant mb-6" style={typography.bodyMd}>
          {isEditing
            ? `Metas e orçamento do projeto de ${carTitle(car)}.`
            : `Defina as metas do build de ${carTitle(car)}. Depois você registra as etapas na timeline.`}
        </Text>

        <FormField
          label="Título do projeto"
          placeholder="Ex: Civic Turbo"
          value={title}
          onChangeText={setTitle}
        />

        <Text
          className="text-on-surface-variant mb-2"
          style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
        >
          META DE POTÊNCIA (CV)
        </Text>
        <Text className="text-muted mb-2" style={{ fontSize: 12, lineHeight: 16 }}>
          Opcional. De quanto o carro tem hoje até onde você quer chegar.
        </Text>
        <View className="flex-row gap-4 mb-5">
          <View className="flex-1">
            <FormField label="De" placeholder="183" value={powerFrom} onChangeText={setPowerFrom} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <FormField label="Até" placeholder="300" value={powerTo} onChangeText={setPowerTo} keyboardType="numeric" />
          </View>
        </View>

        {powerGoalInvalid && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            A potência inicial não pode ser maior que a meta.
          </Text>
        )}

        <FormField
          label="Orçamento total (R$)"
          placeholder="Ex: 25000"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          hint="Opcional. O quanto você gastou já é calculado a partir das modificações e etapas."
        />

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <View className="mt-2">
          <PrimaryButton
            label={isEditing ? "Salvar projeto" : "Criar projeto"}
            onPress={submit}
            loading={saving}
            disabled={!isValid}
            icon={<Target size={15} color={colors.onPrimaryContainer} />}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
