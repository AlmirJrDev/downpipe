import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { ApiError } from "@/services/api";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  isSecureVisible,
  toggleSecure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  isSecureVisible?: boolean;
  toggleSecure?: () => void;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View className="mb-5">
      <Text
        className="text-on-surface-variant mb-2"
        style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
      >
        {label.toUpperCase()}
      </Text>
      <View className="flex-row items-center" style={{ backgroundColor: colors.inputSurface }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure && !isSecureVisible}
          style={{
            flex: 1,
            color: colors.onInputSurface,
            paddingHorizontal: 14,
            paddingVertical: 14,
            fontSize: 15,
          }}
        />
        {secure && (
          <Pressable hitSlop={8} onPress={toggleSecure} style={{ paddingHorizontal: 14 }}>
            {isSecureVisible ? (
              <EyeOff size={18} color={colors.onInputSurface} />
            ) : (
              <Eye size={18} color={colors.onInputSurface} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!isValid || loading) return;
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-2">
          <Logo height={46} />
        </View>
        <Text
          className="text-on-surface-variant text-center mb-8"
          style={{ fontSize: 10, fontWeight: "500", letterSpacing: 4.2 }}
        >
          REDE SOCIAL AUTOMOTIVA
        </Text>
        <Text className="text-on-surface text-center mb-8" style={typography.headlineSm}>
          Entrar
        </Text>

        <Field
          label="E-mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="Senha"
          placeholder="Sua senha"
          value={password}
          onChangeText={setPassword}
          secure
          isSecureVisible={showPassword}
          toggleSecure={() => setShowPassword((v) => !v)}
        />

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <View className="mt-2">
          <PrimaryButton label="Entrar" onPress={submit} loading={loading} disabled={!isValid} />
        </View>

        <Pressable
          className="mt-5"
          onPress={() => router.push("/forgot-password")}
          hitSlop={8}
        >
          <Text className="text-on-surface-variant text-center" style={{ fontSize: 13 }}>
            Esqueci minha senha
          </Text>
        </Pressable>

        <Pressable className="mt-5" onPress={() => router.push("/register")} hitSlop={8}>
          <Text className="text-on-surface-variant text-center" style={{ fontSize: 14 }}>
            Não tem conta?{" "}
            <Text className="text-primary" style={{ fontWeight: "600" }}>
              Cadastre-se
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
