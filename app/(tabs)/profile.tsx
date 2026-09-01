import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Alert } from "@/utils/alert";
import { Share } from "@/utils/share";
import { Image } from "expo-image";
import { Bookmark, LogOut, Share2 } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StatCard } from "@/components/ui/Chips";
import { PostGrid } from "@/components/PostGrid";
import { SecondaryButton } from "@/components/ui/Button";
import { useMyGarage } from "@/stores/garageStore";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/stores/authStore";
import { FollowListSheet, type FollowTab } from "@/components/FollowListSheet";
import { ProfileEvents } from "@/components/ProfileEvents";
import { carTitle } from "@/utils/car";
import { abrirLegal } from "@/utils/legal";
import { colors, spacing, typography } from "@/constants/theme";
import { router } from "expo-router";

const SCREEN_PAD = spacing.marginMobile;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { data: me, isLoading: meLoading, isError: meError } = useCurrentUser();
  const { data: myCars } = useMyGarage();
  const logout = useAuthStore((s) => s.logout);
  const [followSheet, setFollowSheet] = useState<FollowTab | null>(null);

  const confirmLogout = () => {
    Alert.alert("Sair da conta", "Você precisará entrar novamente para acessar o app.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  };
  const { data: postsPage } = useQuery({
    // page/limit fazem parte da key: outras telas buscam esse mesmo endpoint
    // com limites diferentes (ex.: o checklist da Home pede só 1 post), e sem
    // isso as duas queries se sobrescreveriam no cache.
    queryKey: ["posts-by-username", me?.username, 1, 30],
    queryFn: () => apiService.getPostsByUsername(me!.username, 1, 30),
    enabled: !!me?.username,
  });
  const myPosts = postsPage?.data ?? [];
  const cars = myCars ?? [];

  // Texto, e não link: o app ainda não tem endereço público, e um deep link
  // downpipe:// não abre nada pra quem não tem o app.
  const shareProfile = async () => {
    if (!me) return;
    const garagem = cars.length > 0 ? cars.map((car) => carTitle(car)).join(", ") : null;
    const linhas = [
      `@${me.username} no Downpipe`,
      me.bio,
      garagem ? `Garagem: ${garagem}` : null,
    ].filter(Boolean);

    try {
      await Share.share({ message: linhas.join("\n") });
    } catch {
      // Cancelar o menu de compartilhamento não é erro.
    }
  };


  // Sessão local válida mas o perfil não carrega (ex.: usuário apagado
  // direto no Supabase) — sem isso, a tela ficava presa num spinner pra
  // sempre, sem nenhum jeito de sair e logar com outra conta.
  if (meError) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Text className="text-on-surface-variant text-center mb-6" style={{ fontSize: 14 }}>
          Não foi possível carregar seu perfil. Sua conta pode ter sido removida.
        </Text>
        <SecondaryButton
          label="Sair da conta"
          icon={<LogOut size={14} color={colors.onSurface} />}
          onPress={() => logout()}
          fullWidth={false}
        />
      </View>
    );
  }

  if (meLoading || !me) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        left={
          // Era um ícone de menu sem onPress — não abria nada. Virou a
          // entrada dos salvos, que precisava de um lugar pra morar.
          <Pressable hitSlop={8} onPress={() => router.push("/saved")}>
            <Bookmark size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        }
        right={
          <Pressable hitSlop={8} onPress={confirmLogout}>
            <LogOut size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-4 mt-2">
          <UserAvatar
            uri={me.avatarUrl ?? ""}
            size={96}
            ringColor={colors.primaryContainer}
          />
          <Text className="text-on-surface mt-4" style={typography.headlineSm}>
            @{me.username}
          </Text>
          <Text className="text-on-surface-variant mt-1" style={typography.bodyMd}>
            Gearhead desde {me.gearheadSince ?? "—"}
          </Text>

          <View className="flex-row gap-3 mt-5">
            <View className="flex-1">
              <SecondaryButton label="Editar perfil" onPress={() => router.push("/edit-profile")} />
            </View>
            <View className="flex-1">
              <SecondaryButton
                label="Compartilhar"
                icon={<Share2 size={14} color={colors.onSurface} />}
                onPress={shareProfile}
              />
            </View>
          </View>

          <View className="flex-row border-t border-b border-border mt-6 py-1">
            <StatCard label="Carros" value={String(cars.length)} />
            <StatCard label="Projetos" value={String(me.projectsCount)} />
            {/* Rolês em que já esteve: histórico, não intenção. */}
            <StatCard label="Rolês" value={String(me.eventsAttendedCount ?? 0)} />
            {/* "Seguindo" existia só no perfil dos outros — no meu, o número
                que eu mais quero conferir não aparecia. */}
            <StatCard
              label="Seguidores"
              value={String(me.followersCount)}
              onPress={() => setFollowSheet("followers")}
            />
            <StatCard
              label="Seguindo"
              value={String(me.followingCount)}
              onPress={() => setFollowSheet("following")}
            />
          </View>
        </View>

        {/* Sem carro, a garagem some inteira em vez de anunciar um vazio.
            Nem todo mundo aqui tem carro — tem quem venha pelas fotos e pelos
            rolês —, e quando adicionar um, a seção aparece sozinha. */}
        <View className="mt-7">
          {cars.length === 0 ? (
            <Text className="text-on-surface-variant px-4" style={{ fontSize: 13 }}>
              Sua garagem está vazia. Adicione um carro quando quiser — dá pra
              usar o app só pelas fotos e pelos rolês.
            </Text>
          ) : (
            <>
              <Text className="text-on-surface px-4 mb-3" style={typography.labelCaps}>
                Minha garagem
              </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // O padding tem de ficar no conteúdo, não no ScrollView, senão o
              // último cartão encosta na borda da tela e parece cortado.
              contentContainerStyle={{
                paddingHorizontal: SCREEN_PAD,
                gap: 12,
              }}
            >
              {cars.map((car) => (
                <Pressable
                  key={car.id}
                  onPress={() => router.push(`/car/${car.id}`)}
                  className="border border-border bg-card overflow-hidden active:opacity-90"
                  style={{ width: 220 }}
                >
                  <View style={{ height: 150 }}>
                    {car.photoUrl && (
                      <Image
                        source={{ uri: car.photoUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    )}
                  </View>
                  <View className="p-3">
                    <Text
                      className="text-on-surface"
                      style={{ fontSize: 14, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {carTitle(car)}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          backgroundColor: colors.primary,
                        }}
                      />
                      <Text
                        className="text-on-surface-variant"
                        style={{ fontSize: 11 }}
                        numberOfLines={1}
                      >
                        Estágio:{" "}
                        {car.status === "building"
                          ? "Motor"
                          : car.status === "planning"
                          ? "Planejamento"
                          : "Concluído"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            </>
          )}
        </View>

        <ProfileEvents username={me.username} isOrganizer={!!me.isOrganizer} isMe />

        <View className="mt-8 px-4">
          <Text className="text-on-surface mb-3" style={typography.labelCaps}>
            Conta
          </Text>
          <Pressable
            onPress={() => router.push("/bloqueados")}
            className="flex-row items-center justify-between border-t border-border py-3.5"
          >
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              Pessoas bloqueadas
            </Text>
            <Text className="text-muted" style={{ fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => abrirLegal("privacidade")}
            className="flex-row items-center justify-between border-t border-border py-3.5"
          >
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              Política de privacidade
            </Text>
            <Text className="text-muted" style={{ fontSize: 18 }}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => abrirLegal("termos")}
            className="flex-row items-center justify-between border-t border-b border-border py-3.5"
          >
            <Text className="text-on-surface" style={{ fontSize: 14 }}>
              Termos de uso
            </Text>
            <Text className="text-muted" style={{ fontSize: 18 }}>›</Text>
          </Pressable>
        </View>

        <View className="mt-8 px-4">
          <Text className="text-on-surface mb-3" style={typography.labelCaps}>
            Publicações
          </Text>
        </View>
        {myPosts.length === 0 ? (
          <Text className="text-on-surface-variant px-4" style={{ fontSize: 13 }}>
            Nenhuma publicação ainda.
          </Text>
        ) : (
          // Grade simples com flex-wrap: uma FlatList aqui ficaria aninhada
          // dentro do ScrollView da tela, o que a virtualização não suporta.
          <PostGrid posts={myPosts} width={width} username={me.username} />
        )}
      </ScrollView>

      <FollowListSheet
        userId={me.id}
        tab={followSheet ?? "followers"}
        onTabChange={setFollowSheet}
        visible={followSheet !== null}
        onClose={() => setFollowSheet(null)}
      />
    </View>
  );
}
