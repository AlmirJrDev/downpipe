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
import * as ImagePicker from "expo-image-picker";
import { ImageCropper } from "@/components/ImageCropper";
import { Image } from "expo-image";
import { ArrowLeft, Camera } from "lucide-react-native";
import { colors, statusMeta } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { CategoryChip } from "@/components/ui/Chips";
import { categoryLabel } from "@/utils/labels";
import { EmptyState } from "@/components/ui/States";
import { useCarById, useUpdateCar, useUploadCarPhoto } from "@/stores/garageStore";
import { carCatalogName } from "@/utils/car";
import { ApiError } from "@/services/api";
import type { Category, ProjectStatus } from "@/types";

const CATEGORIES: Category[] = ["JDM", "Euro", "Muscle", "Performance", "Clássicos", "Stance", "Other"];
const STATUSES: ProjectStatus[] = ["planning", "building", "complete"];

// Mesma proporcao em que a foto aparece nesta tela.
const CAR_ASPECT = 4 / 3;

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, isLoading } = useCarById(id);
  const updateCar = useUpdateCar();
  const uploadPhoto = useUploadCarPhoto();

  const [hydrated, setHydrated] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  // Foto escolhida aguardando recorte (abre o ImageCropper).
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [engine, setEngine] = useState("");
  const [power, setPower] = useState("");
  const [mileage, setMileage] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!car || hydrated) return;
    setName(car.version ?? "");
    setEngine(car.engine ?? "");
    setPower(car.power != null ? String(car.power) : "");
    setMileage(car.mileage != null ? String(car.mileage) : "");
    setDescription(car.description ?? "");
    setCategory(car.category);
    setStatus(car.status);
    setHydrated(true);
  }, [car, hydrated]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setPendingUri(result.assets[0].uri);
  };

  const submit = () => {
    if (!car || !name.trim()) return;
    setError(null);
    updateCar.mutate(
      {
        id: car.id,
        patch: {
          version: name.trim(),
          engine: engine.trim() || null,
          power: power.trim() ? Number(power) : null,
          mileage: mileage.trim() ? Number(mileage) : null,
          description: description.trim() || null,
          category,
          status,
        },
      },
      {
        onSuccess: () => {
          if (photoUri) {
            uploadPhoto.mutate(
              { carId: car.id, localUri: photoUri },
              { onSettled: () => router.back() }
            );
          } else {
            router.back();
          }
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!car) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader
          title="EDITAR CARRO"
          left={
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <ArrowLeft size={22} color={colors.onSurface} />
            </Pressable>
          }
        />
        <EmptyState title="Carro não encontrado" description="Ele pode ter sido removido da garagem." />
      </View>
    );
  }

  const catalogName = carCatalogName(car);
  const saving = updateCar.isPending || uploadPhoto.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title="EDITAR CARRO"
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
        {catalogName && (
          <View className="border border-border bg-card px-4 py-3 mb-6">
            <Text
              className="text-on-surface-variant mb-1"
              style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }}
            >
              CATÁLOGO
            </Text>
            <Text className="text-on-surface" style={{ fontSize: 13 }}>
              {catalogName}
            </Text>
            <Text className="text-muted mt-0.5" style={{ fontSize: 12 }}>
              A ligação com o catálogo não muda por aqui — só o que aparece abaixo.
            </Text>
          </View>
        )}

        <Text
          className="text-on-surface-variant mb-2"
          style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
        >
          FOTOGRAFIA PRINCIPAL
        </Text>
        <Pressable
          onPress={pickPhoto}
          className="border border-dashed border-outline-variant items-center justify-center mb-5"
          style={{ aspectRatio: CAR_ASPECT, overflow: "hidden" }}
        >
          {photoUri || car.photoUrl ? (
            <Image
              source={{ uri: photoUri ?? car.photoUrl! }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <>
              <Camera size={26} color={colors.onSurface} />
              <Text className="text-on-surface mt-2" style={{ fontSize: 13, fontWeight: "600" }}>
                Upload
              </Text>
            </>
          )}
        </Pressable>

        <FormField
          label="Nome na garagem"
          placeholder="Ex: Porsche 718 Boxster"
          value={name}
          onChangeText={setName}
          hint="É assim que o carro aparece na sua garagem e nos posts."
        />
        <FormField label="Motor" placeholder="Ex: 4.0 Flat-6" value={engine} onChangeText={setEngine} />
        <FormField
          label="Potência (cv)"
          placeholder="Ex: 510"
          value={power}
          onChangeText={setPower}
          keyboardType="numeric"
        />
        <FormField
          label="Quilometragem (km)"
          placeholder="Ex: 15000"
          value={mileage}
          onChangeText={setMileage}
          keyboardType="numeric"
        />
        <FormField
          label="Descrição"
          placeholder="Detalhes adicionais, modificações ou história do veículo..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text
          className="text-on-surface-variant mb-2"
          style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
        >
          STATUS DO PROJETO
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {STATUSES.map((s) => (
            <CategoryChip
              key={s}
              label={statusMeta[s].label}
              active={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </ScrollView>

        <Text
          className="text-on-surface-variant mb-2"
          style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}
        >
          CATEGORIA
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c}
              label={categoryLabel(c)}
              active={category === c}
              onPress={() => setCategory(category === c ? null : c)}
            />
          ))}
        </ScrollView>

        {error && (
          <Text className="text-error mb-4" style={{ fontSize: 13 }}>
            {error}
          </Text>
        )}

        <View className="mt-2">
          <PrimaryButton
            label="Salvar alterações"
            onPress={submit}
            loading={saving}
            disabled={!name.trim()}
          />
        </View>
      </ScrollView>

      <ImageCropper
        uri={pendingUri}
        aspect={CAR_ASPECT}
        onCancel={() => setPendingUri(null)}
        onDone={(cropped) => {
          setPhotoUri(cropped);
          setPendingUri(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
