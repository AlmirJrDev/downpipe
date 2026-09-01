import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiService } from "@/services/apiService";
import { AppHeader } from "@/components/AppHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { CategoryChip } from "@/components/ui/Chips";
import { ExploreSegment, type ExploreTab } from "@/components/ExploreSegment";
import { ExploreEvents } from "@/components/ExploreEvents";
import { categoryLabel } from "@/utils/labels";
import { CarCard } from "@/components/cards/CarCard";
import { CardSkeleton } from "@/components/ui/States";
import { EmptyState } from "@/components/ui/States";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { colors, spacing, typography } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Category } from "@/types";

// Espelha carCategoryEnum do backend — "Off-road"/"Daily"/"Projetos" não
// existem lá, "Other" sim.
const CATEGORIES: Category[] = ["JDM", "Euro", "Muscle", "Performance", "Clássicos", "Stance", "Other"];

export default function ExploreScreen() {
  const { data: me } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [tab, setTab] = useState<ExploreTab>("cars");
  // O modo de visualização dos rolês vive aqui porque o cabeçalho some no
  // mapa — ele é só logo e avatar, decoração enquanto se lê um mapa.
  const [eventsView, setEventsView] = useState<"list" | "map">("list");

  // Espera a digitação parar antes de chamar a API — sem isso seria uma
  // requisição por tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching = debouncedQuery.length > 0;

  // Sem busca: lista paginada normal, filtrada por categoria no servidor.
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["explore-cars", activeCategory],
    queryFn: ({ pageParam }) =>
      apiService.getExploreCars(pageParam, 20, activeCategory ? { category: activeCategory } : undefined),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: !isSearching,
  });

  // Com busca: /search cobre marca e modelo do catálogo, nome dado pelo dono,
  // descrição, motor — e também pessoas. Antes isso era um filtro em memória
  // que só olhava o nome do carro e só entre os já carregados.
  const { data: results, isFetching: searching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => apiService.search(debouncedQuery),
    enabled: isSearching,
  });

  const pagedCars = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const cars = isSearching ? results?.cars ?? [] : pagedCars;
  const people = isSearching ? results?.users ?? [] : [];

  const loading = isSearching ? searching && !results : isLoading;

  return (
    <View className="flex-1 bg-surface">
      {/* No mapa o cabeçalho some: ali ele é só logo e avatar, e cada pixel
          conta pra enxergar os rolês. */}
      {!(tab === "events" && eventsView === "map") && (
        <AppHeader
          right={
            <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/profile")}>
              <UserAvatar uri={me?.avatarUrl ?? ""} size={28} />
            </Pressable>
          }
        />
      )}

      {tab === "events" ? (
        <ExploreEvents
          tab={tab}
          onTabChange={setTab}
          view={eventsView}
          onViewChange={setEventsView}
        />
      ) : (
      <FlatList
        data={cars}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CarCard car={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.marginMobile,
          paddingBottom: spacing.lg,
        }}
        onEndReached={() => {
          // Resultado de busca não é paginado no backend (limite fixo por
          // categoria), então só a listagem normal carrega mais.
          if (!isSearching && hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View className="mb-2">
            <Text
              className="text-on-surface mb-4"
              style={[typography.displayLg, { marginTop: spacing.md }]}
            >
              Explorar
            </Text>

            <ExploreSegment value={tab} onChange={setTab} />

            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por marca, modelo, carro ou pessoa..."
            />

            {/* Categorias só fazem sentido na listagem: a busca já é livre
                e vem pronta do servidor. */}
            {!isSearching && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 mt-4">
                {CATEGORIES.map((c) => (
                  <CategoryChip
                    key={c}
                    label={categoryLabel(c)}
                    active={activeCategory === c}
                    onPress={() => setActiveCategory(activeCategory === c ? null : c)}
                  />
                ))}
              </ScrollView>
            )}

            {isSearching && people.length > 0 && (
              <View className="mt-5 mb-5">
                <Text className="text-on-surface mb-3" style={typography.labelCaps}>
                  Pessoas
                </Text>
                {people.map((p) => (
                  <Pressable
                    key={p.username}
                    onPress={() => router.push(`/user/${p.username}`)}
                    className="flex-row items-center gap-3 py-2.5 active:opacity-70"
                  >
                    <UserAvatar uri={p.avatarUrl ?? ""} size={38} />
                    <View className="flex-1">
                      <Text className="text-on-surface" style={{ fontSize: 14, fontWeight: "600" }}>
                        @{p.username}
                      </Text>
                      <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
                        {p.displayName}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {isSearching && cars.length > 0 && (
              <Text className="text-on-surface mb-3 mt-1" style={typography.labelCaps}>
                Carros
              </Text>
            )}

            {loading && (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && people.length === 0 ? (
            <EmptyState
              title="Nada por aqui"
              description={
                isSearching
                  ? `Nenhum resultado para "${debouncedQuery}".`
                  : "Tente ajustar os filtros selecionados."
              }
            />
          ) : null
        }
      />
      )}
    </View>
  );
}
