/**
 * Onboarding de quem curte mas ainda não tem carro: seguir garagens.
 *
 * O feed é de quem a pessoa segue (mais os encontros e carros sugeridos);
 * sem seguir ninguém ele abre quase vazio. Aqui ela já sai seguindo quem
 * tem carro. Pulável, como os outros passos depois do @.
 */
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { Cartao } from "@/components/QuemSeguir";
import { apiService } from "@/services/apiService";
import { colors, typography } from "@/constants/theme";

export default function SeguirGaragensScreen() {
  const { data: sugestoes, isPending } = useQuery({
    queryKey: ["sugestoes", "onboarding"],
    queryFn: () => apiService.getSugestoes(12),
  });
  const irProFeed = () => router.replace("/(tabs)");

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <AppHeader
        title="SIGA GARAGENS"
        right={
          <Pressable hitSlop={8} onPress={irProFeed}>
            <Text className="text-on-surface-variant" style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
              PULAR
            </Text>
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40, maxWidth: 680, width: "100%", alignSelf: "center" }}
      >
        <Text className="text-on-surface" style={[typography.headlineSm, { marginBottom: 6 }]}>
          Acompanhe os builds da galera
        </Text>
        <Text className="text-on-surface-variant mb-6" style={{ fontSize: 14, lineHeight: 20 }}>
          Quem você seguir aparece no seu feed: carro novo, mod, foto de encontro.
        </Text>

        {isPending ? (
          <View className="py-10 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : sugestoes && sugestoes.length > 0 ? (
          <View className="flex-row flex-wrap" style={{ rowGap: 10 }}>
            {sugestoes.map((s) => (
              <Cartao key={s.id} sugestao={s} />
            ))}
          </View>
        ) : (
          <Text className="text-muted" style={{ fontSize: 13 }}>
            Ainda não tem ninguém pra sugerir. Dá uma olhada no Explorar depois.
          </Text>
        )}

        <View className="mt-8">
          <PrimaryButton label="Ir pro feed" onPress={irProFeed} />
        </View>
      </ScrollView>
    </View>
  );
}
