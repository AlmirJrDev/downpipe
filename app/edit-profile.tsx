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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ImageCropper } from "@/components/ImageCropper";
import { ArrowLeft, Camera, Check } from "lucide-react-native";
import { colors, typography } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FormField } from "@/components/ui/FormField";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isPlaceholderUsername } from "@/utils/profile";
import { ApiError } from "@/services/api";


// Mesma proporcao em que a foto aparece nesta tela.
const AVATAR_ASPECT = 1;

export default function EditProfileScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const { data: me, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();

  const [hydrated, setHydrated] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  // Foto escolhida aguardando recorte (abre o ImageCropper).
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gearheadSince, setGearheadSince] = useState("");
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me || hydrated) return;
    // Se o @ ainda é o placeholder gerado no signup, deixa o campo vazio
    // pra forçar uma escolha de verdade em vez de mostrar aquele texto feio.
    setUsername(isPlaceholderUsername(me.username) ? "" : me.username);
    setDisplayName(me.displayName);
    setBio(me.bio ?? "");
    setGearheadSince(me.gearheadSince ? String(me.gearheadSince) : "");
    setIsOrganizer(!!me.isOrganizer);
    setHydrated(true);
  }, [me, hydrated]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setPendingUri(result.assets[0].uri);
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const updated = await apiService.updateMyProfile({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        gearheadSince: gearheadSince.trim() ? Number(gearheadSince) : null,
        isOrganizer,
      });
      // Se tiver foto nova, o retorno do upload já é o perfil completo mais
      // atualizado (username + avatar); senão, o do PATCH já é o mais novo.
      return photoUri ? await apiService.uploadAvatar(photoUri) : updated;
    },
    onSuccess: (freshUser) => {
      // setQueryData, não invalidateQueries: invalidate só agenda um refetch
      // em background, e o cache fica com o username antigo (placeholder)
      // por uma volta — tempo suficiente pro redirect de onboarding em
      // _layout.tsx, que também assina "me", ler o dado velho e mandar de
      // volta pra cá antes do refetch terminar. Setando direto o resultado
      // da própria mutation, o cache já está correto no mesmo tick do navigate.
      queryClient.setQueryData(["me"], freshUser);
      // No onboarding, emenda direto na primeira ação de verdade (adicionar
      // carro) em vez de largar o usuário num feed vazio.
      if (isOnboarding) router.replace("/add-car?onboarding=1");
      else router.back();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
    },
  });

  const isValid = username.trim().length >= 3 && displayName.trim().length > 0;

  if (isLoading || !me) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title={isOnboarding ? "BEM-VINDO" : "EDITAR PERFIL"}
        left={
          isOnboarding ? undefined : (
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          )
        }
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {isOnboarding && (
          <Text className="text-on-surface-variant mb-6" style={typography.bodyMd}>
            Escolha seu @ e personalize o perfil antes de continuar.
          </Text>
        )}

        <Pressable onPress={pickPhoto} className="items-center mb-6">
          <UserAvatar uri={photoUri ?? me.avatarUrl ?? ""} size={96} ringColor={colors.primaryContainer} />
          <View className="flex-row items-center gap-1.5 mt-2">
            <Camera size={13} color={colors.primary} />
            <Text className="text-primary" style={{ fontSize: 13, fontWeight: "600" }}>
              Trocar foto
            </Text>
          </View>
        </Pressable>

        <FormField
          label="@ (username)"
          placeholder="ex: downpide"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
          autoCapitalize="none"
        />
        <FormField label="Nome de exibição" placeholder="Seu nome" value={displayName} onChangeText={setDisplayName} />
        <FormField
          label="Bio"
          placeholder="Fale sobre você e seus carros..."
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <FormField
          label="Gearhead desde"
          placeholder="Ex: 2015"
          value={gearheadSince}
          onChangeText={setGearheadSince}
          keyboardType="numeric"
        />

        {/* Marca no perfil, não um segundo tipo de conta: quem organiza
            encontro geralmente também tem carro, e duas contas obrigariam a
            manter dois logins. */}
        <Pressable
          onPress={() => setIsOrganizer((v) => !v)}
          className="flex-row items-center gap-3 border border-outline-variant p-4 mb-5 active:opacity-70"
        >
          <View
            className="items-center justify-center"
            style={{
              width: 22,
              height: 22,
              borderWidth: 1,
              borderColor: isOrganizer ? colors.primaryContainer : colors.outline,
              backgroundColor: isOrganizer ? colors.primaryContainer : "transparent",
            }}
          >
            {isOrganizer && <Check size={14} color={colors.onPrimaryContainer} />}
          </View>
          <View className="flex-1">
            <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
              Organizo encontros
            </Text>
            <Text className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              Coloca seus rolês em destaque no seu perfil.
            </Text>
          </View>
        </Pressable>

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <PrimaryButton
          label={isOnboarding ? "Concluir" : "Salvar"}
          onPress={() => {
            setError(null);
            saveProfile.mutate();
          }}
          loading={saveProfile.isPending}
          disabled={!isValid}
        />

        {/* Sem "pular" aqui de propósito: enquanto o @ for o placeholder do
            signup, o redirect de onboarding em _layout.tsx traz o usuário de
            volta pra cá — um botão de pular só criaria um loop. Escolher o @
            é obrigatório mesmo (perfis são endereçados por username). */}
      </ScrollView>

      <ImageCropper
        uri={pendingUri}
        aspect={AVATAR_ASPECT}
        onCancel={() => setPendingUri(null)}
        onDone={(cropped) => {
          setPhotoUri(cropped);
          setPendingUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
