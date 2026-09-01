import React from "react";
import { Pressable, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { colors } from "@/constants/theme";
import type { ProjectStep } from "@/types";

const STATUS_LABEL: Record<ProjectStep["status"], string> = {
  done: "Concluída",
  active: "Em andamento",
  pending: "Pendente",
};

export function Timeline({
  steps,
  onStepPress,
}: {
  steps: ProjectStep[];
  /** Só o dono recebe isso — sem ele a linha continua sendo só leitura. */
  onStepPress?: (step: ProjectStep) => void;
}) {
  return (
    <View>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor =
          step.status === "done"
            ? colors.primaryContainer
            : step.status === "active"
            ? colors.primary
            : colors.surfaceHigh;

        const body = (
          <>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-on-surface-variant"
                style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}
              >
                FASE {index + 1} · {STATUS_LABEL[step.status].toUpperCase()}
              </Text>
              {/* Sem o lápis, um item tocável não se distingue de um item de
                  leitura — a linha inteira já era só texto. */}
              {onStepPress && <Pencil size={13} color={colors.onSurfaceVariant} />}
            </View>
            <Text className="text-on-surface mt-0.5" style={{ fontSize: 16, fontWeight: "500" }}>
              {step.name}
            </Text>
            {step.description && (
              <Text className="text-muted mt-1" style={{ fontSize: 13 }}>
                {step.description}
              </Text>
            )}
            {step.status !== "pending" && (
              <Text className="text-on-surface-variant mt-1" style={{ fontSize: 12 }}>
                {step.actualCost != null
                  ? `R$ ${step.actualCost.toLocaleString("pt-BR")}`
                  : step.estimatedCost != null
                  ? `Est. R$ ${step.estimatedCost.toLocaleString("pt-BR")}`
                  : "—"}
              </Text>
            )}
          </>
        );

        return (
          <View key={step.id} className="flex-row">
            <View className="items-center mr-4" style={{ width: 20 }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: dotColor,
                  backgroundColor:
                    step.status === "done" ? dotColor : "transparent",
                }}
              />
              {!isLast && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 32,
                    backgroundColor: colors.outlineVariant,
                    marginVertical: 2,
                  }}
                />
              )}
            </View>
            {onStepPress ? (
              <Pressable
                onPress={() => onStepPress(step)}
                className="pb-6 flex-1 active:opacity-60"
              >
                {body}
              </Pressable>
            ) : (
              <View className="pb-6 flex-1">{body}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}
