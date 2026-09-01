import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { apiService } from "@/services/apiService";
import { carTitle } from "@/utils/car";
import { colors } from "@/constants/theme";
import type { Car } from "@/types";

/**
 * Buscar o carro de outra pessoa pra marcar numa foto.
 *
 * Existe porque quem mais fotografa em encontro é justamente quem não é dono
 * do carro. A marcação fica pendente até o dono aceitar — a tela avisa isso
 * antes, pra ninguém esperar a foto aparecer na página do carro na hora.
 */
export function CarTagSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (car: Car) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => apiService.search(debounced),
    enabled: visible && debounced.length >= 2,
  });

  const cars = useMemo(() => data?.cars ?? [], [data]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Marcar carro">
      <View className="px-5 pt-1" style={{ gap: 12 }}>
        <Text className="text-muted" style={{ fontSize: 12, lineHeight: 17 }}>
          Busque por marca, modelo ou pelo nome que o dono deu. A marcação fica
          esperando o dono aceitar — sua foto é publicada normalmente.
        </Text>

        <View
          className="flex-row items-center gap-2 px-3"
          style={{ backgroundColor: colors.inputSurface }}
        >
          <Search size={16} color={colors.inputPlaceholder} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ex: Civic, Golf GTI, S14..."
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            style={{ flex: 1, color: colors.onInputSurface, paddingVertical: 12, fontSize: 15 }}
          />
          {isFetching && <ActivityIndicator size="small" color={colors.inputPlaceholder} />}
        </View>
      </View>

      <View style={{ maxHeight: 320 }}>
        <FlatList
          data={cars}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              className="flex-row items-center gap-3 px-5 py-3 active:opacity-60"
            >
              <View
                style={{ width: 52, height: 40, backgroundColor: colors.surfaceContainer }}
                className="overflow-hidden"
              >
                {item.photoUrl && (
                  <Image
                    source={{ uri: item.photoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {carTitle(item)}
                </Text>
                {item.owner && (
                  <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
                    de @{item.owner.username}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-muted text-center px-5 py-8" style={{ fontSize: 13 }}>
              {debounced.length < 2
                ? "Digite ao menos duas letras."
                : isFetching
                ? "Buscando..."
                : `Nenhum carro encontrado para "${debounced}".`}
            </Text>
          }
        />
      </View>
    </BottomSheet>
  );
}
