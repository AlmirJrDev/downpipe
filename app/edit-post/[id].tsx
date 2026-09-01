import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useUpdatePost } from "@/stores/socialStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { apiService } from "@/services/apiService";
import { ApiError } from "@/services/api";
import { postThumbnail } from "@/utils/post";

const LABEL = { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 } as const;
const INPUT = {
  backgroundColor: colors.inputSurface,
  color: colors.onInputSurface,
  padding: 14,
  fontSize: 15,
} as const;

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useCurrentUser();
  const updatePost = useUpdatePost();

  const { data: post, isPending } = useQuery({
    queryKey: ["post", id],
    queryFn: () => apiService.getPostById(id),
    enabled: !!id,
  });

  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cost, setCost] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Preenche uma vez só: um refetch no meio da digitação não pode
    // sobrescrever o que o usuário já mudou.
    if (!post || hydrated) return;
    setCaption(post.caption ?? "");
    setTitle(post.title ?? "");
    setSubtitle(post.subtitle ?? "");
    setCost(post.cost != null ? String(post.cost) : "");
    setProgress(post.progressPercent != null ? String(post.progressPercent) : "");
    setHydrated(true);
  }, [post, hydrated]);

  const header = (
    <AppHeader
      title="Editar publicação"
      left={
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {header}
        <EmptyState
          title="Publicação não encontrada"
          description="Ela pode ter sido removida."
        />
      </View>
    );
  }

  // O backend recusa post alheio com 403 — sem esta checagem a tela abriria
  // o formulário e só falharia ao salvar.
  const isAuthor = !!me && post.author?.username === me.username;
  if (!isAuthor) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {header}
        <EmptyState
          title="Publicação de outra pessoa"
          description="Você só pode editar as suas próprias publicações."
        />
      </View>
    );
  }

  const isProjectUpdate = post.type === "project_update";
  const progressNumber = progress.trim() ? Number(progress) : null;
  const progressInvalid =
    progressNumber !== null &&
    (!Number.isInteger(progressNumber) || progressNumber < 0 || progressNumber > 100);
  const isValid = !progressInvalid && (!isProjectUpdate || !!title.trim());

  const submit = () => {
    if (!isValid) return;
    setError(null);

    // Só os campos de texto: o backend não deixa trocar tipo, carro nem as
    // mídias já enviadas — isso evitaria um post de antes/depois virar
    // outra coisa e ficar inconsistente com as fotos.
    const patch = isProjectUpdate
      ? {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          caption: caption.trim() || null,
          cost: cost.trim() ? Number(cost) : null,
          progressPercent: progressNumber,
        }
      : { caption: caption.trim() || null };

    updatePost.mutate(
      { id: post.id, patch },
      {
        onSuccess: () => router.back(),
        onError: (err) =>
          setError(
            err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente."
          ),
      }
    );
  };

  const thumb = postThumbnail(post);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {header}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* A foto entra só como referência de qual post é este — trocá-la
            exige apagar e publicar de novo, que é o que o backend permite. */}
        {thumb && (
          <View className="mb-5 border border-border">
            <Image
              source={{ uri: thumb }}
              style={{ width: "100%", height: 180 }}
              contentFit="cover"
              transition={200}
            />
            <Text className="text-muted px-3 py-2" style={{ fontSize: 12 }}>
              A foto não pode ser trocada na edição.
            </Text>
          </View>
        )}

        {isProjectUpdate && (
          <>
            <Text className="text-on-surface-variant mb-2" style={LABEL}>
              TÍTULO
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: FASE 2"
              placeholderTextColor={colors.inputPlaceholder}
              maxLength={120}
              className="mb-5"
              style={INPUT}
            />

            <Text className="text-on-surface-variant mb-2" style={LABEL}>
              SUBTÍTULO
            </Text>
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Ex: Suspensão e rodas"
              placeholderTextColor={colors.inputPlaceholder}
              maxLength={200}
              className="mb-5"
              style={INPUT}
            />
          </>
        )}

        <Text className="text-on-surface-variant mb-2" style={LABEL}>
          {isProjectUpdate ? "DESTAQUE" : "LEGENDA"}
        </Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Escreva algo sobre o build..."
          placeholderTextColor={colors.inputPlaceholder}
          multiline
          maxLength={2000}
          className="mb-5"
          style={{ ...INPUT, minHeight: 110, textAlignVertical: "top" }}
        />

        {isProjectUpdate && (
          <>
            <Text className="text-on-surface-variant mb-2" style={LABEL}>
              INVESTIMENTO (R$)
            </Text>
            <TextInput
              value={cost}
              onChangeText={setCost}
              placeholder="Ex: 12000"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="numeric"
              className="mb-5"
              style={INPUT}
            />

            <Text className="text-on-surface-variant mb-2" style={LABEL}>
              EVOLUÇÃO (%)
            </Text>
            <TextInput
              value={progress}
              onChangeText={setProgress}
              placeholder="0 a 100"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="numeric"
              className={progressInvalid ? "mb-1" : "mb-8"}
              style={{
                ...INPUT,
                borderWidth: progressInvalid ? 1 : 0,
                borderColor: colors.error,
              }}
            />
            {progressInvalid && (
              <Text className="text-error mb-8" style={{ fontSize: 12 }}>
                Use um número inteiro de 0 a 100.
              </Text>
            )}
          </>
        )}

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <PrimaryButton
          label="Salvar alterações"
          onPress={submit}
          loading={updatePost.isPending}
          disabled={!isValid}
          icon={<Check size={15} color={colors.onPrimaryContainer} />}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
