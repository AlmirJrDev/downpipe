import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Alert } from "@/utils/alert";
import { router } from "expo-router";
import { Car as CarIcon, MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react-native";
import { useMyGarage, useRemoveCar } from "@/stores/garageStore";
import { AppHeader } from "@/components/AppHeader";
import { GarageCard } from "@/components/cards/GarageCard";
import { EmptyState } from "@/components/ui/States";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SecondaryButton } from "@/components/ui/Button";
import { carTitle } from "@/utils/car";
import { colors, spacing, typography } from "@/constants/theme";
import { useLarguraDoConteudo, useModoDesktop } from "@/hooks/useDesktop";
import { useLarguraAmpla } from "@/hooks/useLarguraAmpla";
import type { Car } from "@/types";

export default function GarageScreen() {
  const { data: cars, isLoading } = useMyGarage();
  const removeCar = useRemoveCar();
  const [actionCar, setActionCar] = useState<Car | null>(null);
  // No computador a garagem abre a coluna e os carros viram grade: um card
  // só, estreito no meio do monitor, deixava a tela vazia dos dois lados.
  const desktop = useModoDesktop();
  useLarguraAmpla();
  const largura = useLarguraDoConteudo();
  const colunas = !desktop ? 1 : largura >= 900 ? 3 : 2;

  const confirmDelete = () => {
    if (!actionCar) return;
    const car = actionCar;
    setActionCar(null);
    Alert.alert(
      "Excluir carro",
      `Remover ${carTitle(car)} da garagem? Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => removeCar.mutate(car.id) },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!cars || cars.length === 0) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader />
        <View style={{ paddingHorizontal: spacing.marginMobile, paddingVertical: spacing.md }}>
          <Text className="text-on-surface" style={typography.displayLg}>
            Minha Garagem
          </Text>
        </View>
        <EmptyState
          icon={<CarIcon size={36} color={colors.outline} />}
          title="Garagem Vazia"
          description="Você ainda não adicionou nenhum carro."
          actionLabel="+ Adicionar meu primeiro carro"
          onAction={() => router.push("/add-car")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <AppHeader />
      <FlatList
        key={`colunas-${colunas}`}
        data={cars}
        keyExtractor={(c) => c.id}
        numColumns={colunas}
        columnWrapperStyle={colunas > 1 ? { gap: 16 } : undefined}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingBottom: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={colunas > 1 ? { width: Math.floor((largura - spacing.marginMobile * 2 - 16 * (colunas - 1)) / colunas) } : undefined}>
            <Pressable onLongPress={() => setActionCar(item)}>
              <GarageCard car={item} />
            </Pressable>
            {/* Editar e excluir só existiam segurando o dedo no card — com
                mouse ninguém descobre, e no celular também não é óbvio. */}
            <Pressable
              onPress={() => setActionCar(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Opções de ${carTitle(item)}`}
              className="absolute items-center justify-center"
              style={{ top: 12, left: 12, width: 34, height: 34, backgroundColor: colors.overlayMedium }}
            >
              <MoreHorizontal size={18} color={colors.onSurface} />
            </Pressable>
          </View>
        )}
        ListHeaderComponent={
          <View
            className="flex-row items-end justify-between mb-5"
            style={{ marginTop: spacing.md }}
          >
            <Text className="text-on-surface" style={typography.displayLg}>
              Minha Garagem
            </Text>
            <Text
              className="text-on-surface-variant"
              style={[typography.labelCaps, { paddingBottom: spacing.xs }]}
            >
              {cars.length} {cars.length === 1 ? "carro" : "carros"}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => router.push("/add-car")}
            className="border border-dashed border-outline-variant items-center justify-center py-8 flex-row gap-2"
          >
            <Plus size={16} color={colors.onSurface} />
            <Text className="text-on-surface" style={{ fontSize: 13, fontWeight: "600", letterSpacing: 1 }}>
              ADICIONAR CARRO
            </Text>
          </Pressable>
        }
      />

      <BottomSheet
        visible={!!actionCar}
        onClose={() => setActionCar(null)}
        title={actionCar ? carTitle(actionCar) : undefined}
      >
        <View className="px-5 pt-2" style={{ gap: 12 }}>
          <SecondaryButton
            label="Editar carro"
            icon={<Pencil size={14} color={colors.onSurface} />}
            onPress={() => {
              if (!actionCar) return;
              const id = actionCar.id;
              setActionCar(null);
              router.push(`/edit-car/${id}`);
            }}
          />
          <Pressable
            onPress={confirmDelete}
            className="border border-error items-center justify-center flex-row py-3.5 gap-2"
          >
            <Trash2 size={14} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: 13, fontWeight: "700", letterSpacing: 1.5 }}>
              EXCLUIR CARRO
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
