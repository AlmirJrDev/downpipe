import React, { useMemo, useState } from "react";
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
import { ArrowLeft, Camera, Send } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageCropper } from "@/components/ImageCropper";
import { CarTagSheet } from "@/components/CarTagSheet";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { useMyGarage } from "@/stores/garageStore";
import { useCreatePost } from "@/stores/socialStore";
import { useEvents } from "@/stores/eventsStore";
import { carTitle } from "@/utils/car";
import { ApiError } from "@/services/api";
import type { Car, CarEvent } from "@/types";

// Mesma proporcao em que a foto aparece nesta tela.
const POST_ASPECT = 4 / 5;

export default function AddPostScreen() {
  const { data: myCars } = useMyGarage();
  const createPost = useCreatePost();

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  // Foto escolhida aguardando recorte (abre o ImageCropper).
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<string | undefined>(undefined);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  // Carro de outra pessoa escolhido na busca. Guarda o objeto inteiro pra
  // poder mostrar o nome e o @ do dono sem outra requisição.
  const [otherCar, setOtherCar] = useState<Car | null>(null);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cars = myCars ?? [];
  const carId = selectedCarId ?? cars[0]?.id;

  /**
   * Rolês que dá pra marcar: só aqueles em que a pessoa confirmou presença.
   * Os que já rolaram vêm primeiro — a foto quase sempre é do encontro
   * passado, não do que ainda vai acontecer.
   */
  const { data: proximos } = useEvents({});
  const { data: passados } = useEvents({ past: true });
  const taggableEvents = useMemo(() => {
    const confirmados = (lista?: { pages: { data: CarEvent[] }[] }) =>
      (lista?.pages.flatMap((p) => p.data) ?? []).filter((e) => e.attendingByMe);
    return [...confirmados(passados), ...confirmados(proximos)].slice(0, 12);
  }, [proximos, passados]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setPendingUri(result.assets[0].uri);
  };

  const isValid = !!photoUri && caption.trim().length > 0;

  const submit = () => {
    if (!isValid || !photoUri) return;
    setError(null);
    createPost.mutate(
      {
        // Carro de outra pessoa ganha do meu: escolher um substitui o outro.
        carId: otherCar ? otherCar.id : carId,
        eventId: selectedEventId ?? null,
        type: "normal",
        caption: caption.trim(),
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
        title="Nova publicação"
        left={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={pickPhoto}
          className="border border-dashed border-outline-variant items-center justify-center mb-5"
          style={{ aspectRatio: POST_ASPECT, overflow: "hidden" }}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <>
              <Camera size={28} color={colors.onSurface} />
              <Text className="text-on-surface mt-2" style={{ fontSize: 13, fontWeight: "600" }}>
                Escolher foto
              </Text>
            </>
          )}
        </Pressable>

        <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
          CARRO NA FOTO
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {cars.map((car) => (
            <Pressable
              key={car.id}
              onPress={() => {
                setSelectedCarId(car.id);
                setOtherCar(null);
              }}
              className={`mr-2 px-4 py-2.5 border ${
                !otherCar && carId === car.id
                  ? "bg-primary-container border-primary-container"
                  : "border-outline-variant"
              }`}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600" }}
                className={
                  !otherCar && carId === car.id ? "text-on-primary-container" : "text-on-surface-variant"
                }
              >
                {carTitle(car)}
              </Text>
            </Pressable>
          ))}

          {/* Carro de outra pessoa: é o que abre o app pra quem fotografa o
              carro dos outros e não tem garagem própria. */}
          <Pressable
            onPress={() => setTagSheetOpen(true)}
            className={`mr-2 px-4 py-2.5 border ${
              otherCar ? "bg-primary-container border-primary-container" : "border-outline"
            }`}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600" }}
              className={otherCar ? "text-on-primary-container" : "text-on-surface"}
            >
              {otherCar ? carTitle(otherCar) : "+ Carro de outra pessoa"}
            </Text>
          </Pressable>
        </ScrollView>

        {otherCar ? (
          <View className="flex-row items-center gap-2 mb-5">
            <Text className="text-muted flex-1" style={{ fontSize: 11, lineHeight: 16 }}>
              A marcação fica esperando @{otherCar.owner?.username} aceitar. Sua foto é publicada
              normalmente.
            </Text>
            <Pressable onPress={() => setOtherCar(null)} hitSlop={8}>
              <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
                remover
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mb-5" />
        )}

        {/* Marcar o rolê é o que junta as fotos de todo mundo na página do
            encontro depois. Só oferece os que a pessoa confirmou presença ou
            que já rolaram: marcar um rolê aleatório do outro lado do país
            seria ruído. */}
        {taggableEvents.length > 0 && (
          <>
            <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
              FOI EM ALGUM ROLÊ?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              {taggableEvents.map((event) => {
                const active = selectedEventId === event.id;
                return (
                  <Pressable
                    key={event.id}
                    // Tocar de novo desmarca — sem isso não haveria como
                    // desfazer uma marcação errada.
                    onPress={() => setSelectedEventId(active ? undefined : event.id)}
                    className={`mr-2 px-4 py-2.5 border ${
                      active ? "bg-primary-container border-primary-container" : "border-outline-variant"
                    }`}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: "600" }}
                      className={active ? "text-on-primary-container" : "text-on-surface-variant"}
                    >
                      {event.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
          LEGENDA
        </Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Conte a história dessa foto..."
          placeholderTextColor={colors.muted}
          multiline
          className="text-on-surface mb-8"
          style={{ backgroundColor: colors.surfaceContainer, padding: 14, minHeight: 90, textAlignVertical: "top", fontSize: 15 }}
        />

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <PrimaryButton
          label="Publicar"
          onPress={submit}
          loading={createPost.isPending}
          disabled={!isValid}
          icon={<Send size={15} color={colors.onPrimaryContainer} />}
        />
      </ScrollView>

      <CarTagSheet
        visible={tagSheetOpen}
        onClose={() => setTagSheetOpen(false)}
        onSelect={(car) => {
          setOtherCar(car);
          setTagSheetOpen(false);
        }}
      />

      <ImageCropper
        uri={pendingUri}
        aspect={POST_ASPECT}
        onCancel={() => setPendingUri(null)}
        onDone={(cropped) => {
          setPhotoUri(cropped);
          setPendingUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
