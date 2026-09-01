/**
 * Pede o e-mail e dispara o link de recuperação.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não — é o backend que
 * decide isso, pra não virar uma forma de descobrir quem tem conta aqui.
 */
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, MailCheck } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui/Button";
import { authService } from "@/services/authService";
import { ApiError } from "@/services/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = /\S+@\S+\.\S+/.test(email.trim());

  const enviar = async () => {
    setLoading(true);
    setErro(null);
    try {
      await authService.forgotPassword(email.trim());
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não deu para enviar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="absolute left-6 top-14 flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        {enviado ? (
          <View className="items-center">
            <MailCheck size={40} color={colors.primary} />
            <Text className="text-on-surface text-center mt-5" style={typography.headlineSm}>
              Olhe seu e-mail
            </Text>
            <Text
              className="text-on-surface-variant text-center mt-3"
              style={{ fontSize: 14, lineHeight: 21 }}
            >
              Se existir uma conta com {email.trim()}, o link para criar uma senha nova
              está lá. Ele vale por uma hora.
            </Text>
            <Text className="text-muted text-center mt-4" style={{ fontSize: 12 }}>
              Não chegou? Veja no spam antes de tentar de novo.
            </Text>

            <View className="w-full mt-8">
              <PrimaryButton label="Voltar para o login" onPress={() => router.replace("/login")} />
            </View>
          </View>
        ) : (
          <>
            <Text className="text-on-surface text-center" style={typography.headlineSm}>
              Esqueci minha senha
            </Text>
            <Text
              className="text-on-surface-variant text-center mt-3 mb-8"
              style={{ fontSize: 14, lineHeight: 21 }}
            >
              Diga o e-mail da sua conta e mandamos um link para você criar uma senha nova.
            </Text>

            <View className="mb-5">
              <Text
                className="text-on-surface-variant mb-2"
                style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}
              >
                E-MAIL
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white text-black px-4 py-3.5"
                style={{ fontSize: 15 }}
              />
            </View>

            {erro && (
              <Text className="text-error mb-4" style={{ fontSize: 13 }}>
                {erro}
              </Text>
            )}

            <PrimaryButton
              label="Enviar link"
              onPress={enviar}
              loading={loading}
              disabled={!valido}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
