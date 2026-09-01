import React from "react";
import { Pressable, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { modIconComponent } from "@/constants/modIcons";
import { categoryLabel } from "@/utils/labels";
import type { Modification } from "@/types";

const MONTHS_PT = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

function monthLabel(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return MONTHS_PT[parsed.getMonth()];
}

export function ModificationCard({
  mod,
  onPress,
}: {
  mod: Modification;
  /** Só o dono recebe isso — sem ele o card continua sendo só leitura. */
  onPress?: () => void;
}) {
  const Icon = modIconComponent(mod.icon);

  const body = (
    <>
      <View className="flex-row items-center gap-3 flex-1">
        <View className="w-9 h-9 items-center justify-center bg-surface-container border border-border">
          <Icon size={16} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-on-surface" style={{ fontSize: 16, fontWeight: "500" }}>
            {mod.name}
          </Text>
          <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 12 }}>
            {mod.category ? categoryLabel(mod.category) : "Outros"}
          </Text>
          {mod.description ? (
            <Text className="text-muted mt-1" style={{ fontSize: 13 }} numberOfLines={2}>
              {mod.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="items-end">
        <Text
          className="text-muted"
          style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.5 }}
        >
          {monthLabel(mod.date)}
        </Text>
        <Text className="text-primary mt-0.5" style={{ fontSize: 14, fontWeight: "600" }}>
          R$ {(mod.cost ?? 0).toLocaleString("pt-BR")}
        </Text>
        {/* Sem o lápis, um card tocável não se distingue de um de leitura. */}
        {onPress && <Pencil size={13} color={colors.onSurfaceVariant} style={{ marginTop: 4 }} />}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View className="flex-row items-center justify-between border-b border-border py-4">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
    >
      {body}
    </Pressable>
  );
}
