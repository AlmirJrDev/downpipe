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
import { ArrowLeft, Camera, GitCompareArrows } from "lucide-react-native";
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

// Mesma proporção do componente BeforeAfter — as duas fotos precisam do
// mesmo enquadramento, senão a sobreposição não alinha.
const EVOLUTION_ASPECT = 4 / 3;

type Slot = "before" | "after";

export default function AddEvolutionScreen() {
  const { data: myCars } = useMyGarage();
  const createPost = useCreatePost();

  const [carId, setCarId] = useState<string | undefined>(undefined);
  const [beforeUri, setBeforeUri] = useState<string | undefined>();
  const [afterUri, setAfterUri] = useState<string | undefined>();
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Guarda qual das duas fotos está sendo recortada no momento.
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<Slot>("before");

  const cars = myCars ?? [];
  const selectedCarId = carId ?? cars[0]?.id;

  const pickPhoto = async (slot: Slot) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setPendingSlot(slot);
      setPendingUri(result.assets[0].uri);
    }
  };

  const isValid = !!selectedCarId && !!beforeUri && !!afterUri && caption.trim().length > 0;

  const submit = () => {
    if (!isValid || !beforeUri || !afterUri) return;
    setError(null);
    createPost.mutate(
      {
        carId: selectedCarId,
        type: "evolution",
        caption: caption.trim(),
        // A ordem importa: o backend guarda a posição de cada mídia, e o
        // apiService lê a primeira como "antes" e a segunda como "depois".
        localImageUris: [beforeUri, afterUri],
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

  const PhotoSlot = ({ slot, uri, label }: { slot: Slot; uri?: string; label: string }) => (
    <View className="flex-1">
      <Text
        className="text-on-surface-variant mb-2"
        style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => pickPhoto(slot)}
        className="border border-dashed border-outline-variant items-center justify-center"
        style={{ aspectRatio: EVOLUTION_ASPECT, overflow: "hidden" }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Camera size={22} color={colors.onSurface} />
        )}
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title="Antes e depois"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      {cars.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-on-surface-variant text-center">
            Adicione um carro à sua garagem antes de publicar uma evolução.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            CARRO
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {cars.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCarId(c.id)}
                className={`mr-2 px-4 py-2.5 border ${
                  selectedCarId === c.id ? "bg-primary-container border-primary-container" : "border-outline-variant"
                }`}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600" }}
                  className={selectedCarId === c.id ? "text-on-primary-container" : "text-on-surface-variant"}
                >
                  {carTitle(c)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-muted mb-3" style={{ fontSize: 12, lineHeight: 16 }}>
            Use o mesmo ângulo nas duas fotos — a comparação fica muito melhor quando só o carro muda.
          </Text>

          <View className="flex-row gap-3 mb-6">
            <PhotoSlot slot="before" uri={beforeUri} label="ANTES" />
            <PhotoSlot slot="after" uri={afterUri} label="DEPOIS" />
          </View>

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            LEGENDA
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Ex: Dois anos de projeto resumidos em uma foto."
            placeholderTextColor={colors.muted}
            multiline
            className="text-on-surface mb-8"
            style={{
              backgroundColor: colors.surfaceContainer,
              padding: 14,
              minHeight: 90,
              textAlignVertical: "top",
              fontSize: 15,
            }}
          />

          {error && (
            <Text className="text-error mb-4" style={{ fontSize: 13 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label="Publicar evolução"
            onPress={submit}
            loading={createPost.isPending}
            disabled={!isValid}
            icon={<GitCompareArrows size={15} color={colors.onPrimaryContainer} />}
          />
        </ScrollView>
      )}

      <ImageCropper
        uri={pendingUri}
        aspect={EVOLUTION_ASPECT}
        onCancel={() => setPendingUri(null)}
        onDone={(cropped) => {
          if (pendingSlot === "before") setBeforeUri(cropped);
          else setAfterUri(cropped);
          setPendingUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
