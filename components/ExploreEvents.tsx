import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pedirLocalizacao } from "@/utils/localizacao";
import { CalendarPlus, Crosshair, List, Map as MapIcon } from "lucide-react-native";
import { SearchBar } from "@/components/ui/SearchBar";
import { CategoryChip } from "@/components/ui/Chips";
import { EventCard } from "@/components/cards/EventCard";
import { EventsMap } from "@/components/EventsMap";
import { EventPreviewCard } from "@/components/EventPreviewCard";
import { EmptyState } from "@/components/ui/States";
import { ExploreSegment, type ExploreTab } from "@/components/ExploreSegment";
import { useEvents } from "@/stores/eventsStore";
import { colors, spacing, typography } from "@/constants/theme";

/**
 * Raios oferecidos. 150 km é o padrão porque essa turma viaja para um
 * encontro bom — um raio curto esconderia justamente os rolês que valem a
 * viagem.
 */
const RADII = [50, 150, 300] as const;
const DEFAULT_RADIUS = 150;

export function ExploreEvents({
  tab,
  onTabChange,
  view,
  onViewChange,
}: {
  tab: ExploreTab;
  onTabChange: (tab: ExploreTab) => void;
  /** Vem de fora porque a tela de Explorar esconde o próprio cabeçalho
   * quando o mapa está aberto — ela precisa saber em que modo estamos. */
  view: "list" | "map";
  onViewChange: (view: "list" | "map") => void;
}) {
  const setView = onViewChange;
  const insets = useSafeAreaInsets();

  /**
   * Recuo do topo no mapa. Não dá pra confiar só no `insets.top`: em vários
   * Android ele volta 0 (a barra de status não é reportada como inset), e os
   * controles subiam por cima do relógio e da bateria. Pega o maior entre o
   * inset, a altura real da barra de status e um piso de segurança.
   */
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
    24
  );
  const [city, setCity] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  const [past, setPast] = useState(false);

  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCity(city.trim()), 350);
    return () => clearTimeout(timer);
  }, [city]);

  // Sem localização, nada de raio: mostra tudo. Filtrar por um centro que
  // não existe esconderia eventos sem motivo.
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents({
      city: debouncedCity || undefined,
      past,
      lat: center?.latitude,
      lng: center?.longitude,
      radiusKm: center ? radiusKm : undefined,
    });

  const events = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // Rolê selecionado no mapa. Guarda o id, não o objeto: assim o card
  // acompanha uma atualização da lista (ex.: alguém confirmou presença) em
  // vez de exibir um retrato velho.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  );

  const locate = async () => {
    setGpsError(null);
    setLocating(true);
    try {
      const posicao = await pedirLocalizacao();
      if (posicao === "negada") {
        setGpsError("Permissão negada — sem ela não dá pra filtrar por distância.");
        return;
      }
      setCenter(posicao);
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      setGpsError(`Não consegui pegar sua localização (${motivo}).`);
    } finally {
      setLocating(false);
    }
  };

  const header = (
    <View className="mb-2">
      <Text
        className="text-on-surface mb-4"
        style={[typography.displayLg, { marginTop: spacing.md }]}
      >
        Explorar
      </Text>

      <ExploreSegment value={tab} onChange={onTabChange} />

      <View className="flex-row items-center gap-2 mb-3">
        <View className="flex-1">
          <SearchBar value={city} onChangeText={setCity} placeholder="Filtrar por cidade..." />
        </View>
        <Pressable
          onPress={() => setView(view === "list" ? "map" : "list")}
          className="border border-outline items-center justify-center active:bg-white/5"
          style={{ width: 46, height: 46 }}
        >
          {view === "list" ? (
            <MapIcon size={18} color={colors.onSurface} />
          ) : (
            <List size={18} color={colors.onSurface} />
          )}
        </Pressable>
      </View>

      <View className="flex-row mb-3">
        <CategoryChip label="Próximos" active={!past} onPress={() => setPast(false)} />
        <CategoryChip label="Já rolaram" active={past} onPress={() => setPast(true)} />
      </View>

      {/* Distância: só faz sentido depois de saber de onde. */}
      {center ? (
        <View className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-on-surface-variant" style={{ fontSize: 11, letterSpacing: 1 }}>
              ATÉ
            </Text>
            <Pressable onPress={() => setCenter(null)} hitSlop={8}>
              <Text className="text-muted" style={{ fontSize: 12 }}>
                ver todos
              </Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {RADII.map((r) => (
              <CategoryChip
                key={r}
                label={`${r} km`}
                active={radiusKm === r}
                onPress={() => setRadiusKm(r)}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <Pressable
          onPress={locate}
          disabled={locating}
          className="flex-row items-center justify-center gap-2 border border-outline py-3 mb-3 active:bg-white/5"
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.onSurface} />
          ) : (
            <>
              <Crosshair size={15} color={colors.onSurface} />
              <Text
                className="text-on-surface"
                style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
              >
                ROLÊS PERTO DE MIM
              </Text>
            </>
          )}
        </Pressable>
      )}

      {gpsError && (
        <Text className="text-error mb-3" style={{ fontSize: 12 }}>
          {gpsError}
        </Text>
      )}

      <Pressable
        onPress={() => router.push("/add-event")}
        className="flex-row items-center justify-center gap-2 border border-outline py-3.5 mb-5 active:bg-white/5"
      >
        <CalendarPlus size={15} color={colors.onSurface} />
        <Text
          className="text-on-surface"
          style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.5 }}
        >
          CRIAR EVENTO
        </Text>
      </Pressable>

      {isLoading && (
        <View className="py-8 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );

  if (view === "map") {
    const semCoordenada = events.length - events.filter((e) => e.latitude != null).length;

    /**
     * No mapa o cabeçalho vira sobreposição flutuante, e não uma faixa que
     * empurra o mapa pra baixo: mapa espremido não serve pra nada, e os
     * controles ocupam pouco espaço quando estão por cima.
     */
    return (
      <View style={{ flex: 1 }}>
        <EventsMap
          events={events}
          center={center}
          radiusKm={center ? radiusKm : null}
          // Barra de status + linha de busca (46) + chips (~34) + folgas.
          controlsTop={topInset + 100}
          onSelect={setSelectedId}
        />

        {/* Controles flutuando sobre o mapa */}
        <View
          style={{
            position: "absolute",
            // O mapa corre por baixo da barra de status (fica bonito), entao
            // os controles precisam descer o recorte do aparelho.
            top: topInset + spacing.sm,
            left: spacing.marginMobile,
            right: spacing.marginMobile,
            gap: 8,
          }}
          pointerEvents="box-none"
        >
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SearchBar value={city} onChangeText={setCity} placeholder="Cidade..." />
            </View>
            <Pressable
              onPress={() => setView("list")}
              className="items-center justify-center border border-outline"
              style={{ width: 46, height: 46, backgroundColor: colors.surface }}
            >
              <List size={18} color={colors.onSurface} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {center ? (
              <>
                {RADII.map((r) => (
                  <CategoryChip
                    key={r}
                    label={`${r} km`}
                    active={radiusKm === r}
                    onPress={() => setRadiusKm(r)}
                  />
                ))}
                <CategoryChip label="Todos" onPress={() => setCenter(null)} />
              </>
            ) : (
              <CategoryChip
                label={locating ? "Localizando..." : "Perto de mim"}
                onPress={locate}
              />
            )}
            <CategoryChip
              label={past ? "Já rolaram" : "Próximos"}
              active
              onPress={() => setPast(!past)}
            />
          </ScrollView>
        </View>

        {/* Prévia do rolê selecionado. Fica acima do rodapé e do botão de
            criar, que é onde o polegar já está. */}
        {selected && (
          <View
            style={{
              position: "absolute",
              left: spacing.marginMobile,
              right: spacing.marginMobile,
              bottom: (semCoordenada > 0 ? 34 : 0) + spacing.md,
            }}
          >
            <EventPreviewCard
              event={selected}
              onOpen={() => router.push(`/event/${selected.id}`)}
              onClose={() => setSelectedId(null)}
            />
          </View>
        )}

        {/* Criar evento vira botão flutuante: ocupa um canto em vez de uma
            faixa inteira. Some com o card aberto pra não competir com ele. */}
        {!selected && (
          <Pressable
            onPress={() => router.push("/add-event")}
            className="absolute items-center justify-center active:opacity-80"
            style={{
              right: spacing.marginMobile,
              bottom: semCoordenada > 0 ? 54 : spacing.md,
              width: 52,
              height: 52,
              backgroundColor: colors.primaryContainer,
            }}
          >
            <CalendarPlus size={22} color={colors.onPrimaryContainer} />
          </Pressable>
        )}

        {isLoading && (
          <View
            className="absolute items-center justify-center"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          >
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* Evento sem coordenada não tem como aparecer no mapa — melhor dizer
            do que sumir com ele em silêncio. */}
        {semCoordenada > 0 && (
          <Text
            className="text-muted text-center py-2 absolute"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              fontSize: 11,
              backgroundColor: colors.surfaceLow,
            }}
          >
            {semCoordenada} {semCoordenada === 1 ? "rolê sem local no mapa" : "rolês sem local no mapa"} — veja na lista
          </Text>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventCard event={item} />}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{
        paddingHorizontal: spacing.marginMobile,
        paddingBottom: spacing.lg,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-6">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        !isLoading ? (
          <EmptyState
            title={past ? "Nenhum rolê passado" : "Nenhum rolê marcado"}
            description={
              center
                ? `Nada num raio de ${radiusKm} km. Tente aumentar a distância.`
                : debouncedCity
                ? `Nada encontrado em "${debouncedCity}".`
                : past
                ? "Os encontros que já aconteceram aparecem aqui."
                : "Seja o primeiro a marcar um encontro."
            }
          />
        ) : null
      }
    />
  );
}
