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
import { Alert } from "@/utils/alert";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Trash2, Wrench } from "lucide-react-native";
import { colors } from "@/constants/theme";
import { MOD_ICONS } from "@/constants/modIcons";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { useMyGarage } from "@/stores/garageStore";
import {
  useModsByCar,
  useAddModification,
  useUpdateModification,
  useRemoveModification,
} from "@/stores/projectStore";
import { carTitle } from "@/utils/car";
import { categoryLabel } from "@/utils/labels";
import { ApiError } from "@/services/api";
import type { ModificationCategory } from "@/types";

// Espelha modificationCategoryEnum do backend.
const CATEGORIES: ModificationCategory[] = [
  "Performance",
  "Suspensão",
  "Estética",
  "Eletrônica",
  "Motor",
  "Freios",
  "Interior",
  "Escape",
  "Rodas",
  "Other",
];

/** O backend fala YYYY-MM-DD; a tela fala DD/MM/AAAA. */
function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function displayToIso(display: string): string | null {
  const match = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  // Rejeita 31/02: o Date reinterpreta a data e cai em outro dia, então
  // comparar a volta é o que pega o caso.
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) || parsed.getDate() !== Number(day) ? null : iso;
}

const todayDisplay = () => isoToDisplay(new Date().toISOString().slice(0, 10));

export default function AddModificationScreen() {
  const { data: myCars } = useMyGarage();
  const addModification = useAddModification();
  const updateModification = useUpdateModification();
  const removeModification = useRemoveModification();

  // carId vem na rota quando a tela é aberta a partir de um carro/projeto
  // específico. Sem isso o formulário caía no primeiro carro da garagem, e
  // quem tinha mais de um carro via a modificação ir parar no carro errado.
  // modId presente = edição da modificação existente.
  const { carId: carIdParam, modId } = useLocalSearchParams<{ carId?: string; modId?: string }>();
  const isEditing = !!modId;

  const [carId, setCarId] = useState<string | undefined>(carIdParam);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ModificationCategory>(CATEGORIES[0]);
  const [cost, setCost] = useState("");
  const [icon, setIcon] = useState(MOD_ICONS[0].value);
  const [date, setDate] = useState(todayDisplay());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cars = myCars ?? [];
  const selectedCarId = carId ?? cars[0]?.id;

  // Não existe GET /modifications/:id — a modificação a editar vem da lista
  // do carro, que a tela do carro já tem em cache.
  const { data: mods, isPending: modsPending } = useModsByCar(isEditing ? carIdParam ?? "" : "");
  const editingMod = isEditing ? mods?.find((m) => m.id === modId) : undefined;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Preenche uma vez só: um refetch no meio da digitação não pode
    // sobrescrever o que o usuário já mudou.
    if (!editingMod || hydrated) return;
    setName(editingMod.name);
    if (editingMod.category) setCategory(editingMod.category);
    setCost(editingMod.cost != null ? String(editingMod.cost) : "");
    setIcon(editingMod.icon || MOD_ICONS[0].value);
    setDate(isoToDisplay(editingMod.date));
    setDescription(editingMod.description ?? "");
    setHydrated(true);
  }, [editingMod, hydrated]);

  const dateIso = date.trim() ? displayToIso(date) : null;
  const dateInvalid = !!date.trim() && dateIso === null;
  const isValid = !!selectedCarId && !!name.trim() && !!cost.trim() && !dateInvalid;

  const onError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : "Não foi possível salvar. Tente novamente.");

  const submit = () => {
    if (!isValid || !selectedCarId) return;
    setError(null);

    const fields = {
      name: name.trim(),
      category,
      cost: Number(cost) || 0,
      date: dateIso,
      icon,
      description: description.trim() || null,
    };

    if (isEditing && modId) {
      updateModification.mutate(
        { id: modId, carId: selectedCarId, patch: fields },
        { onSuccess: () => router.back(), onError }
      );
      return;
    }

    addModification.mutate(
      { carId: selectedCarId, input: fields },
      { onSuccess: () => router.replace(`/car/${selectedCarId}`), onError }
    );
  };

  const confirmDelete = () => {
    if (!modId || !selectedCarId) return;
    Alert.alert(
      "Excluir modificação",
      `Remover "${name.trim() || "esta modificação"}" do carro? Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            removeModification.mutate(
              { id: modId, carId: selectedCarId },
              { onSuccess: () => router.back(), onError }
            ),
        },
      ]
    );
  };

  const header = (
    <AppHeader
      title={isEditing ? "Editar modificação" : "Nova modificação"}
      left={
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );

  // Em edição a lista do carro precisa chegar antes de preencher o
  // formulário — sem isso a tela abriria com os campos vazios.
  if (isEditing && !editingMod) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {header}
        {modsPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-on-surface-variant text-center">
              Modificação não encontrada. Ela pode ter sido removida.
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {header}

      {cars.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-on-surface-variant text-center">
            Adicione um carro à sua garagem antes de registrar modificações.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Em edição o carro não aparece: o backend não aceita mover uma
              modificação de carro, então oferecer a escolha seria mentira. */}
          {!isEditing && (
            <>
              <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
                CARRO
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                {cars.map((car) => (
                  <Pressable
                    key={car.id}
                    onPress={() => setCarId(car.id)}
                    className={`mr-2 px-4 py-2.5 border ${selectedCarId === car.id ? "bg-primary-container border-primary-container" : "border-outline-variant"}`}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600" }} className={selectedCarId === car.id ? "text-on-primary-container" : "text-on-surface-variant"}>
                      {carTitle(car)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            NOME DA MODIFICAÇÃO
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Coilover"
            placeholderTextColor={colors.inputPlaceholder}
            className="mb-5"
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            CATEGORIA
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={`mr-2 px-4 py-2.5 border ${category === c ? "bg-primary-container border-primary-container" : "border-outline-variant"}`}
              >
                <Text style={{ fontSize: 13, fontWeight: "600" }} className={category === c ? "text-on-primary-container" : "text-on-surface-variant"}>
                  {categoryLabel(c)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            ÍCONE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {MOD_ICONS.map((option) => {
              const active = icon === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setIcon(option.value)}
                  className={`mr-2 px-3 py-2.5 border items-center ${active ? "bg-primary-container border-primary-container" : "border-outline-variant"}`}
                  style={{ minWidth: 72 }}
                >
                  <option.Icon size={18} color={active ? colors.onPrimaryContainer : colors.primary} />
                  <Text
                    style={{ fontSize: 11, fontWeight: "600", marginTop: 4 }}
                    className={active ? "text-on-primary-container" : "text-on-surface-variant"}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            CUSTO (R$)
          </Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            placeholder="Ex: 3200"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="numeric"
            className="mb-5"
            style={{ backgroundColor: colors.inputSurface, color: colors.onInputSurface, padding: 14, fontSize: 15 }}
          />

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            DATA
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="numbers-and-punctuation"
            className={dateInvalid ? "mb-1" : "mb-5"}
            style={{
              backgroundColor: colors.inputSurface,
              color: colors.onInputSurface,
              padding: 14,
              fontSize: 15,
              borderWidth: dateInvalid ? 1 : 0,
              borderColor: colors.error,
            }}
          />
          {dateInvalid && (
            <Text className="text-error mb-5" style={{ fontSize: 12 }}>
              Data inválida. Use o formato DD/MM/AAAA.
            </Text>
          )}

          <Text className="text-on-surface-variant mb-2" style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            DESCRIÇÃO (OPCIONAL)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Marca, peça, detalhes da instalação..."
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            className="mb-8"
            style={{
              backgroundColor: colors.inputSurface,
              color: colors.onInputSurface,
              padding: 14,
              fontSize: 15,
              minHeight: 90,
              textAlignVertical: "top",
            }}
          />

          {error && (
            <Text className="text-error mb-4" style={{ fontSize: 13 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label={isEditing ? "Salvar alterações" : "Registrar modificação"}
            onPress={submit}
            loading={addModification.isPending || updateModification.isPending}
            disabled={!isValid}
            icon={<Wrench size={15} color={colors.onPrimaryContainer} />}
          />

          {isEditing && (
            <Pressable
              onPress={confirmDelete}
              disabled={removeModification.isPending}
              className="flex-row items-center justify-center gap-2 py-4 mt-2 active:opacity-60"
            >
              {removeModification.isPending ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Trash2 size={15} color={colors.error} />
                  <Text
                    style={{
                      color: colors.error,
                      fontSize: 13,
                      fontWeight: "600",
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                    }}
                  >
                    Excluir modificação
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
