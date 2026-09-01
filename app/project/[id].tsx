import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Alert } from "@/utils/alert";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useCarById } from "@/stores/garageStore";
import {
  useProjectByCarId,
  useAddProjectStep,
  useUpdateProjectStep,
  useRemoveProjectStep,
} from "@/stores/projectStore";
import { AppHeader } from "@/components/AppHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timeline } from "@/components/Timeline";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton } from "@/components/ui/Button";
import { CategoryChip } from "@/components/ui/Chips";
import { EmptyState } from "@/components/ui/States";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { carTitle } from "@/utils/car";
import { colors } from "@/constants/theme";
import type { ProjectStep } from "@/types";

type StepStatus = ProjectStep["status"];

const STATUS_OPTIONS: { value: StepStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "active", label: "Em andamento" },
  { value: "done", label: "Concluída" },
];

const money = (value: number | null | undefined) => (value != null ? String(value) : "");

export default function ProjectDetailsScreen() {
  const { id: carId } = useLocalSearchParams<{ id: string }>();
  const { data: car, isLoading: carLoading } = useCarById(carId);
  const { data: project, isLoading: projectLoading } = useProjectByCarId(carId);
  const addStep = useAddProjectStep();
  const updateStep = useUpdateProjectStep();
  const removeStep = useRemoveProjectStep();
  const { data: me } = useCurrentUser();
  const isOwner = !!me && !!car && me.id === car.ownerId;

  // A mesma folha cria e edita: os campos são idênticos, e duplicar isso em
  // duas telas só criaria dois lugares pra manter em sincronia.
  // `editing` null = modo criação.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectStep | null>(null);
  const [stepName, setStepName] = useState("");
  const [stepStatus, setStepStatus] = useState<StepStatus>("pending");
  const [stepCost, setStepCost] = useState("");
  const [stepActualCost, setStepActualCost] = useState("");
  const [stepDescription, setStepDescription] = useState("");

  const openCreate = () => {
    setEditing(null);
    setStepName("");
    setStepStatus("pending");
    setStepCost("");
    setStepActualCost("");
    setStepDescription("");
    setSheetOpen(true);
  };

  const openEdit = (step: ProjectStep) => {
    setEditing(step);
    setStepName(step.name);
    setStepStatus(step.status);
    setStepCost(money(step.estimatedCost));
    setStepActualCost(money(step.actualCost));
    setStepDescription(step.description ?? "");
    setSheetOpen(true);
  };

  if (carLoading || projectLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!car) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader />
        <EmptyState title="Carro não encontrado" description="Volte para a garagem e tente novamente." />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader
          title={carTitle(car)}
          left={
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          }
        />
        {/* Só o dono cria o projeto — o backend recusa carro alheio com 403,
            então pra visitante isso seria um botão que só dá erro. */}
        {isOwner ? (
          <EmptyState
            title="Sem projeto ainda"
            description="Crie o projeto pra definir meta de potência, orçamento e acompanhar as etapas do build."
            actionLabel="+ Criar projeto"
            onAction={() => router.push(`/edit-project/${carId}`)}
          />
        ) : (
          <EmptyState
            title="Sem projeto ainda"
            description="O dono deste carro ainda não abriu um projeto de build."
          />
        )}
      </View>
    );
  }

  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
  };

  const submitStep = () => {
    if (!stepName.trim()) return;

    // Campo vazio vira null (e não 0) pra realmente limpar o valor no
    // backend — 0 seria "custou zero", que é outra coisa.
    const estimatedCost = stepCost.trim() ? Number(stepCost) : null;
    const actualCost = stepActualCost.trim() ? Number(stepActualCost) : null;

    if (editing) {
      updateStep.mutate(
        {
          projectId: project.id,
          stepId: editing.id,
          carId,
          patch: {
            name: stepName.trim(),
            status: stepStatus,
            estimatedCost,
            actualCost,
            description: stepDescription.trim() || null,
          },
        },
        { onSuccess: closeSheet }
      );
      return;
    }

    addStep.mutate(
      {
        projectId: project.id,
        carId,
        input: {
          name: stepName.trim(),
          status: stepStatus,
          estimatedCost: estimatedCost ?? 0,
          actualCost,
          description: stepDescription.trim() || undefined,
        },
      },
      { onSuccess: closeSheet }
    );
  };

  const confirmDelete = () => {
    if (!editing) return;
    const step = editing;
    Alert.alert(
      "Excluir etapa",
      `Remover "${step.name}" da linha de evolução? Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            removeStep.mutate(
              { projectId: project.id, stepId: step.id, carId },
              { onSuccess: closeSheet }
            ),
        },
      ]
    );
  };

  const budgetPct =
    project.budgetTotal && project.budgetTotal > 0
      ? Math.min(100, Math.round((project.budgetSpent / project.budgetTotal) * 100))
      : 0;
  const hasPowerGoal = project.powerGoalFrom != null && project.powerGoalTo != null && project.powerGoalTo > 0;
  const powerPct = hasPowerGoal
    ? Math.min(100, Math.round((project.powerGoalFrom! / project.powerGoalTo!) * 100))
    : 0;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
        right={
          isOwner ? (
            <Pressable hitSlop={8} onPress={() => router.push(`/edit-project/${carId}`)}>
              <Pencil size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : (
            <UserAvatar uri={me?.avatarUrl ?? ""} size={28} />
          )
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="border border-border overflow-hidden mb-5">
          <View style={{ height: 220 }}>
            {car.photoUrl && (
              <Image source={{ uri: car.photoUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            )}
            <View className="absolute bottom-0 left-0 right-0 p-4" style={{ backgroundColor: colors.overlayMedium }}>
              <Text className="text-on-surface" style={{ fontSize: 20, fontWeight: "600" }}>
                {carTitle(car)}
              </Text>
              <Text
                className="text-primary mt-0.5"
                style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2 }}
              >
                PROGRESSO DO PROJETO
              </Text>
            </View>
          </View>
        </View>

        {hasPowerGoal && (
          <View className="border border-border p-4 mb-3">
            <View className="flex-row justify-between mb-2">
              <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
                Meta de potência
              </Text>
              <Text style={{ fontSize: 14 }}>
                <Text className="text-on-surface">{project.powerGoalFrom} cv → </Text>
                <Text className="text-primary" style={{ fontWeight: "700" }}>
                  {project.powerGoalTo} cv
                </Text>
              </Text>
            </View>
            <ProgressBar progress={powerPct} />
          </View>
        )}

        <View className="border border-border p-4 mb-3">
          <View className="flex-row justify-between mb-2">
            <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
              Orçamento
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              R$ {project.budgetSpent.toLocaleString("pt-BR")} / R${" "}
              {(project.budgetTotal ?? 0).toLocaleString("pt-BR")}
            </Text>
          </View>
          <ProgressBar progress={budgetPct} />
        </View>

        <View className="border border-border p-4 mb-5 flex-row items-center justify-between">
          <Text className="text-on-surface-variant" style={{ fontSize: 13, fontWeight: "600" }}>
            Modificações
          </Text>
          <Text style={{ fontSize: 14 }}>
            <Text className="text-primary" style={{ fontWeight: "700" }}>
              {project.modificationsDone}
            </Text>
            <Text className="text-on-surface"> / {project.modificationsTotal} concluídas</Text>
          </Text>
        </View>

        {/* Registrar modificação e criar etapa exigem ser dono do carro — o
            backend recusa com 403. Pra visitante, era um botão que só levava
            a erro; agora a tela dele é só de leitura. */}
        {isOwner && (
          <PrimaryButton
            label="Adicionar modificação"
            icon={<Plus size={15} color={colors.onPrimaryContainer} />}
            onPress={() => router.push(`/add-modification?carId=${carId}`)}
          />
        )}

        <View className="border border-border p-5 mt-6">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-on-surface" style={{ fontSize: 19, fontWeight: "600" }}>
              Linha de evolução
            </Text>
            {isOwner && (
              <Pressable onPress={openCreate} hitSlop={8}>
                <Plus size={18} color={colors.primary} />
              </Pressable>
            )}
          </View>
          <Timeline steps={project.steps} onStepPress={isOwner ? openEdit : undefined} />
          {isOwner && project.steps.length > 0 && (
            <Text className="text-muted mt-1" style={{ fontSize: 12 }}>
              Toque numa etapa para editar ou excluir.
            </Text>
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={sheetOpen}
        onClose={closeSheet}
        title={editing ? "Editar Etapa" : "Nova Etapa"}
      >
        <View className="px-5 pt-2" style={{ gap: 14 }}>
          <TextInput
            value={stepName}
            onChangeText={setStepName}
            placeholder="Nome da etapa (ex: Turbo)"
            placeholderTextColor={colors.inputPlaceholder}
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          <View className="flex-row">
            {STATUS_OPTIONS.map((option) => (
              <CategoryChip
                key={option.value}
                label={option.label}
                active={stepStatus === option.value}
                onPress={() => setStepStatus(option.value)}
              />
            ))}
          </View>

          <TextInput
            value={stepCost}
            onChangeText={setStepCost}
            placeholder="Custo estimado (R$)"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="numeric"
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          {/* Custo real só faz sentido depois que a etapa saiu do papel — é
              exatamente quando a linha de evolução passa a exibi-lo. */}
          {stepStatus !== "pending" && (
            <TextInput
              value={stepActualCost}
              onChangeText={setStepActualCost}
              placeholder="Custo real (R$)"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="numeric"
              style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
            />
          )}

          <TextInput
            value={stepDescription}
            onChangeText={setStepDescription}
            placeholder="Descrição (opcional)"
            placeholderTextColor={colors.muted}
            multiline
            style={{ backgroundColor: colors.surfaceContainer, color: colors.onSurface, padding: 14, minHeight: 70, textAlignVertical: "top", fontSize: 15 }}
          />

          <View className="mb-2" style={{ gap: 10 }}>
            <PrimaryButton
              label={editing ? "Salvar alterações" : "Adicionar etapa"}
              onPress={submitStep}
              disabled={!stepName.trim()}
              loading={addStep.isPending || updateStep.isPending}
            />
            {editing && (
              <Pressable
                onPress={confirmDelete}
                disabled={removeStep.isPending}
                className="flex-row items-center justify-center gap-2 py-3 active:opacity-60"
              >
                {removeStep.isPending ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <>
                    <Trash2 size={15} color={colors.error} />
                    <Text
                      style={{
                        color: colors.error,
                        fontSize: 13,
                        fontWeight: "600",
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Excluir etapa
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
