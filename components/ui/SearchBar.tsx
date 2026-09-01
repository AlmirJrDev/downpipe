import React from "react";
import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { colors } from "@/constants/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View className="flex-row items-center border-b border-outline-variant pb-3">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Pesquisar..."}
        placeholderTextColor={colors.muted}
        className="flex-1 text-on-surface"
        style={{ fontSize: 16 }}
      />
      <Search size={18} color={colors.outline} />
    </View>
  );
}
