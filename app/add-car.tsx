import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, ChevronRight, Plus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageCropper } from "@/components/ImageCropper";
import { Image } from "expo-image";
import { colors, typography } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { CategoryChip } from "@/components/ui/Chips";
import { categoryLabel } from "@/utils/labels";
import { FormField } from "@/components/ui/FormField";
import { apiService } from "@/services/apiService";
import { useAddCar, useUploadCarPhoto } from "@/stores/garageStore";
import { suggestCarName } from "@/utils/car";
import type { Category, VehicleBrand, VehicleModel, VehicleVersion } from "@/types";

// Espelha carCategoryEnum do backend.
const CATEGORIES: Category[] = ["JDM", "Euro", "Muscle", "Performance", "Clássicos", "Stance", "Other"];

type Stage = "brand" | "model" | "version" | "details";

function PickerRow({ label, sublabel, onPress }: { label: string; sublabel?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 px-4 border-b border-border active:bg-white/5"
    >
      <View className="flex-1">
        <Text className="text-on-surface" style={{ fontSize: 15 }}>
          {label}
        </Text>
        {sublabel && (
          <Text className="text-on-surface-variant mt-0.5" style={{ fontSize: 12 }}>
            {sublabel}
          </Text>
        )}
      </View>
      <ChevronRight size={16} color={colors.outline} />
    </Pressable>
  );
}

// Mesma proporcao em que a foto aparece nesta tela.
const CAR_ASPECT = 4 / 3;

export default function AddCarScreen() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";
  const addCar = useAddCar();
  const uploadPhoto = useUploadCarPhoto();

  const [stage, setStage] = useState<Stage>("brand");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<VehicleBrand | null>(null);
  const [model, setModel] = useState<VehicleModel | null>(null);
  const [version, setVersion] = useState<VehicleVersion | null>(null);
  const [skippedCatalog, setSkippedCatalog] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  // Foto escolhida aguardando recorte (abre o ImageCropper).
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [versionText, setVersionText] = useState("");
  const [engine, setEngine] = useState("");
  const [mileage, setMileage] = useState("");
  const [power, setPower] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | null>(null);

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ["vehicle-brands"],
    queryFn: apiService.getVehicleBrands,
  });
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["vehicle-models", brand?.id],
    queryFn: () => apiService.getVehicleModelsByBrand(brand!.id),
    enabled: !!brand,
  });
  const { data: years, isLoading: yearsLoading } = useQuery({
    queryKey: ["vehicle-years", model?.id],
    queryFn: () => apiService.getVehicleYearsByModel(model!.id),
    enabled: !!model,
  });

  const filteredBrands = useMemo(
    () => (brands ?? []).filter((b) => b.name.toLowerCase().includes(search.toLowerCase())),
    [brands, search]
  );
  const filteredModels = useMemo(
    () => (models ?? []).filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
    [models, search]
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) setPendingUri(result.assets[0].uri);
  };

  const goToDetails = (v: VehicleVersion) => {
    setVersion(v);
    // Sugestão curta ("Porsche 718 Boxster"), não o nome cru do catálogo —
    // a FIPE devolve modelo com motor/potência ("718 Boxster 2.0 300cv") e
    // versão como "2024 Gasolina", nenhum dos dois bom como nome de garagem.
    // O campo fica editável no próximo passo.
    if (brand && model) setVersionText(suggestCarName(brand.name, model.name));
    setStage("details");
  };

  const skipCatalog = () => {
    setSkippedCatalog(true);
    setBrand(null);
    setModel(null);
    setVersion(null);
    setStage("details");
  };

  const goBack = () => {
    if (stage === "details") {
      if (skippedCatalog) {
        setSkippedCatalog(false);
        setStage("brand");
      } else {
        setStage("version");
      }
      return;
    }
    if (stage === "version") {
      setStage("model");
      setSearch("");
      return;
    }
    if (stage === "model") {
      setModel(null);
      setStage("brand");
      setSearch("");
      return;
    }
    // No onboarding não existe tela anterior pra voltar (viemos de um
    // replace), então "voltar" no primeiro passo equivale a pular.
    if (isOnboarding) router.replace("/(tabs)");
    else router.back();
  };

  const isValid = skippedCatalog ? versionText.trim().length > 0 : !!version;

  const submit = () => {
    if (!isValid) return;
    addCar.mutate(
      {
        vehicleVersionId: version?.id ?? null,
        version: versionText.trim() || null,
        engine: engine.trim() || null,
        power: power.trim() ? Number(power) : null,
        mileage: mileage.trim() ? Number(mileage) : null,
        description: description.trim() || null,
        category,
      },
      {
        onSuccess: (newCar) => {
          // No onboarding emenda no projeto do carro (passo seguinte, também
          // pulável); fora dele, abre o carro recém-criado, que é o que o
          // usuário espera ver.
          const next = isOnboarding
            ? `/edit-project/${newCar.id}?onboarding=1`
            : `/car/${newCar.id}`;
          if (photoUri) {
            uploadPhoto.mutate(
              { carId: newCar.id, localUri: photoUri },
              { onSettled: () => router.replace(next as never) }
            );
          } else {
            router.replace(next as never);
          }
        },
      }
    );
  };

  const headerTitle =
    stage === "brand"
      ? "Marca"
      : stage === "model"
      ? brand?.name ?? "Modelo"
      : stage === "version"
      ? model?.name ?? "Versão"
      : "Detalhes do carro";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader
        title={(isOnboarding && stage === "brand" ? "Seu primeiro carro" : headerTitle).toUpperCase()}
        left={
          <Pressable hitSlop={8} onPress={goBack}>
            <ArrowLeft size={22} color={colors.onSurface} />
          </Pressable>
        }
        right={
          isOnboarding ? (
            <Pressable hitSlop={8} onPress={() => router.replace("/(tabs)")}>
              <Text
                className="text-on-surface-variant"
                style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}
              >
                PULAR
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {stage === "brand" && (
        <View className="flex-1">
          <View className="px-4 pt-4 pb-2">
            <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar marca..." />
          </View>
          {brandsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredBrands}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <PickerRow
                  label={item.name}
                  onPress={() => {
                    setBrand(item);
                    setSearch("");
                    setStage("model");
                  }}
                />
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
          <View className="px-4 py-4 border-t border-border">
            <Pressable onPress={skipCatalog} hitSlop={8}>
              <Text className="text-primary text-center" style={{ fontSize: 13, fontWeight: "600" }}>
                Não encontrei minha marca — continuar sem catálogo
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {stage === "model" && (
        <View className="flex-1">
          <View className="px-4 pt-4 pb-2">
            <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar modelo..." />
          </View>
          {modelsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredModels}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <PickerRow
                  label={item.name}
                  onPress={() => {
                    setModel(item);
                    setSearch("");
                    setStage("version");
                  }}
                />
              )}
              ListEmptyComponent={
                <Text className="text-on-surface-variant text-center py-8" style={{ fontSize: 13 }}>
                  Nenhum modelo encontrado pra essa marca.
                </Text>
              }
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      )}

      {stage === "version" && (
        <View className="flex-1">
          {yearsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={years ?? []}
              keyExtractor={(v) => v.id}
              renderItem={({ item }) => (
                <PickerRow label={item.name} sublabel={String(item.year)} onPress={() => goToDetails(item)} />
              )}
              ListEmptyComponent={
                <Text className="text-on-surface-variant text-center py-8" style={{ fontSize: 13 }}>
                  Nenhuma versão encontrada pra esse modelo.
                </Text>
              }
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            />
          )}
        </View>
      )}

      {stage === "details" && (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {skippedCatalog ? (
            <Text className="text-on-surface-variant mb-6" style={typography.bodyMd}>
              Descreva seu veículo — ele não está linkado ao catálogo FIPE.
            </Text>
          ) : (
            <View className="border border-border bg-card px-4 py-3 mb-6">
              <Text
                className="text-on-surface-variant mb-1"
                style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }}
              >
                SELECIONADO NO CATÁLOGO
              </Text>
              <Text className="text-on-surface" style={{ fontSize: 13 }}>
                {brand?.name} {model?.name}
              </Text>
              <Text className="text-muted mt-0.5" style={{ fontSize: 12 }}>
                {version?.name}
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
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
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
            value={versionText}
            onChangeText={setVersionText}
            hint="É assim que o carro aparece na sua garagem e nos posts. Encurte como preferir."
          />
          <FormField label="Motor" placeholder="Ex: 4.0 Flat-6" value={engine} onChangeText={setEngine} />
          <FormField
            label="Quilometragem (km)"
            placeholder="Ex: 15000"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
          />
          <FormField
            label="Potência (cv)"
            placeholder="Ex: 510"
            value={power}
            onChangeText={setPower}
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
            CATEGORIA
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {CATEGORIES.map((c) => (
              <CategoryChip key={c} label={categoryLabel(c)} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
            ))}
          </ScrollView>

          <View className="mt-4">
            <PrimaryButton
              label="Adicionar à garagem"
              onPress={submit}
              loading={addCar.isPending || uploadPhoto.isPending}
              disabled={!isValid}
              icon={<Plus size={15} color={colors.onPrimaryContainer} />}
            />
          </View>
        </ScrollView>
      )}

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
