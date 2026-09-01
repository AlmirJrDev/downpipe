import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Camera, Flag } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageCropper } from "@/components/ImageCropper";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { useMyGarage } from "@/stores/garageStore";
import { useCreatePost } from "@/stores/socialStore";
import { carTitle } from "@/utils/car";
import { ApiError } from "@/services/api";

// Mesma proporcao em que a foto aparece nesta tela.
const UPDATE_ASPECT = 4 / 3;

export default function AddProjectUpdateScreen() {
  const { data: myCars } = useMyGarage();
  const createPost = useCreatePost();

  const [carId, setCarId] = useState<string | undefined>(undefined);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  // Foto escolhida aguardando recorte (abre o ImageCropper).
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [caption, setCaption] = useState("");
  const [cost, setCost] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cars = myCars ?? [];
  const selectedCarId = carId ?? cars[0]?.id;
  const car = cars.find((c) => c.id === selectedCarId);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setPendingUri(result.assets[0].uri);
  };

  const isValid = !!selectedCarId && !!photoUri && caption.trim() && subtitle.trim();

  const submit = () => {
    if (!isValid || !car || !photoUri) return;
    setError(null);
    createPost.mutate(
      {
        carId: car.id,
        type: "project_update",
        title: carTitle(car).toUpperCase(),
        subtitle: subtitle.trim(),
        caption: caption.trim(),
        cost: Number(cost) || 0,
        progressPercent: Math.min(100, Math.max(0, Number(progress) || 0)),
        localImageUris: [photoUri],
      },
      {
        onSuccess: () => router.replace("/(tabs)"),
        onError: (err) =>
          setError(
            err instanceof ApiError ? err.message : "Não foi possível publicar. Tente novamente."
          ),
      }
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AppHeader
        title="Atualização do projeto"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      {cars.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-on-surface-variant text-center">
            Adicione um carro à sua garagem antes de registrar uma atualização.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            CARRO
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {cars.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCarId(c.id)}
                className={`mr-2 px-4 py-2.5 border ${selectedCarId === c.id ? "bg-primary-container border-primary-container" : "border-outline-variant"}`}
              >
                <Text style={{ fontSize: 13, fontWeight: "600" }} className={selectedCarId === c.id ? "text-on-primary-container" : "text-on-surface-variant"}>
                  {carTitle(c)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={pickPhoto}
            className="border border-dashed border-outline-variant items-center justify-center mb-5"
            style={{ aspectRatio: UPDATE_ASPECT, overflow: "hidden" }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <>
                <Camera size={26} color={colors.onSurface} />
                <Text className="text-on-surface mt-2" style={{ fontSize: 13, fontWeight: "600" }}>
                  Foto do progresso
                </Text>
              </>
            )}
          </Pressable>

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            FASE / SUBTÍTULO
          </Text>
          <TextInput
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Ex: Update Fase 2 - Suspensão"
            placeholderTextColor={colors.inputPlaceholder}
            className="mb-5"
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            LEGENDA
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Ex: Coilover instalado."
            placeholderTextColor={colors.inputPlaceholder}
            className="mb-5"
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          <View className="flex-row gap-4 mb-8">
            <View className="flex-1">
              <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
                CUSTO (R$)
              </Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                placeholder="3200"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
                style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
              />
            </View>
            <View className="flex-1">
              <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
                PROGRESSO (%)
              </Text>
              <TextInput
                value={progress}
                onChangeText={setProgress}
                placeholder="45"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
                style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
              />
            </View>
          </View>

          {error && (
            <Text className="text-error mb-4" style={{ fontSize: 13 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label="Publicar atualização"
            onPress={submit}
            loading={createPost.isPending}
            disabled={!isValid}
            icon={<Flag size={15} color={colors.onPrimaryContainer} />}
          />
        </ScrollView>
      )}

      <ImageCropper
        uri={pendingUri}
        aspect={UPDATE_ASPECT}
        onCancel={() => setPendingUri(null)}
        onDone={(cropped) => {
          setPhotoUri(cropped);
          setPendingUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
