import React from "react";
import { Pressable, Text, View } from "react-native";
import { statusMeta } from "@/constants/theme";
import type { ProjectStatus } from "@/types";

export function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  /** Sem onPress o card continua sendo só um número, como sempre foi. */
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text className="text-on-surface text-lg" style={{ fontWeight: "600" }}>
        {value}
      </Text>
      <Text
        className="text-on-surface-variant mt-1"
        style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}
      >
        {label}
      </Text>
    </>
  );

  if (!onPress) return <View className="flex-1 items-center py-2">{content}</View>;

  return (
    <Pressable onPress={onPress} className="flex-1 items-center py-2 active:opacity-60">
      {content}
    </Pressable>
  );
}

export function StatusChip({ status }: { status: ProjectStatus }) {
  const meta = statusMeta[status];
  return (
    <View className="bg-surface-high/95 flex-row items-center px-2.5 py-1 gap-1.5">
      <View style={{ width: 8, height: 8, backgroundColor: meta.color }} />
      <Text
        className="text-on-surface"
        style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1 }}
      >
        {meta.label}
      </Text>
    </View>
  );
}

export function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 mr-2 border ${
        active ? "bg-primary-container border-primary-container" : "border-outline-variant"
      }`}
    >
      <Text
        className={active ? "text-on-primary-container" : "text-on-surface-variant"}
        style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function FilterChip({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mr-4">
      <Text
        className="text-on-surface-variant"
        style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}
