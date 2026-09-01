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
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
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
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  isSecureVisible?: boolean;
  toggleSecure?: () => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
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
          autoCapitalize={autoCapitalize ?? "none"}
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

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && password.length >= 8;

  const submit = async () => {
    if (!isValid || loading) return;
    setError(null);
    setConfirmationNotice(null);
    setLoading(true);
    try {
      const { requiresEmailConfirmation } = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      if (requiresEmailConfirmation) {
        setConfirmationNotice("Conta criada! Confirme seu e-mail antes de entrar.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title="CADASTRO"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-on-surface-variant mb-6" style={typography.bodyMd}>
          Crie sua conta para salvar sua garagem e acompanhar seus projetos.
        </Text>

        <Field
          label="Nome de exibição"
          placeholder="Como quer aparecer"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="sentences"
        />
        <Field
          label="E-mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="Senha"
          placeholder="Mínimo 8 caracteres"
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
        {confirmationNotice && (
          <Text className="text-success mb-4" style={{ fontSize: 13 }}>
            {confirmationNotice}
          </Text>
        )}

        <View className="mt-2">
          <PrimaryButton label="Criar conta" onPress={submit} loading={loading} disabled={!isValid} />
        </View>

        <Pressable className="mt-6" onPress={() => router.back()} hitSlop={8}>
          <Text className="text-on-surface-variant text-center" style={{ fontSize: 14 }}>
            Já tem conta?{" "}
            <Text className="text-primary" style={{ fontWeight: "600" }}>
              Entrar
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
