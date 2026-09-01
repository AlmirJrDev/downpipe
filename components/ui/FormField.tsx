import React from "react";
import { Text, TextInput, View } from "react-native";
import { colors } from "@/constants/theme";

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  /** Texto explicativo entre o rótulo e o campo. */
  hint?: string;
  autoCapitalize?: "none" | "sentences";
}

/** Campo de formulário padrão do app — era copiado em add-car/edit-profile. */
export function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline,
  hint,
  autoCapitalize,
}: FormFieldProps) {
  return (
    <View className="mb-5">
      <Text
        className="text-on-surface-variant mb-2"
        style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
      >
        {label.toUpperCase()}
      </Text>
      {hint && (
        <Text className="text-muted mb-2" style={{ fontSize: 12, lineHeight: 16 }}>
          {hint}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? "sentences"}
        style={{
          backgroundColor: multiline ? colors.surfaceContainer : colors.inputSurface,
          color: multiline ? colors.onSurface : colors.onInputSurface,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 14,
          fontSize: 15,
          minHeight: multiline ? 90 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
